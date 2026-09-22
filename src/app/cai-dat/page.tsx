import { getServerSession } from "next-auth";
import packageJson from "../../../package.json";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { UserProfile } from "@/lib/models/UserProfile";
import { FoodReviewerApplication } from "@/lib/models/FoodReviewerApplication";
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

  let notificationPrefs: Record<string, boolean> | null = null;
  let hasAppliedReviewer = false;

  if (session?.user) {
    await connectDB();
    const userId = (session.user as { id: string }).id;
    const [profile, application] = await Promise.all([
      UserProfile.findOne({ userId }).lean() as Promise<{
        notificationPrefs?: Record<string, boolean>;
      } | null>,
      FoodReviewerApplication.findOne({ userId }).select("_id").lean(),
    ]);

    notificationPrefs = { ...DEFAULT_NOTIFICATION_PREFS, ...(profile?.notificationPrefs ?? {}) };
    hasAppliedReviewer = Boolean(application);
  }

  return (
    <SettingsPageContent
      allFoods={allFoods}
      totalFoodsCount={allFoods.length}
      appVersion={packageJson.version}
      isAuthenticated={Boolean(session?.user)}
      notificationPrefs={notificationPrefs}
      hasAppliedReviewer={hasAppliedReviewer}
    />
  );
}
