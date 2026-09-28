import { UPLOAD_MAX_DIMENSION, UPLOAD_QUALITY, MAX_FOOD_IMAGE_BYTES } from "@/constants/limits";
import {
  ALPHA_CAPABLE_TYPES,
  chooseOutputType,
  extensionFor,
  fallbackOutputType,
  hasTransparentPixels,
  type CanvasOutputType,
} from "@/lib/media/imageFormat";

/**
 * Upload ảnh thẳng từ trình duyệt lên Cloudinary: xin chữ ký ở
 * /api/uploads/signature rồi POST tới Cloudinary bằng XHR (fetch chưa báo tiến độ upload).
 * Ảnh được nén bằng canvas trước — không cần thư viện ngoài.
 */

export type UploadKind = "food" | "restaurant" | "announcement";

interface UploadSignature {
  cloudName: string;
  apiKey: string;
  folder: string;
  tags: string;
  timestamp: number;
  signature: string;
}

export class UploadError extends Error {}

const COMPRESSIBLE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new UploadError("Không đọc được ảnh này, thử ảnh khác nha."));
    };
    image.src = url;
  });
}

/** Kết quả chuẩn bị ảnh: file để upload + ảnh có vùng trong suốt không (để hiển thị nền sáng). */
export interface PreparedImage {
  file: File;
  transparent: boolean;
}

/** Ảnh nhỏ hơn mức này và không cần thu nhỏ thì giữ nguyên file gốc (không mã hoá lại). */
const SKIP_REENCODE_BYTES = 600 * 1024;

/** Vẽ ảnh lên canvas; `crop` tính bằng pixel ảnh gốc. */
function drawToCanvas(image: HTMLImageElement, target: { width: number; height: number }, crop?: CropRect) {
  const canvas = document.createElement("canvas");
  canvas.width = target.width;
  canvas.height = target.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  if (crop) context.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, target.width, target.height);
  else context.drawImage(image, 0, 0, target.width, target.height);
  return { canvas, context };
}

function detectTransparency(sourceType: string, context: CanvasRenderingContext2D, width: number, height: number): boolean {
  if (!ALPHA_CAPABLE_TYPES.has(sourceType)) return false;
  return hasTransparentPixels(context.getImageData(0, 0, width, height).data);
}

function canvasToBlob(canvas: HTMLCanvasElement, type: CanvasOutputType, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Xuất canvas: có trong suốt → WebP (giữ alpha), trình duyệt không xuất được WebP → PNG;
 * không trong suốt → JPEG. JPEG không có alpha nên vùng trong suốt sẽ thành đen — đó
 * là lỗi cũ khi mọi ảnh đều bị xuất JPEG.
 */
async function exportCanvas(canvas: HTMLCanvasElement, sourceType: string, transparent: boolean, quality: number) {
  let type = chooseOutputType({ sourceType, hasTransparency: transparent });
  let blob = await canvasToBlob(canvas, type, quality);
  const fallback = fallbackOutputType(type, blob?.type);
  if (fallback) {
    type = fallback;
    blob = await canvasToBlob(canvas, type, quality);
  }
  return blob ? { blob, type } : null;
}

function renamed(name: string, type: CanvasOutputType): string {
  return name.replace(/\.\w+$/, "") + extensionFor(type);
}

/**
 * Thu nhỏ cạnh dài về ≤ 1600px và nén (JPEG, hoặc WebP nếu ảnh có trong suốt).
 * GIF giữ nguyên (canvas làm mất chuyển động); ảnh đã nhỏ giữ nguyên file gốc.
 */
export async function compressImage(file: File): Promise<PreparedImage> {
  if (!COMPRESSIBLE_TYPES.has(file.type) && file.type !== "image/gif") return { file, transparent: false };
  const image = await loadImage(file);
  const scale = Math.min(1, UPLOAD_MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const drawn = drawToCanvas(image, { width, height });
  if (!drawn) return { file, transparent: false };
  const transparent = detectTransparency(file.type, drawn.context, width, height);

  if (file.type === "image/gif" || (scale === 1 && file.size < SKIP_REENCODE_BYTES)) return { file, transparent };

  const exported = await exportCanvas(drawn.canvas, file.type, transparent, UPLOAD_QUALITY);
  // Nén không nhỏ hơn (hiếm) → giữ file gốc; file gốc PNG/WebP vẫn còn alpha.
  if (!exported || exported.blob.size >= file.size) return { file, transparent };
  return { file: new File([exported.blob], renamed(file.name, exported.type), { type: exported.type }), transparent };
}

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Cắt ảnh theo vùng tính bằng pixel ảnh gốc (canvas, không cần thư viện). Vùng cắt có
 * trong suốt → WebP/PNG giữ alpha, không thì JPEG chất lượng cao — compressImage nén tiếp lúc upload.
 */
export async function cropImageFile(file: File, rect: CropRect): Promise<File> {
  const image = await loadImage(file);
  const x = Math.max(0, Math.round(rect.x));
  const y = Math.max(0, Math.round(rect.y));
  const width = Math.min(image.naturalWidth - x, Math.round(rect.width));
  const height = Math.min(image.naturalHeight - y, Math.round(rect.height));
  if (width < 1 || height < 1) throw new UploadError("Vùng cắt không hợp lệ, chọn lại nha.");

  const drawn = drawToCanvas(image, { width, height }, { x, y, width, height });
  if (!drawn) throw new UploadError("Trình duyệt không cắt được ảnh này.");
  const transparent = detectTransparency(file.type, drawn.context, width, height);
  const exported = await exportCanvas(drawn.canvas, file.type, transparent, 0.92);
  if (!exported) throw new UploadError("Trình duyệt không cắt được ảnh này.");
  return new File([exported.blob], renamed(file.name, exported.type), { type: exported.type });
}

async function getSignature(kind: UploadKind): Promise<UploadSignature> {
  const response = await fetch("/api/uploads/signature", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind }),
  });
  const data = (await response.json().catch(() => ({}))) as UploadSignature & { error?: string };
  if (!response.ok) throw new UploadError(data.error ?? "Không xin được quyền tải ảnh, thử lại nha.");
  return data;
}

