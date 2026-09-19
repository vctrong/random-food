import { connectDB } from "@/lib/mongodb";
import { Category } from "@/lib/models/Category";
import { CategoryProposal } from "@/lib/models/CategoryProposal";
import { AuditLog } from "@/lib/models/AuditLog";
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
    createdAt: (category.createdAt ?? new Date()).toISOString(),
  }));
}

type CategoryError = "SLUG_TAKEN" | "NOT_FOUND";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

interface CreateCategoryInput {
  adminId: string;
  name: string;
  icon?: string;
  description?: string;
}

export async function createCategory({
  adminId,
  name,
  icon,
  description,
}: CreateCategoryInput): Promise<{ error: CategoryError | null; id?: string }> {
  await connectDB();
  const slug = slugify(name);
  const existing = await Category.findOne({ slug });
  if (existing) return { error: "SLUG_TAKEN" };

  const category = await Category.create({ name: name.trim(), slug, icon, description });

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
}

export async function updateCategory({
  adminId,
  categoryId,
  name,
  icon,
  description,
  isActive,
}: UpdateCategoryInput): Promise<{ error: CategoryError | null }> {
  await connectDB();
  const category = await Category.findById(categoryId);
  if (!category) return { error: "NOT_FOUND" };

  if (typeof name === "string" && name.trim()) category.name = name.trim();
  if (typeof icon === "string") category.icon = icon;
  if (typeof description === "string") category.description = description;
  if (typeof isActive === "boolean") category.isActive = isActive;
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
  const proposals = await CategoryProposal.find({})
    .sort({ createdAt: -1 })
    .populate("proposedBy", "name")
    .populate("reviewedBy", "name")
    .lean();

  return proposals.map((proposal) => {
    const proposedBy = proposal.proposedBy as unknown as { _id?: unknown; name?: string } | null;
    const reviewedBy = proposal.reviewedBy as unknown as { _id?: unknown; name?: string } | null;
    return {
      id: String(proposal._id),
      name: proposal.name,
      status: proposal.status as "pending" | "approved" | "rejected",
      proposedBy: { id: String(proposedBy?._id ?? ""), name: proposedBy?.name ?? "Người dùng đã xoá" },
      reviewedBy: reviewedBy?._id ? { id: String(reviewedBy._id), name: reviewedBy.name ?? "" } : null,
      reviewedAt: proposal.reviewedAt ? proposal.reviewedAt.toISOString() : null,
      createdAt: (proposal.createdAt ?? new Date()).toISOString(),
    };
  });
}

type ProposalDecisionError = "NOT_FOUND" | "NOT_PENDING" | "SLUG_TAKEN";

export async function decideCategoryProposal({
  adminId,
  proposalId,
  decision,
}: {
  adminId: string;
  proposalId: string;
  decision: "approved" | "rejected";
}): Promise<{ error: ProposalDecisionError | null }> {
  await connectDB();
  const proposal = await CategoryProposal.findById(proposalId);
  if (!proposal) return { error: "NOT_FOUND" };
  if (proposal.status !== "pending") return { error: "NOT_PENDING" };

  if (decision === "approved") {
    const slug = slugify(proposal.name);
    const existing = await Category.findOne({ slug });
    if (existing) return { error: "SLUG_TAKEN" };
    await Category.create({ name: proposal.name, slug });
  }

  proposal.status = decision;
  proposal.reviewedBy = adminId as unknown as typeof proposal.reviewedBy;
  proposal.reviewedAt = new Date();
  await proposal.save();

  await AuditLog.create({
    actorId: adminId,
    action: decision === "approved" ? "category_create" : "category_update",
    targetType: "category",
    targetId: proposal._id,
    reason: `Đề xuất danh mục "${proposal.name}" — ${decision === "approved" ? "đã duyệt" : "đã từ chối"}`,
    metadata: { name: proposal.name },
  });

  return { error: null };
}
