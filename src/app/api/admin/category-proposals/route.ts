import { NextResponse } from "next/server";
import { z } from "zod";
import { apiNotFound } from "@/lib/http404";
import { requireAdminSession } from "@/lib/admin/session";
import { getCategoryProposals } from "@/lib/admin/categories";
import {
  approveProposalAsCategory,
  mergeProposal,
  rejectProposal,
  type ProposalActionError,
} from "@/lib/categoryProposals";
import { CATEGORY_GROUP_IDS, type CategoryGroup } from "@/constants/categoryGroups";

const bodySchema = z.discriminatedUnion("decision", [
  // CHỈ Admin: tạo danh mục mới từ đề xuất, được sửa tên + chọn nhóm cha.
  z.object({
    decision: z.literal("approved"),
    proposalId: z.string(),
    name: z.string().trim().min(2).max(40),
    group: z.enum(CATEGORY_GROUP_IDS as [CategoryGroup, ...CategoryGroup[]]),
  }),
  z.object({ decision: z.literal("merged"), proposalId: z.string(), categoryId: z.string() }),
  z.object({ decision: z.literal("rejected"), proposalId: z.string(), note: z.string().max(500).optional() }),
]);

const ERROR_MESSAGES: Record<ProposalActionError, string> = {
  INVALID_ID: "Mã đề xuất không hợp lệ.",
  NOT_FOUND: "Không tìm thấy đề xuất.",
  NOT_PENDING: "Đề xuất này đã được xử lý trước đó.",
  INVALID_CATEGORY: "Danh mục để gộp không hợp lệ.",
  INVALID_NAME: "Tên danh mục cần 2–40 ký tự.",
  INVALID_GROUP: "Chọn nhóm cha khác \"Khác\" cho danh mục mới.",
  SLUG_TAKEN: "Đã có danh mục trùng tên — hãy gộp vào danh mục đó.",
};

export async function GET() {
  const admin = await requireAdminSession();
  if (!admin) return apiNotFound();

  return NextResponse.json(await getCategoryProposals());
}

export async function POST(request: Request) {
  const admin = await requireAdminSession();
  if (!admin) return apiNotFound();

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu gửi lên không hợp lệ." }, { status: 400 });
  const body = parsed.data;

  const result =
    body.decision === "approved"
      ? await approveProposalAsCategory({ adminId: admin.id, proposalId: body.proposalId, name: body.name, group: body.group })
      : body.decision === "merged"
        ? await mergeProposal({ actorId: admin.id, proposalId: body.proposalId, categoryId: body.categoryId })
        : await rejectProposal({ actorId: admin.id, proposalId: body.proposalId, note: body.note });

  if (result.error) return NextResponse.json({ error: ERROR_MESSAGES[result.error] }, { status: 400 });
  return NextResponse.json({ ok: true, affectedFoods: result.affectedFoods ?? 0 });
}
