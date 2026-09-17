import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { UserProfile } from "@/lib/models/UserProfile";

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

  const body = await request.json();
  const { displayName, avatarUrl, favoriteCategoryIds, priceRange, notificationPrefs } = body as {
    displayName?: string;
    avatarUrl?: string;
    favoriteCategoryIds?: string[];
    priceRange?: { min: number; max: number };
    notificationPrefs?: Record<string, boolean>;
  };

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
