import { getServerSession } from "next-auth";
import packageJson from "../../../package.json";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { UserProfile } from "@/lib/models/UserProfile";
import { getAllFoods } from "@/services/foodService";
import { SettingsPageContent } from "@/components/settings/SettingsPageContent";

const DEFAULT_NOTIFICATION_PREFS: Record<string, boolean> = {
  food_approved: true,
  food_rejected: true,
  food_needs_revision: true,
  report_handled: true,
  reviewer_application_result: true,
  system: true,
  login_success: false,
  login_failed: true,
  account_banned: true,
  account_unbanned: true,
  password_changed: true,
};

export default async function SettingsPage() {
  const allFoods = await getAllFoods();
  const session = await getServerSession(authOptions);

  let account: {
    email: string;
    authProvider: "local" | "google";
    notificationPrefs: Record<string, boolean>;
  } | null = null;

  if (session?.user) {
    await connectDB();
    const userId = (session.user as { id: string }).id;
    const [user, profile] = await Promise.all([
      User.findById(userId).lean() as Promise<{
        email: string;
        authProvider?: "local" | "google";
      } | null>,
      UserProfile.findOne({ userId }).lean() as Promise<{
        notificationPrefs?: Record<string, boolean>;
      } | null>,
    ]);

    if (user) {
      account = {
        email: user.email,
        authProvider: user.authProvider ?? "local",
        notificationPrefs: { ...DEFAULT_NOTIFICATION_PREFS, ...(profile?.notificationPrefs ?? {}) },
      };
    }
  }

  return (
    <SettingsPageContent
      allFoods={allFoods}
      totalFoodsCount={allFoods.length}
      appVersion={packageJson.version}
      isAuthenticated={Boolean(session?.user)}
      account={account}
    />
  );
}
