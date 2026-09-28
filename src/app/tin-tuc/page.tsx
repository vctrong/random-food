import Image from "next/image";
import Link from "next/link";
import { Megaphone, Newspaper } from "lucide-react";
import { getPublishedArticles } from "@/services/articleService";
import { listPublicAnnouncements } from "@/lib/announcements";
import { getViewer } from "@/lib/viewerRole";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { AnnouncementCard } from "@/components/announcements/AnnouncementCard";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type NewsFilter = "tat-ca" | "tin-tuc" | "thong-bao";

const FILTERS: { id: NewsFilter; label: string }[] = [
  { id: "tat-ca", label: "Tất cả" },
  { id: "tin-tuc", label: "Tin tức ẩm thực" },
  { id: "thong-bao", label: "Thông báo chính thức" },
];

export default async function NewsPage({ searchParams }: PageProps<"/tin-tuc">) {
  const { loai } = await searchParams;
  const filter: NewsFilter = FILTERS.some((item) => item.id === loai) ? (loai as NewsFilter) : "tat-ca";
  const viewer = await getViewer();

  const [announcements, articles] = await Promise.all([
    filter === "tin-tuc" ? Promise.resolve([]) : listPublicAnnouncements(viewer.role),
    filter === "thong-bao" ? Promise.resolve([]) : getPublishedArticles(),
  ]);
  const isEmpty = announcements.length === 0 && articles.length === 0;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-10">
      <div className="mb-6 pb-6 border-b border-border">
        <div className="flex items-center gap-1.5 text-primary text-xs font-bold uppercase tracking-wider mb-2">
          <Newspaper className="size-4" aria-hidden />
          <span>Tin tức ẩm thực</span>
        </div>
        <h1 className="text-display-sm text-text-primary">Chuyện ăn uống Cần Thơ</h1>
        <p className="text-text-secondary mt-1">
          Những bài viết vui, thông tin ẩm thực đáng chú ý và thông báo chính thức từ NayAnGi.
        </p>
      </div>

      <nav aria-label="Lọc tin tức" className="mb-8 flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <Link
            key={item.id}
            href={item.id === "tat-ca" ? "/tin-tuc" : `/tin-tuc?loai=${item.id}`}
            aria-current={filter === item.id ? "page" : undefined}
            scroll={false}
            className={cn(
              "inline-flex h-10 items-center rounded-full border px-4 text-sm font-semibold transition-colors",
              filter === item.id
                ? "border-primary-strong bg-primary-strong text-white"
                : "border-border bg-surface text-text-secondary hover:border-primary-line hover:text-text-primary",
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {isEmpty ? (
        <EmptyState
          icon={filter === "thong-bao" ? Megaphone : Newspaper}
          title={filter === "thong-bao" ? "Chưa có thông báo nào" : "Chưa có bài viết nào"}
          description="Nội dung sẽ sớm được cập nhật tại đây."
        />
      ) : (
        <div className="flex flex-col gap-10">
          {announcements.length > 0 && (
            <section aria-labelledby="official-announcements">
              <h2 id="official-announcements" className="mb-4 flex items-center gap-2 text-h3 text-text-primary">
                <Megaphone className="size-5 text-accent-ink" aria-hidden />
                Thông báo chính thức
              </h2>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {announcements.map((announcement) => (
                  <AnnouncementCard key={announcement.id} announcement={announcement} />
                ))}
              </div>
            </section>
          )}

          {articles.length > 0 && (
            <section aria-labelledby="food-articles">
              {filter === "tat-ca" && announcements.length > 0 && (
                <h2 id="food-articles" className="mb-4 flex items-center gap-2 text-h3 text-text-primary">
                  <Newspaper className="size-5 text-primary" aria-hidden />
                  Tin tức ẩm thực
                </h2>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {articles.map((article) => (
                  <Card key={article.id} hoverable className="overflow-hidden">
                    {article.coverImage && (
                      <div className="relative w-full h-44">
                        <Image
                          src={article.coverImage}
                          alt={article.title}
                          fill
                          sizes="(min-width: 640px) 50vw, 100vw"
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="p-5">
                      <h3 className="font-heading font-semibold text-lg text-text-primary mb-1.5">{article.title}</h3>
                      <p className="text-sm text-text-secondary leading-relaxed">{article.excerpt}</p>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
