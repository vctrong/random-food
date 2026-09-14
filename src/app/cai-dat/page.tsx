import packageJson from "../../../package.json";
import { getAllFoods } from "@/services/foodService";
import { SettingsPageContent } from "@/components/settings/SettingsPageContent";

export default function SettingsPage() {
  const allFoods = getAllFoods();

  return (
    <SettingsPageContent
      allFoods={allFoods}
      totalFoodsCount={allFoods.length}
      appVersion={packageJson.version}
    />
  );
}
