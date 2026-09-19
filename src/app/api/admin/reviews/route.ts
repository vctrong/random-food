import { NextResponse } from "next/server";
import { apiNotFound } from "@/lib/http404";
import { requireAdminSession } from "@/lib/admin/session";
import { getReviews, setReviewStatus } from "@/lib/admin/reviews";

const STATUSES = new Set(["visible", "hidden"]);

export async function GET(request: Request) {
  const admin = await requireAdminSession();
  if (!admin) return apiNotFound();

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const reviews = await getReviews(status && STATUSES.has(status) ? (status as "visible" | "hidden") : undefined);
  return NextResponse.json(reviews);
}

export async function PATCH(request: Request) {
  const admin = await requireAdminSession();
  if (!admin) return apiNotFound();

  const body = await request.json().catch(() => null);
  const reviewId = body?.reviewId;
  const status = body?.status;

  if (typeof reviewId !== "string" || !reviewId) {
    return NextResponse.json({ error: "Thiếu reviewId." }, { status: 400 });
  }
  if (typeof status !== "string" || !STATUSES.has(status)) {
    return NextResponse.json({ error: "Thiếu hoặc sai status." }, { status: 400 });
  }

  const result = await setReviewStatus({ adminId: admin.id, reviewId, status: status as "visible" | "hidden" });
  if (result.error) return NextResponse.json({ error: "Không tìm thấy đánh giá." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
