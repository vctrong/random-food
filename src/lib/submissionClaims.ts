import { connectDB } from "@/lib/mongodb";
import { Food } from "@/lib/models/Food";
import { AuditLog } from "@/lib/models/AuditLog";
import { claimCutoff } from "@/features/contributions/submissionRules";

/**
 * Tự nhả đề xuất `in_review` quá hạn CLAIM_TTL_HOURS về `pending` (IN_REVIEW → PENDING, actor "system").
 *
 * Kiểm tra lazy thay vì cron: Vercel Hobby chỉ chạy cron 1 lần/ngày nên nhả trễ tới 24h.
 * Hàm này được gọi đầu mỗi lần đọc hàng chờ / trang đóng góp / thao tác sửa; còn mọi thao tác
 * của reviewer đều kèm điều kiện `claimedAt` còn hạn, nên dù chưa ai mở trang thì reviewer
 * quá hạn cũng không thao tác được nữa. Tách khỏi submissionWorkflow.ts để lib/contributions.ts
 * dùng được mà không tạo vòng import (workflow → achievements → contributions).
 */
export async function releaseExpiredClaims(now: Date = new Date()): Promise<number> {
  await connectDB();
  const cutoff = claimCutoff(now);
  const expired = (await Food.find({ moderationStatus: "in_review", claimedAt: { $lt: cutoff } })
    .select("_id name reviewerId")
    .lean()) as unknown as { _id: unknown; name: string; reviewerId?: unknown }[];

  let released = 0;
  for (const food of expired) {
    // Cập nhật từng món có điều kiện: món vừa được quyết định giữa lúc find và update sẽ không bị nhả nhầm.
    const result = await Food.updateOne(
      { _id: food._id, moderationStatus: "in_review", claimedAt: { $lt: cutoff } },
      { $set: { moderationStatus: "pending", updatedAt: now }, $unset: { reviewerId: "", claimedAt: "" } },
    );
    if (result.modifiedCount === 0) continue;
    released += 1;
    await AuditLog.create({
      action: "release_submission",
      targetType: "food",
      targetId: food._id,
      metadata: { name: food.name, auto: true, previousReviewerId: food.reviewerId ? String(food.reviewerId) : null },
    }).catch(() => undefined);
  }
  return released;
}
