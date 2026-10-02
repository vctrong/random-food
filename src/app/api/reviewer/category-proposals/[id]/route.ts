import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { Food } from "@/lib/models/Food";
import { isHeldByReviewer, requireReviewerSession } from "@/lib/reviewerData";
import { mergeProposal, rejectProposal, type ProposalActionError } from "@/lib/categoryProposals";

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("merge"), foodId: z.string(), categoryId: z.string() }),
  z.object({ action: z.literal("reject"), foodId: z.string(), note: z.string().max(500).optional() }),
]);

const ERROR_MESSAGES: Record<ProposalActionError | "FOOD_MISMATCH" | "SELF_SUBMITTED" | "NOT_HOLDER", { message: string; status: number }> = {
  INVALID_ID: { message: "Mã đề xuất không hợp lệ.", status: 400 },
  NOT_FOUND: { message: "Không tìm thấy đề xuất danh mục.", status: 404 },
  NOT_PENDING: { message: "Đề xuất này đã được xử lý trước đó.", status: 409 },
  INVALID_CATEGORY: { message: "Danh mục để gộp không hợp lệ.", status: 400 },
  INVALID_NAME: { message: "Tên danh mục không hợp lệ.", status: 400 },
  INVALID_GROUP: { message: "Nhóm danh mục không hợp lệ.", status: 400 },
  SLUG_TAKEN: { message: "Đã có danh mục trùng tên.", status: 409 },
  FOOD_MISMATCH: { message: "Đề xuất này không gắn với món đang duyệt.", status: 400 },
  NOT_HOLDER: { message: "Hãy nhận xác minh món này trước khi xử lý đề xuất danh mục.", status: 403 },
  SELF_SUBMITTED: { message: "Không thể tự xử lý đề xuất trên món do chính bạn đóng góp (BR-F02).", status: 403 },
};

/**
 * FoodReviewer/Admin xử lý đề xuất danh mục KHI DUYỆT MÓN: chỉ gộp vào danh mục
 * có sẵn hoặc từ chối — không có hành động tạo danh mục ở đây (chỉ Admin tạo,
 * qua /api/admin/category-proposals). Quyết định áp dụng cho mọi món dùng đề xuất.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const reviewer = await requireReviewerSession();
  if (!reviewer.ok) {
    const message = reviewer.status === 401 ? "Vui lòng đăng nhập." : "Bạn không có quyền truy cập khu vực thẩm định.";
    return NextResponse.json({ error: message }, { status: reviewer.status });
  }

  const { id } = await params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !isValidObjectId(parsed.data.foodId)) {
    return NextResponse.json({ error: "Dữ liệu gửi lên không hợp lệ." }, { status: 400 });
  }
  const body = parsed.data;

  await connectDB();
  const food = (await Food.findById(body.foodId).select("proposedCategoryId createdBy moderationStatus").lean()) as {
    proposedCategoryId?: unknown;
    createdBy?: unknown;
    moderationStatus?: string;
  } | null;
  const fail = (key: keyof typeof ERROR_MESSAGES) =>
    NextResponse.json({ error: ERROR_MESSAGES[key].message }, { status: ERROR_MESSAGES[key].status });

  if (!food || String(food.proposedCategoryId) !== id) return fail("FOOD_MISMATCH");
  if (String(food.createdBy) === reviewer.id) return fail("SELF_SUBMITTED");
  // Chỉ reviewer đang giữ món (in_review, còn hạn) mới xử lý đề xuất đi kèm.
  if (!(await isHeldByReviewer(reviewer.id, body.foodId))) return fail("NOT_HOLDER");

  const result =
    body.action === "merge"
      ? await mergeProposal({ actorId: reviewer.id, proposalId: id, categoryId: body.categoryId })
      : await rejectProposal({ actorId: reviewer.id, proposalId: id, note: body.note });

  if (result.error) return fail(result.error);
  return NextResponse.json({ ok: true, affectedFoods: result.affectedFoods ?? 0 });
}