export interface UploadedImage {
  url: string;
  width: number | null;
  height: number | null;
  /** Ảnh có vùng trong suốt — hiển thị trên nền sáng, không làm mờ nền phía sau. */
  transparent: boolean;
}

interface UploadOptions {
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

/** Nén + upload 1 ảnh, trả secure_url. `onProgress` nhận 0–100. Huỷ được bằng `signal`. */
export async function uploadImage(file: File, kind: UploadKind, options: UploadOptions = {}): Promise<string> {
  return (await uploadImageAsset(file, kind, options)).url;
}

/** Như uploadImage nhưng trả thêm kích thước thật của ảnh (để giữ chỗ đúng tỉ lệ khi hiển thị). */
export async function uploadImageAsset(
  file: File,
  kind: UploadKind,
  { onProgress, signal }: UploadOptions = {},
): Promise<UploadedImage> {
  if (!file.type.startsWith("image/")) throw new UploadError("Chỉ nhận tệp hình ảnh.");
  const { file: compressed, transparent } = await compressImage(file);
  if (compressed.size > MAX_FOOD_IMAGE_BYTES) throw new UploadError("Ảnh quá lớn (tối đa 5MB sau khi nén).");

  const signature = await getSignature(kind);
  const form = new FormData();
  form.append("file", compressed);
  form.append("api_key", signature.apiKey);
  form.append("timestamp", String(signature.timestamp));
  form.append("signature", signature.signature);
  form.append("folder", signature.folder);
  form.append("tags", signature.tags);

  return new Promise<UploadedImage>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText) as { secure_url?: string; width?: number; height?: number };
        if (xhr.status >= 200 && xhr.status < 300 && body.secure_url) {
          resolve({ url: body.secure_url, width: body.width ?? null, height: body.height ?? null, transparent });
        } else {
          reject(new UploadError("Tải ảnh lên thất bại, thử lại nha."));
        }
      } catch {
        reject(new UploadError("Tải ảnh lên thất bại, thử lại nha."));
      }
    };
    xhr.onerror = () => reject(new UploadError("Mất kết nối khi tải ảnh, kiểm tra mạng rồi thử lại."));
    xhr.onabort = () => reject(new DOMException("Aborted", "AbortError"));
    signal?.addEventListener("abort", () => xhr.abort(), { once: true });
    xhr.send(form);
  });
}
