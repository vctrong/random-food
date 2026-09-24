import Image from "next/image";
import { Newspaper } from "lucide-react";
import { getPublishedArticles } from "@/services/articleService";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const articles = await getPublishedArticles();

  return (
    <div className="w-full max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-10">
      <div className="mb-8 pb-6 border-b border-border">
        <div className="flex items-center gap-1.5 text-primary text-xs font-bold uppercase tracking-wider mb-2">
          <Newspaper className="size-4" aria-hidden />
          <span>Tin tức ẩm thực</span>
        </div>
        <h1 className="text-display-sm text-text-primary">Chuyện ăn uống Cần Thơ</h1>
        <p className="text-text-secondary mt-1">
          Những bài viết vui, thông tin ẩm thực đáng chú ý quanh Cần Thơ.
        </p>
      </div>

      {articles.length === 0 ? (
        <EmptyState
          icon={Newspaper}
          title="Chưa có bài viết nào"
          description="Nội dung tin tức sẽ sớm được cập nhật tại đây."
        />
      ) : (
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
                <h2 className="font-heading font-semibold text-lg text-text-primary mb-1.5">
                  {article.title}
                </h2>
                <p className="text-sm text-text-secondary leading-relaxed">{article.excerpt}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
