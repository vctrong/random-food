import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { Category } from "@/lib/models/Category";
import { CategoryProposal } from "@/lib/models/CategoryProposal";
import { Food } from "@/lib/models/Food";
import { AuditLog } from "@/lib/models/AuditLog";
import { recountCategoryFoods } from "@/lib/categoryCounts";
import { normalizeVietnamese, slugifyVietnamese } from "@/lib/vietnameseText";
import { FALLBACK_CATEGORY_SLUG, type CategoryGroup } from "@/constants/categoryGroups";

/**
 * Nghiệp vụ đề xuất danh mục (docs/contribute-food.md, BR-CA04→CA08):
 * - User đề xuất kèm món → gộp theo `nameNormalized` vào 1 proposal pending.
 * - FoodReviewer/Admin: gộp vào danh mục có sẵn (merge) hoặc từ chối (reject).
 * - CHỈ Admin: tạo danh mục mới từ đề xuất (approve).
 * Mọi quyết định áp dụng cho TẤT CẢ món đang gắn đề xuất đó. Món không còn
 * danh mục nào thì về danh mục hệ thống "Khác".
 */

const FALLBACK_CATEGORY = { name: "Khác", slug: FALLBACK_CATEGORY_SLUG, icon: "🍽️", group: "khac" };

/** _id danh mục "Khác" — tạo nếu chưa có (upsert, an toàn khi gọi đồng thời). */
export async function getFallbackCategoryId(): Promise<string> {
  await connectDB();
  const category = await Category.findOneAndUpdate(
    { slug: FALLBACK_CATEGORY.slug },
    {
      $setOnInsert: {
        ...FALLBACK_CATEGORY,
        nameNormalized: normalizeVietnamese(FALLBACK_CATEGORY.name),
        isActive: true,
        foodCount: 0,
        createdAt: new Date(),
      },
    },
    { upsert: true, new: true },
  ).lean();
  return String((category as { _id: unknown })._id);
}

/** Tên đề xuất thật ra trùng danh mục đang hoạt động → trả _id để dùng thẳng danh mục đó. */
export async function findActiveCategoryByName(name: string): Promise<string | null> {
  await connectDB();
  const nameNormalized = normalizeVietnamese(name);
  const category = (await Category.findOne({
    isActive: true,
    slug: { $ne: FALLBACK_CATEGORY_SLUG },
    $or: [{ nameNormalized }, { slug: slugifyVietnamese(name) }],
  })
    .select("_id")
    .lean()) as { _id: unknown } | null;
  return category ? String(category._id) : null;
}

/**
 * Ghi nhận 1 lượt đề xuất cho món `foodId`: trùng tên (sau chuẩn hoá) với
 * proposal pending thì gộp vào đó + tăng lượt, chưa có thì tạo mới.
 */
export async function recordProposalForFood({
  name,
  userId,
  foodId,
}: {
  name: string;
  userId: string;
  foodId: string;
}): Promise<string> {
  await connectDB();
  const trimmed = name.trim().replace(/\s+/g, " ");
  const nameNormalized = normalizeVietnamese(trimmed);
  const upsert = () =>
    CategoryProposal.findOneAndUpdate(
      { nameNormalized, status: "pending" },
      {
        $setOnInsert: { name: trimmed, proposedBy: userId, createdAt: new Date() },
        $addToSet: { proposerIds: userId, foodIds: foodId },
        $inc: { proposalCount: 1 },
      },
      { upsert: true, new: true },
    ).lean();

  let proposal: unknown;
  try {
    proposal = await upsert();
  } catch {
    // 2 user cùng đề xuất 1 tên mới đồng thời → 1 bên dính unique index; thử lại là gộp vào bản vừa tạo.
    proposal = await upsert();
  }
  return String((proposal as { _id: unknown })._id);
}

interface ProposalFoodDoc {
  _id: unknown;
  categoryIds: unknown[];
  proposedCategoryId?: unknown;
  save: () => Promise<unknown>;
}

