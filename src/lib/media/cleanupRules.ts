/**
 * Quy tắc thuần của chức năng dọn ảnh rác (không gọi Cloudinary/DB) — tách riêng
 * để unit test (cleanupRules.test.ts). Service thật: lib/media/cleanupService.ts.
 */

/** Thư mục gốc của app trên Cloudinary — chỉ dọn ảnh trong đây. */
export const MEDIA_ROOT_FOLDER = "nayangi";
/** Ảnh `unattached` quá số ngày này mới là ảnh rác. */
export const DEFAULT_ORPHAN_DAYS = 3;
/** Cloudinary cho xoá tối đa 100 public_id / lệnh. */
export const CLEANUP_BATCH_SIZE = 100;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Tên thư mục con hợp lệ (vd "announcements", "foods") — chặn ký tự lạ lọt vào biểu thức tìm kiếm. */
export function isValidFolderName(folder: string): boolean {
  return /^[a-z0-9][a-z0-9_-]{0,63}$/i.test(folder);
}

/** Biểu thức Search API: ảnh còn tag `unattached` trong nayangi/ (hoặc 1 thư mục con). */
export function buildOrphanSearchExpression(tag: string, folder?: string | null): string {
  const prefix = folder ? `${MEDIA_ROOT_FOLDER}/${folder}/` : `${MEDIA_ROOT_FOLDER}/`;
  return `tags=${tag} AND public_id:${prefix}*`;
}

/** "nayangi/announcements/abc" → "announcements" (ảnh nằm thẳng trong nayangi/ → "(gốc)"). */
export function folderOfPublicId(publicId: string): string {
  const parts = publicId.split("/");
  if (parts[0] !== MEDIA_ROOT_FOLDER || parts.length < 3) return "(gốc)";
  return parts.slice(1, -1).join("/");
}

export function isInsideMediaRoot(publicId: string, folder?: string | null): boolean {
  const prefix = folder ? `${MEDIA_ROOT_FOLDER}/${folder}/` : `${MEDIA_ROOT_FOLDER}/`;
  return publicId.startsWith(prefix);
}

/**
 * Mốc tính tuổi ảnh rác: `unattached_at` (lúc ảnh bị gỡ khỏi nội dung) nếu có và hợp lệ,
 * không thì ngày upload. Context từ Search API có thể phẳng hoặc nằm trong `custom`.
 */
export function orphanReferenceDate(resource: { created_at: string; context?: unknown }): Date {
  const context = resource.context as { unattached_at?: unknown; custom?: { unattached_at?: unknown } } | undefined;
  const raw = context?.unattached_at ?? context?.custom?.unattached_at;
  const unattachedAt = typeof raw === "string" ? new Date(raw) : null;
  if (unattachedAt && !Number.isNaN(unattachedAt.getTime())) return unattachedAt;
  return new Date(resource.created_at);
}

export function isOldEnough(reference: Date, now: Date, days: number): boolean {
  return now.getTime() - reference.getTime() >= days * DAY_MS;
}

export function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
  return chunks;
}

/** So khớp header `Authorization: Bearer <CRON_SECRET>` — thiếu secret cấu hình thì luôn từ chối. */
export function isAuthorizedCronRequest(authorization: string | null, secret: string | undefined): boolean {
  if (!secret || secret.length < 16 || !authorization) return false;
  const expected = `Bearer ${secret}`;
  if (authorization.length !== expected.length) return false;
  // So sánh thời gian cố định — không lộ độ dài khớp qua thời gian phản hồi.
  let diff = 0;
  for (let index = 0; index < expected.length; index += 1) diff |= authorization.charCodeAt(index) ^ expected.charCodeAt(index);
  return diff === 0;
}
