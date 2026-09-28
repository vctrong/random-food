import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { MediaCleanupRun } from "@/lib/models/MediaCleanupRun";
import { runCleanupJob } from "@/lib/media/cleanupService";
import { DEFAULT_ORPHAN_DAYS, isAuthorizedCronRequest } from "@/lib/media/cleanupRules";

/**
 * Vercel Cron (vercel.json, 0 20 * * * ≈ 3:00 sáng giờ VN) — dọn ảnh rác mỗi ngày.
 *
 * Thời gian chạy: Vercel Hobby cho tối đa 300s khi bật Fluid compute (mặc định), 60s khi
 * tắt. Repo không biết cài đặt dashboard nên khai báo 60 (hợp lệ cả 2 trường hợp) và
 * chỉ dọn trong 45s, chừa 15s ghi lịch sử + trả response. Ảnh còn lại để lần sau.
 */
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const SAFETY_MARGIN_MS = 15_000;

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const startedAt = Date.now();

  // Vercel có thể gọi trùng 1 lần chạy — lượt đang chạy (trong cửa sổ maxDuration) thì bỏ qua.
  // Không cần khoá tuyệt đối: dọn ảnh vốn idempotent (ảnh đã xoá → not_found, bỏ qua).
  await connectDB();
  const concurrent = await MediaCleanupRun.exists({
    trigger: "cron",
    status: "running",
    startedAt: { $gt: new Date(startedAt - maxDuration * 1000) },
  });
  if (concurrent) return NextResponse.json({ ok: true, skipped: "Đang có lượt dọn khác chạy." });

  try {
    const outcome = await runCleanupJob({
      trigger: "cron",
      days: DEFAULT_ORPHAN_DAYS,
      deadlineAt: startedAt + maxDuration * 1000 - SAFETY_MARGIN_MS,
    });
    return NextResponse.json({ ok: true, ...outcome, durationMs: Date.now() - startedAt });
  } catch (error) {
    console.error("[cron] cleanup-images failed", error);
    return NextResponse.json({ ok: false, error: "Dọn ảnh thất bại — xem log." }, { status: 500 });
  }
}