/** Món đang gắn đề xuất (bỏ món đã xoá mềm). */
async function loadProposalFoods(proposalId: string): Promise<ProposalFoodDoc[]> {
  return (await Food.find({ proposedCategoryId: proposalId, visibility: { $ne: "deleted" } })) as unknown as ProposalFoodDoc[];
}

/** Số món "đang dùng" đề xuất — hiển thị "Áp dụng cho N món…" (không tính món đã bị từ chối). */
export async function countFoodsUsingProposal(proposalId: string): Promise<number> {
  await connectDB();
  return Food.countDocuments({
    proposedCategoryId: proposalId,
    visibility: { $ne: "deleted" },
    moderationStatus: { $ne: "rejected" },
  });
}

/**
 * Gỡ đề xuất khỏi món: thêm `targetCategoryId` (nếu có) và bỏ "Khác"; món
 * không còn danh mục nào thì về "Khác". Trả danh sách danh mục bị ảnh hưởng để đếm lại.
 */
async function detachProposalFromFoods(
  foods: ProposalFoodDoc[],
  targetCategoryId: string | null,
  fallbackId: string,
): Promise<string[]> {
  const touched = new Set<string>([fallbackId]);
  if (targetCategoryId) touched.add(targetCategoryId);

  for (const food of foods) {
    let ids = food.categoryIds.map(String);
    ids.forEach((id) => touched.add(id));
    if (targetCategoryId) ids = [...new Set([...ids.filter((id) => id !== fallbackId), targetCategoryId])];
    if (ids.length === 0) ids = [fallbackId];
    food.categoryIds = ids;
    food.proposedCategoryId = undefined;
    await food.save();
  }
  return [...touched];
}

/**
 * Khi món được duyệt mà đề xuất kèm theo chưa xử lý: món chưa có danh mục nào
 * thì tạm vào "Khác" (proposal giữ nguyên, chuyển Admin xử lý).
 */
export async function ensureFallbackCategory(food: ProposalFoodDoc): Promise<string[]> {
  if (food.categoryIds.length > 0) return [];
  const fallbackId = await getFallbackCategoryId();
  food.categoryIds = [fallbackId];
  return [fallbackId];
}

export type ProposalActionError =
  | "INVALID_ID"
  | "NOT_FOUND"
  | "NOT_PENDING"
  | "INVALID_CATEGORY"
  | "INVALID_NAME"
  | "INVALID_GROUP"
  | "SLUG_TAKEN";

async function loadPendingProposal(proposalId: string) {
  if (!isValidObjectId(proposalId)) return { ok: false as const, error: "INVALID_ID" as const };
  await connectDB();
  const proposal = await CategoryProposal.findById(proposalId);
  if (!proposal) return { ok: false as const, error: "NOT_FOUND" as const };
  if (proposal.status !== "pending") return { ok: false as const, error: "NOT_PENDING" as const };
  return { ok: true as const, proposal };
}

function markReviewed(proposal: { reviewedBy?: unknown; reviewedAt?: Date | null }, actorId: string) {
  proposal.reviewedBy = actorId;
  proposal.reviewedAt = new Date();
}

/** (a) Gộp vào danh mục có sẵn — FoodReviewer hoặc Admin. */
export async function mergeProposal({
  actorId,
  proposalId,
  categoryId,
}: {
  actorId: string;
  proposalId: string;
  categoryId: string;
}): Promise<{ error: ProposalActionError | null; affectedFoods?: number }> {
  const loaded = await loadPendingProposal(proposalId);
  if (!loaded.ok) return { error: loaded.error };
  const { proposal } = loaded;

  if (!isValidObjectId(categoryId)) return { error: "INVALID_CATEGORY" };
  const category = (await Category.findOne({ _id: categoryId, isActive: true, slug: { $ne: FALLBACK_CATEGORY_SLUG } }).lean()) as
    | { _id: unknown; name: string }
    | null;
  if (!category) return { error: "INVALID_CATEGORY" };

  const fallbackId = await getFallbackCategoryId();
  const foods = await loadProposalFoods(proposalId);
  const touched = await detachProposalFromFoods(foods, categoryId, fallbackId);

  proposal.status = "merged";
  proposal.mergedIntoCategoryId = categoryId;
  markReviewed(proposal, actorId);
  await proposal.save();

  await AuditLog.create({
    actorId,
    action: "category_proposal_merge",
    targetType: "category",
    targetId: proposal._id,
    reason: `Gộp đề xuất "${proposal.name}" vào danh mục "${category.name}"`,
    metadata: { proposalName: proposal.name, categoryId, categoryName: category.name, affectedFoods: foods.length },
  });
  await recountCategoryFoods(touched);
  return { error: null, affectedFoods: foods.length };
}

