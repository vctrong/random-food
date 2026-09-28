import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";
import { hitRateLimit } from "@/lib/rateLimit";
import { createUploadSignature, UPLOAD_FOLDERS, type UploadKind } from "@/lib/cloudinary";

const SIGNATURES_PER_WINDOW = 40;
const WINDOW_MS = 10 * 60 * 1000;

/** Cấp chữ ký upload thẳng lên Cloudinary — chỉ user đã đăng nhập, chỉ 2 thư mục cố định. */
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return NextResponse.json({ error: "Vui lòng đăng nhập để tải ảnh lên." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const kind = body?.kind;
  if (typeof kind !== "string" || !(kind in UPLOAD_FOLDERS)) {
    return NextResponse.json({ error: "Loại ảnh không hợp lệ." }, { status: 400 });
  }

  const limit = await hitRateLimit(`upload:signature:user:${auth.id}`, SIGNATURES_PER_WINDOW, WINDOW_MS);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Bạn tải ảnh hơi nhiều, đợi chút rồi thử lại nha." }, { status: 429 });
  }

  return NextResponse.json(createUploadSignature(kind as UploadKind));
}
