export interface ArticleSummary {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string | null;
  publishedAt: string;
}

/**
 * Gọi qua API route `/api/articles` thay vì đọc DB trực tiếp — đúng nguyên tắc
 * "services/ gọi API route" ở mục 1 CLAUDE.md.
 */
export async function getPublishedArticles(): Promise<ArticleSummary[]> {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  try {
    const response = await fetch(`${baseUrl}/api/articles`, { cache: "no-store" });
    if (!response.ok) return [];
    return (await response.json()) as ArticleSummary[];
  } catch {
    return [];
  }
}
