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

const SPICE_PREFERENCE_VALUES = ["khong-cay", "cay-nhe", "cay-vua", "sieu-cay"] as const;
const THEME_VALUES = ["light", "dark", "system"] as const;

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
    // max để trống = không giới hạn trên ("Tất cả mức giá"). null xoá hẳn priceRange đã lưu.
    priceRange: z
      .object({ min: z.number().min(0), max: z.number().min(0).optional() })
      .refine((value) => value.max === undefined || value.max >= value.min)
      .nullable()
      .optional(),
    favoriteFoodNames: z.array(z.string().trim().min(1).max(60)).max(30).optional(),
    dislikedIngredients: z.array(z.string().trim().min(1).max(60)).max(30).optional(),
    spicePreference: z.enum(SPICE_PREFERENCE_VALUES).nullable().optional(),
    vegetarianMode: z.boolean().optional(),
    allowRepeatWithin24h: z.boolean().optional(),
    theme: z.enum(THEME_VALUES).optional(),
    notificationPrefs: notificationPrefsSchema.optional(),
  })
  .strict();

interface UserProfileLean {
  displayName?: string;
  avatarUrl?: string;
  preferences?: {
    favoriteCategoryIds?: unknown[];
    priceRange?: { min: number; max?: number };
    favoriteFoodNames?: string[];
    dislikedIngredients?: string[];
    spicePreference?: string;
    vegetarianMode?: boolean;
    allowRepeatWithin24h?: boolean;
  };
  theme?: string;
  notificationPrefs?: Record<string, boolean>;
}

const DEFAULT_PREFERENCES = {
  favoriteCategoryIds: [] as string[],
  priceRange: null as { min: number; max?: number } | null,
  favoriteFoodNames: [] as string[],
  dislikedIngredients: [] as string[],
  spicePreference: null as string | null,
  vegetarianMode: false,
  allowRepeatWithin24h: true,
};

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
      preferences: DEFAULT_PREFERENCES,
      theme: null,
      notificationPrefs: {},
    });
  }

  return NextResponse.json({
    displayName: profile.displayName ?? null,
    avatarUrl: profile.avatarUrl ?? null,
    preferences: {
      favoriteCategoryIds: (profile.preferences?.favoriteCategoryIds ?? []).map(String),
      priceRange: profile.preferences?.priceRange ?? null,
      favoriteFoodNames: profile.preferences?.favoriteFoodNames ?? [],
      dislikedIngredients: profile.preferences?.dislikedIngredients ?? [],
      spicePreference: profile.preferences?.spicePreference ?? null,
      vegetarianMode: profile.preferences?.vegetarianMode ?? false,
      allowRepeatWithin24h: profile.preferences?.allowRepeatWithin24h ?? true,
    },
    theme: profile.theme ?? null,
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
  const {
    displayName,
    avatarUrl,
    favoriteCategoryIds,
    priceRange,
    favoriteFoodNames,
    dislikedIngredients,
    spicePreference,
    vegetarianMode,
    allowRepeatWithin24h,
    theme,
    notificationPrefs,
  } = parsed.data;

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

  // priceRange/spicePreference: null nghĩa là user bấm "Tất cả mức giá"/bỏ chọn độ
  // cay — $unset để xoá hẳn field thay vì lưu null (tránh lẫn với "chưa từng chọn").
  const setFields: Record<string, unknown> = {
    ...(displayName !== undefined && { displayName }),
    ...(avatarUrl !== undefined && { avatarUrl }),
    ...(favoriteCategoryIds !== undefined && { "preferences.favoriteCategoryIds": favoriteCategoryIds }),
    ...(favoriteFoodNames !== undefined && { "preferences.favoriteFoodNames": favoriteFoodNames }),
    ...(dislikedIngredients !== undefined && { "preferences.dislikedIngredients": dislikedIngredients }),
    ...(vegetarianMode !== undefined && { "preferences.vegetarianMode": vegetarianMode }),
    ...(allowRepeatWithin24h !== undefined && { "preferences.allowRepeatWithin24h": allowRepeatWithin24h }),
    ...(theme !== undefined && { theme }),
    ...notificationPrefsSet,
    updatedAt: new Date(),
  };
  const unsetFields: Record<string, ""> = {};

  if (priceRange === null) unsetFields["preferences.priceRange"] = "";
  else if (priceRange !== undefined) setFields["preferences.priceRange"] = priceRange;

  if (spicePreference === null) unsetFields["preferences.spicePreference"] = "";
  else if (spicePreference !== undefined) setFields["preferences.spicePreference"] = spicePreference;

  await UserProfile.updateOne(
    { userId },
    {
      $set: setFields,
      ...(Object.keys(unsetFields).length > 0 && { $unset: unsetFields }),
    },
    { upsert: true },
  );

  return NextResponse.json({ success: true });
}
