import type { Metadata } from "next";
import { getLandingStats } from "@/lib/landing";
import { AboutHero } from "@/components/about/AboutHero";
import { OpenLetter } from "@/components/about/OpenLetter";
import { OriginStory } from "@/components/about/OriginStory";
import { CoreValues } from "@/components/about/CoreValues";
import { AboutStatsBand } from "@/components/about/AboutStatsBand";
import { TeamGrid } from "@/components/about/TeamGrid";
import { AboutCta } from "@/components/about/AboutCta";

export const metadata: Metadata = {
  title: "Về chúng tôi",
};

/** Số liệu thật từ DB — làm mới tối đa mỗi 10 phút thay vì đóng băng ở lúc build. */
export const revalidate = 600;

export default async function AboutPage() {
  const stats = await getLandingStats();

  return (
    <div className="w-full overflow-x-clip">
      <AboutHero restaurantCount={stats.restaurantCount} />
      <OpenLetter />
      <OriginStory />
      <CoreValues />
      <AboutStatsBand {...stats} />
      <TeamGrid />
      <AboutCta />
    </div>
  );
}
