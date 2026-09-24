import type { Metadata } from "next";
import { getLandingStats } from "@/lib/landing";
import { AboutHero } from "@/components/about/AboutHero";
import { OpenLetter } from "@/components/about/OpenLetter";
import { OriginStory } from "@/components/about/OriginStory";
import { CoreValues } from "@/components/about/CoreValues";
import { AboutStatsBand } from "@/components/about/AboutStatsBand";
import { TeamGrid } from "@/components/about/TeamGrid";
import { AboutCta } from "@/components/about/AboutCta";

const ABOUT_DESCRIPTION =
  "Câu chuyện đằng sau NayAnGi — web app random món ăn Cần Thơ: vì sao tụi mình làm, những giá trị tụi mình giữ và đội ngũ đứng sau.";

export const metadata: Metadata = {
  title: "Về chúng tôi",
  description: ABOUT_DESCRIPTION,
  alternates: { canonical: "/ve-chung-toi" },
  openGraph: { title: "Về chúng tôi | NayAnGi", description: ABOUT_DESCRIPTION, url: "/ve-chung-toi", siteName: "NayAnGi", locale: "vi_VN", type: "website" },
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
