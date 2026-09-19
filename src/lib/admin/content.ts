import { connectDB } from "@/lib/mongodb";
import { Food } from "@/lib/models/Food";
import { Restaurant } from "@/lib/models/Restaurant";
import { AuditLog } from "@/lib/models/AuditLog";
import "@/lib/models/Category";
import type { AdminContentRow, ContentTargetType, ModerationStatus } from "@/types/admin";

interface LeanCreatedBy {
  _id: unknown;
  name?: string;
  avatarUrl?: string;
}

function toSubmitter(createdBy: unknown): AdminContentRow["submitter"] {
  const user = createdBy as LeanCreatedBy | null;
  if (!user || !user._id) return { id: "", name: "Người dùng đã xoá", avatarUrl: null };
  return { id: String(user._id), name: user.name ?? "Người dùng ẩn danh", avatarUrl: user.avatarUrl ?? null };
}

export async function getContentRows(statusFilter?: ModerationStatus): Promise<AdminContentRow[]> {
  await connectDB();
  const query = statusFilter ? { moderationStatus: statusFilter } : {};

  const [foods, restaurants] = await Promise.all([
    Food.find(query)
      .sort({ createdAt: -1 })
      .populate("restaurantId", "name address")
      .populate("createdBy", "name avatarUrl")
      .lean(),
    Restaurant.find(query).sort({ createdAt: -1 }).populate("createdBy", "name avatarUrl").lean(),
  ]);

  const foodRows: AdminContentRow[] = foods.map((food) => {
    const restaurant = food.restaurantId as unknown as { name?: string; address?: string } | null;
    return {
      targetType: "food",
      id: String(food._id),
      name: food.name,
      description: food.description ?? "",
      images: food.images ?? [],
      address: restaurant?.address ?? null,
      priceMin: food.priceRange?.min ?? null,
      priceMax: food.priceRange?.max ?? null,
      moderationStatus: food.moderationStatus as ModerationStatus,
      visibility: food.visibility as AdminContentRow["visibility"],
      moderationNote: food.moderationNote ?? null,
      submitter: toSubmitter(food.createdBy),
      createdAt: (food.createdAt ?? new Date()).toISOString(),
    };
  });

  const restaurantRows: AdminContentRow[] = restaurants.map((restaurant) => ({
    targetType: "restaurant",
    id: String(restaurant._id),
    name: restaurant.name,
    description: "",
    images: [],
    address: restaurant.address,
    priceMin: null,
    priceMax: null,
    moderationStatus: restaurant.moderationStatus as ModerationStatus,
    visibility: restaurant.visibility as AdminContentRow["visibility"],
    moderationNote: restaurant.moderationNote ?? null,
    submitter: toSubmitter(restaurant.createdBy),
    createdAt: (restaurant.createdAt ?? new Date()).toISOString(),
  }));

  return [...foodRows, ...restaurantRows].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

type VisibilityError = "NOT_FOUND";

export async function setContentVisibility({
  adminId,
  targetType,
  targetId,
  visibility,
}: {
  adminId: string;
  targetType: ContentTargetType;
  targetId: string;
  visibility: "visible" | "hidden";
}): Promise<{ error: VisibilityError | null }> {
  await connectDB();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Food/Restaurant có field visibility giống nhau nhưng khác model TS.
  const Model: any = targetType === "food" ? Food : Restaurant;
  const item = await Model.findById(targetId);
  if (!item) return { error: "NOT_FOUND" };

  item.visibility = visibility;
  item.updatedAt = new Date();
  await item.save();

  await AuditLog.create({
    actorId: adminId,
    action: "set_visibility",
    targetType,
    targetId,
    reason: `Đổi visibility sang "${visibility}"`,
    metadata: { name: item.name },
  });

  return { error: null };
}
