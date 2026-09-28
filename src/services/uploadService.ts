import { UPLOAD_MAX_DIMENSION, UPLOAD_QUALITY, MAX_FOOD_IMAGE_BYTES } from "@/constants/limits";

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

/** Thu nhỏ cạnh dài về ≤ 1600px và nén JPEG. Ảnh GIF/ảnh đã nhỏ giữ nguyên. */
export async function compressImage(file: File): Promise<File> {
  if (!COMPRESSIBLE_TYPES.has(file.type)) return file;
  const image = await loadImage(file);
  const scale = Math.min(1, UPLOAD_MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
  if (scale === 1 && file.size < 600 * 1024) return file;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.naturalWidth * scale);
  canvas.height = Math.round(image.naturalHeight * scale);
  const context = canvas.getContext("2d");
  if (!context) return file;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", UPLOAD_QUALITY));
  if (!blob || blob.size >= file.size) return file;
  return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
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

/** Nén + upload 1 ảnh, trả secure_url. `onProgress` nhận 0–100. Huỷ được bằng `signal`. */
export async function uploadImage(
  file: File,
  kind: UploadKind,
  { onProgress, signal }: { onProgress?: (percent: number) => void; signal?: AbortSignal } = {},
): Promise<string> {
  if (!file.type.startsWith("image/")) throw new UploadError("Chỉ nhận tệp hình ảnh.");
  const compressed = await compressImage(file);
  if (compressed.size > MAX_FOOD_IMAGE_BYTES) throw new UploadError("Ảnh quá lớn (tối đa 5MB sau khi nén).");

  const signature = await getSignature(kind);
  const form = new FormData();
  form.append("file", compressed);
  form.append("api_key", signature.apiKey);
  form.append("timestamp", String(signature.timestamp));
  form.append("signature", signature.signature);
  form.append("folder", signature.folder);
  form.append("tags", signature.tags);

  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText) as { secure_url?: string; error?: { message?: string } };
        if (xhr.status >= 200 && xhr.status < 300 && body.secure_url) resolve(body.secure_url);
        else reject(new UploadError("Tải ảnh lên thất bại, thử lại nha."));
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
