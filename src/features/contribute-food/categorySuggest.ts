import { FALLBACK_CATEGORY_SLUG, VEGETARIAN_CATEGORY_SLUG } from "@/constants/categoryGroups";
import { normalizeVietnamese, similarity } from "@/lib/vietnameseText";

/**
 * Gợi ý danh mục cho form đóng góp món — hàm thuần, không fetch.
 * Danh mục ghép kiểu "Chè / Tráng miệng" được tách thành nhiều bí danh
 * ("che", "trang mieng") để tên món khớp được bất kỳ phần nào.
 */

export interface SuggestableCategory {
  id: string;
  name: string;
  slug: string;
  foodCount: number;
}

export function categoryAliases(name: string): string[] {
  return name
    .split(/[/,&]|\bvà\b/i)
    .map(normalizeVietnamese)
    .filter(Boolean);
}

/** Cụm `alias` xuất hiện trọn vẹn theo ranh giới từ trong `normalizedText`. */
function containsPhrase(normalizedText: string, alias: string): boolean {
  return ` ${normalizedText} `.includes(` ${alias} `);
}

/**
 * Danh mục khớp với tên món (có thể nhiều cái cùng lúc: "Cơm chay thập cẩm" →
 * Cơm + Chay). Sắp theo vị trí xuất hiện trong tên. Bỏ danh mục hệ thống "Khác".
 */
export function suggestCategoriesFromName<T extends SuggestableCategory>(foodName: string, categories: T[]): T[] {
  const normalizedName = normalizeVietnamese(foodName);
  if (!normalizedName) return [];

  const hits: { category: T; position: number }[] = [];
  for (const category of categories) {
    if (category.slug === FALLBACK_CATEGORY_SLUG) continue;
    const positions = categoryAliases(category.name)
      .filter((alias) => containsPhrase(normalizedName, alias))
      .map((alias) => ` ${normalizedName} `.indexOf(` ${alias} `));
    if (positions.length > 0) hits.push({ category, position: Math.min(...positions) });
  }
  return hits.sort((a, b) => a.position - b.position).map((hit) => hit.category);
}

/**
 * Chip hiển thị ngoài form: danh mục gợi ý từ tên món lên đầu, còn lại là danh
 * mục phổ biến nhất theo `foodCount`. Không lặp, không gồm "Khác", tối đa `limit`.
 */
export function buildVisibleCategoryChips<T extends SuggestableCategory>(
  categories: T[],
  foodName: string,
  limit: number,
): { category: T; suggested: boolean }[] {
  const suggested = suggestCategoriesFromName(foodName, categories);
  const suggestedIds = new Set(suggested.map((category) => category.id));
  const popular = categories
    .filter((category) => category.slug !== FALLBACK_CATEGORY_SLUG && !suggestedIds.has(category.id))
    .sort((a, b) => b.foodCount - a.foodCount || a.name.localeCompare(b.name, "vi"));

  return [
    ...suggested.map((category) => ({ category, suggested: true })),
    ...popular.map((category) => ({ category, suggested: false })),
  ].slice(0, limit);
}

export type ProposalHint<T> =
  | { kind: "combo"; categories: T[] }
  | { kind: "did_you_mean"; category: T }
  | { kind: "none" };

const DID_YOU_MEAN_THRESHOLD = 0.7;

/**
 * Gợi ý khi user gõ tên danh mục muốn đề xuất:
 * - "Cơm chay" → chọn kết hợp Cơm + Chay (tên ghép phủ ≥ 2 danh mục có sẵn).
 * - "Bun" / "Búnn" → "Có phải ý bạn là Bún?" (khớp bí danh hoặc gần giống).
 */
export function getProposalHint<T extends SuggestableCategory>(proposedName: string, categories: T[]): ProposalHint<T> {
  const normalized = normalizeVietnamese(proposedName);
  if (normalized.length < 2) return { kind: "none" };

  const matched = suggestCategoriesFromName(proposedName, categories);
  if (matched.length >= 2) {
    // "Chay" luôn đứng sau loại món cho câu gợi ý tự nhiên: "Cơm + Chay".
    const ordered = [...matched].sort(
      (a, b) => Number(a.slug === VEGETARIAN_CATEGORY_SLUG) - Number(b.slug === VEGETARIAN_CATEGORY_SLUG),
    );
    return { kind: "combo", categories: ordered };
  }

  let best: { category: T; score: number } | null = null;
  for (const category of categories) {
    if (category.slug === FALLBACK_CATEGORY_SLUG) continue;
    const score = Math.max(
      similarity(normalized, category.name),
      ...categoryAliases(category.name).map((alias) => similarity(normalized, alias)),
    );
    if (!best || score > best.score) best = { category, score };
  }
  if (best && best.score >= DID_YOU_MEAN_THRESHOLD) return { kind: "did_you_mean", category: best.category };
  return { kind: "none" };
}
