/**
 * Quyết định định dạng xuất khi nén/cắt ảnh bằng canvas ở trình duyệt (hàm thuần —
 * test ở imageFormat.test.ts). JPEG không có kênh alpha: vùng trong suốt sẽ thành
 * ĐEN (pixel trong suốt của canvas là rgba(0,0,0,0)) → ảnh có trong suốt phải xuất
 * WebP (giữ alpha), trình duyệt không xuất được WebP thì PNG.
 */

/** Định dạng có thể chứa kênh alpha — chỉ những loại này mới cần dò pixel trong suốt. */
export const ALPHA_CAPABLE_TYPES: ReadonlySet<string> = new Set(["image/png", "image/webp", "image/gif"]);

export type CanvasOutputType = "image/jpeg" | "image/webp" | "image/png";

/** Dò mảng RGBA (ImageData.data): có pixel nào alpha < 255 không. */
export function hasTransparentPixels(rgba: ArrayLike<number>): boolean {
  for (let index = 3; index < rgba.length; index += 4) {
    if (rgba[index] < 255) return true;
  }
  return false;
}

/** Có trong suốt (và định dạng gốc hỗ trợ alpha) → WebP; còn lại JPEG như cũ. */
export function chooseOutputType({ sourceType, hasTransparency }: { sourceType: string; hasTransparency: boolean }): CanvasOutputType {
  return ALPHA_CAPABLE_TYPES.has(sourceType) && hasTransparency ? "image/webp" : "image/jpeg";
}

/**
 * Trình duyệt không mã hoá được định dạng yêu cầu thì canvas.toBlob trả về PNG thay thế
 * (vd Safari cũ với WebP) — dùng kết quả thật, và WebP hỏng thì lùi về PNG (vẫn giữ alpha).
 */
export function fallbackOutputType(requested: CanvasOutputType, produced: string | undefined): CanvasOutputType | null {
  if (produced === requested) return null;
  return requested === "image/webp" ? "image/png" : null;
}

export function extensionFor(type: CanvasOutputType): string {
  return type === "image/jpeg" ? ".jpg" : type === "image/webp" ? ".webp" : ".png";
}
