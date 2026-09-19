import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { UserProfile } from "@/lib/models/UserProfile";
import { isAllowedImageHost } from "@/lib/utils";
import { isValidObjectId } from "mongoose";

const NOTIFICATION_PREF_KEYS = [
  "food_approved",
  "food_rejected",
  "food_needs_revision",
  "report_handled",
  "reviewer_application_result",
  "system",
  "login_success",
  "login_failed",
  "account_banned",
  "account_unbanned",
  "password_changed",
] as const;

const notificationPrefsSchema = z
  .object(Object.fromEntries(NOTIFICATION_PREF_KEYS.map((key) => [key, z.boolean().optional()])))
  .strict();

const putSchema = z
  .object({
    displayName: z.string().trim().min(1).max(80).optional(),
    avatarUrl: z
      .string()
      .url()
      .max(2048)
      .refine((value) => isAllowedImageHost(value))
      .optional(),
    favoriteCategoryIds: z
      .array(z.string().refine((value) => isValidObjectId(value)))
      .max(50)
      .optional(),
    priceRange: z
      .object({ min: z.number().min(0), max: z.number().min(0) })
      .refine((value) => value.max >= value.min)
      .optional(),
    notificationPrefs: notificationPrefsSchema.optional(),
  })
  .strict();

interface UserProfileLean {
  displayName?: string;
  avatarUrl?: string;
  preferences?: {
    favoriteCategoryIds?: unknown[];
    priceRange?: { min: number; max: number };
  };
  notificationPrefs?: Record<string, boolean>;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  await connectDB();
  const userId = (session.user as { id: string }).id;
  const profile = (await UserProfile.findOne({ userId }).lean()) as UserProfileLean | null;

  if (!profile) {
    return NextResponse.json({
      displayName: session.user.name ?? null,
      avatarUrl: session.user.image ?? null,
      preferences: { favoriteCategoryIds: [], priceRange: null },
      notificationPrefs: {},
    });
  }

  return NextResponse.json({
    displayName: profile.displayName ?? null,
    avatarUrl: profile.avatarUrl ?? null,
    preferences: {
      favoriteCategoryIds: (profile.preferences?.favoriteCategoryIds ?? []).map(String),
      priceRange: profile.preferences?.priceRange ?? null,
    },
    notificationPrefs: profile.notificationPrefs ?? {},
  });
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu cập nhật không hợp lệ." }, { status: 400 });
  }
  const { displayName, avatarUrl, favoriteCategoryIds, priceRange, notificationPrefs } = parsed.data;

  await connectDB();
  const userId = (session.user as { id: string }).id;

  const notificationPrefsSet = notificationPrefs
    ? Object.fromEntries(
        Object.entries(notificationPrefs).map(([type, value]) => [
          `notificationPrefs.${type}`,
          value,
        ]),
      )
    : {};

  await UserProfile.updateOne(
    { userId },
    {
      $set: {
        ...(displayName !== undefined && { displayName }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(favoriteCategoryIds !== undefined && {
          "preferences.favoriteCategoryIds": favoriteCategoryIds,
        }),
        ...(priceRange !== undefined && { "preferences.priceRange": priceRange }),
        ...notificationPrefsSet,
        updatedAt: new Date(),
      },
    },
    { upsert: true },
  );

  return NextResponse.json({ success: true });
}
