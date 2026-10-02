import { connectDB } from "@/lib/mongodb";
import { Category } from "@/lib/models/Category";
import { CategoryProposal } from "@/lib/models/CategoryProposal";
import { AuditLog } from "@/lib/models/AuditLog";
import { Food } from "@/lib/models/Food";
import { slugifyVietnamese } from "@/lib/vietnameseText";
import { FALLBACK_CATEGORY_SLUG, isCategoryGroup, type CategoryGroup } from "@/constants/categoryGroups";
import type { AdminCategoryProposalRow, AdminCategoryRow } from "@/types/admin";

export async function getCategories(): Promise<AdminCategoryRow[]> {
  await connectDB();
  const categories = await Category.find({}).sort({ name: 1 }).lean();
  return categories.map((category) => ({
    id: String(category._id),
    name: category.name,
    slug: category.slug,
    icon: category.icon ?? null,
    description: category.description ?? null,
    isActive: category.isActive ?? true,
    group: (category.group && isCategoryGroup(category.group) ? category.group : "khac") as CategoryGroup,
    foodCount: category.foodCount ?? 0,
    isSystem: category.slug === FALLBACK_CATEGORY_SLUG,
    createdAt: (category.createdAt ?? new Date()).toISOString(),
  }));
}

type CategoryError = "SLUG_TAKEN" | "NOT_FOUND";

interface CreateCategoryInput {
  adminId: string;
  name: string;
  icon?: string;
  description?: string;
  group?: CategoryGroup;
}

export async function createCategory({
  adminId,
  name,
  icon,
  description,
  group,
}: CreateCategoryInput): Promise<{ error: CategoryError | null; id?: string }> {
  await connectDB();
  const slug = slugifyVietnamese(name);
  const existing = await Category.findOne({ slug });
  if (existing) return { error: "SLUG_TAKEN" };

  const category = await Category.create({ name: name.trim(), slug, icon, description, group: group ?? "khac" });

  await AuditLog.create({
    actorId: adminId,
    action: "category_create",
    targetType: "category",
    targetId: category._id,
    metadata: { name: category.name },
  });

  return { error: null, id: String(category._id) };
}

interface UpdateCategoryInput {
  adminId: string;
  categoryId: string;
  name?: string;
  icon?: string;
  description?: string;
  isActive?: boolean;
  group?: CategoryGroup;
}

export async function updateCategory({
  adminId,
  categoryId,
  name,
  icon,
  description,
  isActive,
  group,
}: UpdateCategoryInput): Promise<{ error: CategoryError | null }> {
  await connectDB();
  const category = await Category.findById(categoryId);
  if (!category) return { error: "NOT_FOUND" };

  if (typeof name === "string" && name.trim()) category.name = name.trim();
  if (typeof icon === "string") category.icon = icon;
  if (typeof description === "string") category.description = description;
  // Danh mục hệ thống "Khác" luôn bật — tắt đi thì món đang tạm ở đó sẽ mất danh mục.
  if (typeof isActive === "boolean" && category.slug !== FALLBACK_CATEGORY_SLUG) category.isActive = isActive;
  if (group) category.group = group;
  await category.save();

  await AuditLog.create({
    actorId: adminId,
    action: "category_update",
    targetType: "category",
    targetId: categoryId,
    metadata: { name: category.name },
  });

  return { error: null };
}

export async function getCategoryProposals(): Promise<AdminCategoryProposalRow[]> {
  await connectDB();
  const proposals = (await CategoryProposal.find({})
    .sort({ status: 1, createdAt: -1 })
    .populate("proposedBy", "name")
    .populate("reviewedBy", "name")
    .lean()) as unknown as LeanProposal[];

  const foodIds = proposals.flatMap((proposal) => proposal.foodIds ?? []);
  const foods = (await Food.find({ _id: { $in: foodIds } })
    .select("name moderationStatus visibility proposedCategoryId")
    .lean()) as unknown as { _id: unknown; name: string; moderationStatus: string; visibility: string; proposedCategoryId?: unknown }[];
  const foodById = new Map(foods.map((food) => [String(food._id), food]));

  return proposals.map((proposal) => {
    const proposedBy = proposal.proposedBy as { _id?: unknown; name?: string } | null;
    const reviewedBy = proposal.reviewedBy as { _id?: unknown; name?: string } | null;
    const linkedFoods = (proposal.foodIds ?? [])
      .map((id) => foodById.get(String(id)))
      .filter((food): food is NonNullable<typeof food> => Boolean(food && food.visibility !== "deleted"));
    // "Đang dùng" = món còn gắn đề xuất, chưa bị từ chối/rút — đúng tập món mà quyết định sẽ áp dụng.
    const activeFoods = linkedFoods.filter(
      (food) =>
        String(food.proposedCategoryId) === String(proposal._id) &&
        food.moderationStatus !== "rejected" &&
        food.moderationStatus !== "withdrawn",
    );
    return {
      id: String(proposal._id),
      name: proposal.name,
      status: proposal.status,
      proposalCount: proposal.proposalCount ?? 1,
      foods: activeFoods.map((food) => ({ id: String(food._id), name: food.name, status: food.moderationStatus })),
      proposedBy: { id: String(proposedBy?._id ?? ""), name: proposedBy?.name ?? "Người dùng đã xoá" },
      reviewedBy: reviewedBy?._id ? { id: String(reviewedBy._id), name: reviewedBy.name ?? "" } : null,
      reviewedAt: proposal.reviewedAt ? new Date(proposal.reviewedAt).toISOString() : null,
      createdAt: new Date(proposal.createdAt ?? Date.now()).toISOString(),
    };
  });
}

interface LeanProposal {
  _id: unknown;
  name: string;
  status: AdminCategoryProposalRow["status"];
  proposalCount?: number;
  foodIds?: unknown[];
  proposedBy?: unknown;
  reviewedBy?: unknown;
  reviewedAt?: Date;
  createdAt?: Date;
}
