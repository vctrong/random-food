import { v2 as cloudinary } from "cloudinary";

if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  throw new Error(
    "Thiếu biến môi trường Cloudinary (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)",
  );
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function uploadImageFile(file: File, folder: string): Promise<string> {
  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const result = await cloudinary.uploader.upload(`data:${file.type};base64,${base64}`, { folder });
  return result.secure_url;
}

/**
 * Upload trực tiếp từ trình duyệt lên Cloudinary (có ký phía server) — ảnh đi
 * thẳng tới Cloudinary nên có tiến độ upload và không vượt giới hạn body của
 * API route. Ảnh mới luôn gắn tag `unattached`; chỉ gỡ tag khi form gửi thành
 * công, ảnh còn tag là ảnh mồ côi (user bỏ ngang) — dọn sau (docs/contribute-food.md).
 */
export const UPLOAD_FOLDERS = {
  food: "nayangi/foods",
  restaurant: "nayangi/restaurants",
  // Ảnh trong thông báo chính thức — chỉ Admin xin được chữ ký (api/uploads/signature).
  announcement: "nayangi/announcements",
} as const;

export type UploadKind = keyof typeof UPLOAD_FOLDERS;

export const UNATTACHED_TAG = "unattached";

export function createUploadSignature(kind: UploadKind) {
  const timestamp = Math.round(Date.now() / 1000);
  const folder = UPLOAD_FOLDERS[kind];
  const paramsToSign = { folder, tags: UNATTACHED_TAG, timestamp };
  const signature = cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET as string);
  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME as string,
    apiKey: process.env.CLOUDINARY_API_KEY as string,
    folder,
    tags: UNATTACHED_TAG,
    timestamp,
    signature,
  };
}

/**
 * Trả public_id nếu `url` là ảnh do chính cloud của app upload vào đúng thư mục
 * của `kind` — chặn client gửi URL ảnh ngoài/ảnh thư mục khác vào DB.
 */
export function parseOwnUploadUrl(url: string, kind: UploadKind): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" || parsed.hostname !== "res.cloudinary.com") return null;
  const prefix = `/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/`;
  if (!parsed.pathname.startsWith(prefix)) return null;
  const rest = parsed.pathname.slice(prefix.length).replace(/^v\d+\//, "");
  if (!rest.startsWith(`${UPLOAD_FOLDERS[kind]}/`)) return null;
  const publicId = rest.replace(/\.[a-z0-9]+$/i, "");
  return /^[\w\-/]+$/.test(publicId) ? publicId : null;
}

/** Gỡ tag `unattached` sau khi ảnh đã được lưu vào DB — lỗi ở đây không làm hỏng luồng chính. */
export async function markImagesAttached(publicIds: string[]): Promise<void> {
  if (publicIds.length === 0) return;
  try {
    await cloudinary.uploader.remove_tag(UNATTACHED_TAG, publicIds);
  } catch (error) {
    console.error("[cloudinary] remove_tag failed", error);
  }
}

export { cloudinary };
