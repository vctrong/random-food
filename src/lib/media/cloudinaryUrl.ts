/**
 * Hàm thuần dựng URL transform của Cloudinary (chạy được cả client lẫn server, không
 * cần SDK/secret). Dùng thay next/image cho ảnh trong nội dung thông báo: HTML bài
 * được render sẵn ở server nên không nhúng được <Image>, và tránh tốn quota tối ưu
 * ảnh của Vercel Hobby.
 */

const UPLOAD_SEGMENT = "/image/upload/";

export function isCloudinaryUrl(url: string): boolean {
  return url.startsWith("https://res.cloudinary.com/") && url.includes(UPLOAD_SEGMENT);
}

/** Chèn chuỗi transform (vd `c_limit,w_800,f_auto,q_auto`) ngay sau `/image/upload/`. URL khác giữ nguyên. */
export function cloudinaryTransform(url: string, transform: string): string {
  if (!isCloudinaryUrl(url)) return url;
  const index = url.indexOf(UPLOAD_SEGMENT) + UPLOAD_SEGMENT.length;
  return `${url.slice(0, index)}${transform}/${url.slice(index)}`;
}

/** Ảnh co theo chiều rộng (không phóng to), định dạng + chất lượng tự động. */
export function cloudinaryWidth(url: string, width: number): string {
  return cloudinaryTransform(url, `c_limit,w_${width},f_auto,q_auto`);
}

export function cloudinarySrcSet(url: string, widths: readonly number[]): string | undefined {
  if (!isCloudinaryUrl(url)) return undefined;
  return widths.map((width) => `${cloudinaryWidth(url, width)} ${width}w`).join(", ");
}

/** Bản rất nhỏ (vài KB) để làm nền mờ (CSS blur) hai bên ảnh quá dọc. */
export function cloudinaryTiny(url: string): string {
  return cloudinaryTransform(url, "c_limit,w_64,f_auto,q_auto:low");
}

/** Thumbnail vuông cắt giữa — lưới ảnh Admin. */
export function cloudinaryThumb(url: string, size: number): string {
  return cloudinaryTransform(url, `c_fill,g_auto,w_${size},h_${size},f_auto,q_auto`);
}