/** (b) Từ chối đề xuất — FoodReviewer hoặc Admin. Món giữ danh mục khác đã chọn, không còn thì về "Khác". */
export async function rejectProposal({
  actorId,
  proposalId,
  note,
}: {
  actorId: string;
  proposalId: string;
  note?: string;
}): Promise<{ error: ProposalActionError | null; affectedFoods?: number }> {
  const loaded = await loadPendingProposal(proposalId);
  if (!loaded.ok) return { error: loaded.error };
  const { proposal } = loaded;

  const fallbackId = await getFallbackCategoryId();
  const foods = await loadProposalFoods(proposalId);
  const touched = await detachProposalFromFoods(foods, null, fallbackId);

  proposal.status = "rejected";
  markReviewed(proposal, actorId);
  await proposal.save();

  await AuditLog.create({
    actorId,
    action: "category_proposal_reject",
    targetType: "category",
    targetId: proposal._id,
    reason: note?.trim() || `Từ chối đề xuất danh mục "${proposal.name}"`,
    metadata: { proposalName: proposal.name, affectedFoods: foods.length },
  });
  await recountCategoryFoods(touched);
  return { error: null, affectedFoods: foods.length };
}

/** CHỈ Admin: tạo danh mục mới từ đề xuất (được sửa tên, chọn nhóm cha), gán cho mọi món liên quan. */
export async function approveProposalAsCategory({
  adminId,
  proposalId,
  name,
  group,
}: {
  adminId: string;
  proposalId: string;
  name: string;
  group: CategoryGroup;
}): Promise<{ error: ProposalActionError | null; categoryId?: string; affectedFoods?: number }> {
  const loaded = await loadPendingProposal(proposalId);
  if (!loaded.ok) return { error: loaded.error };
  const { proposal } = loaded;

  const finalName = name.trim().replace(/\s+/g, " ");
  const slug = slugifyVietnamese(finalName);
  if (finalName.length < 2 || finalName.length > 40 || !slug) return { error: "INVALID_NAME" };
  if (group === "khac" || slug === FALLBACK_CATEGORY_SLUG) return { error: "INVALID_GROUP" };
  if (await Category.exists({ $or: [{ slug }, { nameNormalized: normalizeVietnamese(finalName) }] })) {
    return { error: "SLUG_TAKEN" };
  }

  const category = await Category.create({ name: finalName, slug, group, isActive: true });
  const categoryId = String(category._id);

  const fallbackId = await getFallbackCategoryId();
  const foods = await loadProposalFoods(proposalId);
  const touched = await detachProposalFromFoods(foods, categoryId, fallbackId);

  proposal.status = "approved";
  proposal.createdCategoryId = categoryId;
  markReviewed(proposal, adminId);
  await proposal.save();

  await AuditLog.create({
    actorId: adminId,
    action: "category_proposal_approve",
    targetType: "category",
    targetId: category._id,
    reason: `Tạo danh mục "${finalName}" từ đề xuất "${proposal.name}"`,
    metadata: { proposalId: String(proposal._id), proposalName: proposal.name, group, affectedFoods: foods.length },
  });
  await recountCategoryFoods(touched);
  return { error: null, categoryId, affectedFoods: foods.length };
}
