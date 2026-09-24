/** 1 = xa (nhỏ, mờ, dịch ít) → 3 = gần (to, rõ, dịch nhiều khi parallax). */
export type StickerDepth = 1 | 2 | 3;

export interface FloatingSticker {
  id: string;
  emoji: string;
  /** Vị trí tâm sticker theo % khung chứa (desktop, từ lg). */
  x: number;
  y: number;
  /** Cỡ chữ emoji (rem) trên desktop. */
  size: number;
  depth: StickerDepth;
  /** Góc nghiêng tĩnh (deg). */
  rotate: number;
  /** Biên độ trôi lên xuống (px) và góc lắc thêm (deg). */
  floatY: number;
  floatRotate: number;
  /** Chu kỳ và độ lệch pha (giây) — mỗi sticker khác nhau để không trôi đồng loạt. */
  duration: number;
  delay: number;
  /** Có giá trị → sticker cũng hiện dưới lg với vị trí/cỡ này; bỏ trống → chỉ hiện từ lg. */
  mobile?: { x: number; y: number; size: number };
}

/**
 * Sticker quanh hero. 4 sticker góc (đũa, trà sữa, bánh mì, ớt) theo đúng vị trí
 * trong mockup landing (bản PC); phần còn lại rải thêm ở lề 2 bên máy random.
 */
export const HERO_STICKERS: FloatingSticker[] = [
  { id: "dua", emoji: "🥢", x: 5, y: 9, size: 2.6, depth: 2, rotate: -12, floatY: 8, floatRotate: 3, duration: 4.2, delay: -0.2, mobile: { x: 5, y: 3, size: 1.35 } },
  { id: "tra-sua", emoji: "🧋", x: 93, y: 13, size: 3.2, depth: 3, rotate: 12, floatY: 10, floatRotate: -4, duration: 5.1, delay: -0.8, mobile: { x: 94, y: 4, size: 1.5 } },
  { id: "lap-lanh-1", emoji: "✨", x: 21, y: 5, size: 1.6, depth: 1, rotate: 0, floatY: 6, floatRotate: 10, duration: 3.4, delay: -1.1, mobile: { x: 7, y: 17, size: 1.1 } },
  { id: "banh-xeo", emoji: "🥞", x: 12, y: 30, size: 3, depth: 3, rotate: -8, floatY: 12, floatRotate: 4, duration: 5.8, delay: -2.3 },
  { id: "bun", emoji: "🍜", x: 87, y: 34, size: 2.8, depth: 2, rotate: 6, floatY: 9, floatRotate: -3, duration: 4.8, delay: -1.6, mobile: { x: 93, y: 16, size: 1.4 } },
  { id: "com-tam", emoji: "🍚", x: 4, y: 54, size: 2.2, depth: 1, rotate: 4, floatY: 7, floatRotate: 3, duration: 6.2, delay: -3.1 },
  { id: "che", emoji: "🍧", x: 95, y: 55, size: 2.1, depth: 1, rotate: -6, floatY: 7, floatRotate: 4, duration: 5.5, delay: -0.5 },
  { id: "banh-mi", emoji: "🥖", x: 7, y: 80, size: 3, depth: 3, rotate: 6, floatY: 11, floatRotate: -3, duration: 4.5, delay: -1.4 },
  { id: "ot", emoji: "🌶️", x: 92, y: 74, size: 2.4, depth: 2, rotate: -12, floatY: 9, floatRotate: 5, duration: 4.1, delay: -1.9, mobile: { x: 4, y: 29, size: 1.2 } },
  { id: "lap-lanh-2", emoji: "✨", x: 78, y: 7, size: 1.4, depth: 1, rotate: 0, floatY: 6, floatRotate: -10, duration: 3.8, delay: -2.6 },
];

/** Sticker nhỏ quanh tiêu đề section "gu ăn" — khung chứa là hàng tiêu đề. */
export const HUNGER_TITLE_STICKERS: FloatingSticker[] = [
  { id: "gu-lap-lanh", emoji: "✨", x: 50, y: 18, size: 1.5, depth: 1, rotate: 0, floatY: 6, floatRotate: 10, duration: 3.6, delay: -0.7, mobile: { x: 88, y: 12, size: 1.1 } },
  { id: "gu-xien", emoji: "🍡", x: 66, y: 72, size: 2, depth: 2, rotate: -14, floatY: 8, floatRotate: 4, duration: 4.6, delay: -1.8, mobile: { x: 94, y: 48, size: 1.3 } },
  { id: "gu-banh-bao", emoji: "🥟", x: 76, y: 34, size: 1.8, depth: 3, rotate: 10, floatY: 9, floatRotate: -4, duration: 5.2, delay: -2.9 },
];
