/**
 * Bố cục bộ ảnh (node TipTap `gallery`) — DÙNG CHUNG cho HTML render ở server
 * (lib/announcementGallery.ts) và khung xem trước trong modal "Bộ ảnh" của Admin,
 * để xem trước đúng y như khi đăng. Hàm thuần, chỉ trả class Tailwind + thông số.
 */

export interface GalleryImage {
  src: string;
  alt: string | null;
  width: number | null;
  height: number | null;
}

/** Số ô hiện trên lưới; ảnh thứ 6 trở đi gộp vào ô cuối "+N" (vẫn xem được trong lightbox). */
export const GALLERY_VISIBLE_MAX = 5;

/** Cột nội dung bài (max-w-3xl trừ padding) — để tính `sizes` cho srcset. */
const CONTENT_WIDTH_PX = 720;

export const GALLERY_SINGLE_WIDTHS = [480, 800, 1200, 1600] as const;
export const GALLERY_CELL_WIDTHS = [320, 480, 800] as const;
export const GALLERY_FULL_WIDTH = 2000;

export const GALLERY_CLASSES = {
  figure: "my-6",
  singleFrame:
    "group relative block overflow-hidden rounded-2xl border border-border bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
  /** Nền mờ bằng chính ảnh đó — chỉ lộ ra khi ảnh quá dọc bị giới hạn chiều cao. */
  singleBackdrop: "pointer-events-none absolute inset-0 size-full scale-125 object-cover opacity-70 blur-2xl",
  singleImage: "relative mx-auto block h-auto w-full max-h-[min(80vh,720px)] object-contain",
  grid: "grid gap-1 overflow-hidden rounded-2xl border border-border bg-surface",
  cell: "group relative block min-h-0 overflow-hidden bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
  cellImage: "size-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]",
  more: "absolute inset-0 grid place-items-center bg-text-primary/55 font-heading text-2xl text-white dark:bg-background/70 dark:text-text-primary",
} as const;

export interface GalleryLayout {
  gridClass: string;
  /** Class riêng từng ô đang hiện (độ dài = số ô hiện). */
  cellClasses: string[];
  /** Tỉ lệ bề ngang từng ô so với cột nội dung — cho `sizes`. */
  cellFractions: number[];
  /** Số ảnh bị gộp vào ô cuối ("+N"), 0 nếu không có. */
  hiddenCount: number;
}

/** Bố cục lưới cho bộ ≥ 2 ảnh (1 ảnh dùng khung ảnh đơn). */
export function galleryLayout(count: number): GalleryLayout {
  if (count <= 2) {
    return { gridClass: "grid-cols-2", cellClasses: ["aspect-[4/5]", "aspect-[4/5]"], cellFractions: [0.5, 0.5], hiddenCount: 0 };
  }
  if (count === 3) {
    return {
      gridClass: "grid-cols-2 grid-rows-2 aspect-[4/3]",
      cellClasses: ["row-span-2", "", ""],
      cellFractions: [0.5, 0.5, 0.5],
      hiddenCount: 0,
    };
  }
  if (count === 4) {
    return { gridClass: "grid-cols-2", cellClasses: Array(4).fill("aspect-[4/3]"), cellFractions: Array(4).fill(0.5), hiddenCount: 0 };
  }
  return {
    gridClass: "grid-cols-6",
    cellClasses: ["col-span-3 aspect-[4/3]", "col-span-3 aspect-[4/3]", "col-span-2 aspect-square", "col-span-2 aspect-square", "col-span-2 aspect-square"],
    cellFractions: [0.5, 0.5, 1 / 3, 1 / 3, 1 / 3],
    hiddenCount: count - GALLERY_VISIBLE_MAX,
  };
}

export function gallerySizes(fraction: number): string {
  return `(min-width: 768px) ${Math.round(CONTENT_WIDTH_PX * fraction)}px, ${Math.round(100 * fraction)}vw`;
}

/**
 * Đọc `data-images` của figure[data-gallery] — cho lightbox và khi dán/kéo-thả trong
 * editor. Chỉ kiểm kiểu dữ liệu; sanitize thật sự vẫn ở server lúc lưu.
 */
export function parseGalleryImagesAttr(value: string | null): GalleryImage[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && typeof item.src === "string")
      .map((item) => ({
        src: item.src as string,
        alt: typeof item.alt === "string" ? item.alt : null,
        width: typeof item.width === "number" ? item.width : null,
        height: typeof item.height === "number" ? item.height : null,
      }));
  } catch {
    return [];
  }
}
