import { getServerSession } from "next-auth";
import packageJson from "../../../package.json";
import { authOptions } from "@/lib/auth";
import { getNotificationPreferences } from "@/lib/notifications/preferences";
import { getAllFoods } from "@/services/foodService";
import { SettingsPageContent } from "@/components/settings/SettingsPageContent";

export default async function SettingsPage() {
  const allFoods = await getAllFoods();
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  const userId = user?.id;

  const emailPrefs = userId ? (await getNotificationPreferences(userId)).email : null;

  return (
    <SettingsPageContent
      allFoods={allFoods}
      totalFoodsCount={allFoods.length}
      appVersion={packageJson.version}
      isAuthenticated={Boolean(session?.user)}
      emailPrefs={emailPrefs}
      role={user?.role ?? "user"}
    />
  );
}
