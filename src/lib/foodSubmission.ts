import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { Food } from "@/lib/models/Food";
import { Restaurant } from "@/lib/models/Restaurant";
import { Category } from "@/lib/models/Category";
import { markImagesAttached, parseOwnUploadUrl, type UploadKind } from "@/lib/cloudinary";
import { findActiveCategoryByName, recordProposalForFood } from "@/lib/categoryProposals";
import { hitRateLimit } from "@/lib/rateLimit";
import { isEatingLevel } from "@/constants/categories";
import { FALLBACK_CATEGORY_SLUG, MAX_CATEGORIES_PER_FOOD } from "@/constants/categoryGroups";
import { MAX_FOOD_IMAGES, MAX_RESTAURANT_IMAGES } from "@/constants/limits";

/**
 * User đóng góp Food mới (UC-U10, BR-C01→C07). Ảnh đã được client upload thẳng
 * lên Cloudinary (lib/cloudinary.ts) — ở đây chỉ nhận URL, kiểm tra đúng cloud/
 * thư mục của app. Food + (nếu quán mới) Restaurant tạo ở trạng thái pending.
 */

const locationSchema = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) });

export const foodSubmissionSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional().default(""),
  priceMin: z.number().int().min(0).max(100_000_000),
  priceMax: z.number().int().min(0).max(100_000_000),
  eatingLevels: z.array(z.string()).min(1).max(4),
  categoryIds: z.array(z.string()).max(MAX_CATEGORIES_PER_FOOD),
  proposedCategoryName: z.string().trim().min(2).max(40).nullable().optional(),
  images: z.array(z.string().url()).min(1).max(MAX_FOOD_IMAGES),
  restaurant: z.discriminatedUnion("mode", [
    z.object({ mode: z.literal("existing"), id: z.string() }),
    z.object({
      mode: z.literal("new"),
      name: z.string().trim().min(1).max(120),
      address: z.string().trim().min(1).max(300),
      location: locationSchema.nullable(),
      locationSource: z.enum(["gps", "pin_confirmed", "geocoded", "none"]),
      images: z.array(z.string().url()).max(MAX_RESTAURANT_IMAGES),
    }),
  ]),
});

export type FoodSubmission = z.infer<typeof foodSubmissionSchema>;

export type FoodSubmissionError =
  | "RATE_LIMITED"
  | "INVALID_PRICE"
  | "INVALID_EATING_LEVEL"
  | "INVALID_CATEGORY"
  | "TOO_MANY_CATEGORIES"
  | "INVALID_IMAGES"
  | "INVALID_RESTAURANT"
  | "INVALID_LOCATION";

const SUBMISSIONS_PER_HOUR = 15;

function collectPublicIds(urls: string[], kind: UploadKind): string[] | null {
  const ids = urls.map((url) => parseOwnUploadUrl(url, kind));
  return ids.every((id): id is string => Boolean(id)) ? ids : null;
}

/**
 * Luật danh mục dùng chung cho tạo mới và sửa đóng góp: danh mục phải đang
 * hoạt động, không tự chọn "Khác" (trừ khi món đã sẵn ở đó — `allowedFallback`),
 * tổng (danh mục + đề xuất) từ 1 đến 3.
 */
export async function validateFoodCategories(
  categoryIds: string[],
  proposalCount: number,
  allowedFallback = false,
): Promise<"INVALID_CATEGORY" | "TOO_MANY_CATEGORIES" | null> {
  const unique = [...new Set(categoryIds)];
  if (unique.length + proposalCount === 0) return "INVALID_CATEGORY";
  if (unique.length + proposalCount > MAX_CATEGORIES_PER_FOOD) return "TOO_MANY_CATEGORIES";
  if (unique.some((id) => !isValidObjectId(id))) return "INVALID_CATEGORY";
  if (unique.length === 0) return null;

  await connectDB();
  const categories = (await Category.find({ _id: { $in: unique }, isActive: true }).select("slug").lean()) as unknown as {
    slug: string;
  }[];
  if (categories.length !== unique.length) return "INVALID_CATEGORY";
  if (!allowedFallback && categories.some((category) => category.slug === FALLBACK_CATEGORY_SLUG)) return "INVALID_CATEGORY";
  return null;
}

export async function submitFood(
  userId: string,
  input: FoodSubmission,
): Promise<{ error: FoodSubmissionError; id?: undefined } | { error: null; id: string }> {
  if (input.priceMax < input.priceMin) return { error: "INVALID_PRICE" };
  if (input.eatingLevels.some((level) => !isEatingLevel(level))) return { error: "INVALID_EATING_LEVEL" };

  const foodImageIds = collectPublicIds(input.images, "food");
  if (!foodImageIds) return { error: "INVALID_IMAGES" };

  await connectDB();

  // Tên đề xuất trùng danh mục có sẵn → dùng luôn danh mục đó, không tạo proposal.
  let categoryIds = [...new Set(input.categoryIds)];
  let proposalName = input.proposedCategoryName?.trim() || null;
  if (proposalName) {
    const existingId = await findActiveCategoryByName(proposalName);
    if (existingId) {
      categoryIds = [...new Set([...categoryIds, existingId])];
      proposalName = null;
    }
  }
  const categoryError = await validateFoodCategories(categoryIds, proposalName ? 1 : 0);
  if (categoryError) return { error: categoryError };

  let restaurantImageIds: string[] = [];
  if (input.restaurant.mode === "existing") {
    if (!isValidObjectId(input.restaurant.id)) return { error: "INVALID_RESTAURANT" };
    const exists = await Restaurant.exists({
      _id: input.restaurant.id,
      moderationStatus: "approved",
      visibility: "visible",
      businessStatus: { $ne: "closed" },
    });
    if (!exists) return { error: "INVALID_RESTAURANT" };
  } else {
    const { location, locationSource } = input.restaurant;
    // Có toạ độ ⇔ nguồn khác "none" (CLAUDE.md 7.3).
    if (Boolean(location) === (locationSource === "none")) return { error: "INVALID_LOCATION" };
    const ids = collectPublicIds(input.restaurant.images, "restaurant");
    if (!ids) return { error: "INVALID_IMAGES" };
    restaurantImageIds = ids;
  }

  const limit = await hitRateLimit(`food:submit:user:${userId}`, SUBMISSIONS_PER_HOUR, 60 * 60 * 1000);
  if (!limit.allowed) return { error: "RATE_LIMITED" };

  let restaurantId: string;
  if (input.restaurant.mode === "existing") {
    restaurantId = input.restaurant.id;
  } else {
    const { name, address, location, locationSource, images } = input.restaurant;
    const restaurant = await Restaurant.create({
      name,
      address,
      ...(location ? { location: { type: "Point", coordinates: [location.lng, location.lat] } } : {}),
      locationSource,
      images,
      moderationStatus: "pending",
      visibility: "visible",
      createdBy: userId,
    });
    restaurantId = String(restaurant._id);
  }

  const food = await Food.create({
    restaurantId,
    name: input.name,
    description: input.description,
    categoryIds,
    eatingLevels: input.eatingLevels,
    images: input.images,
    priceRange: { min: input.priceMin, max: input.priceMax },
    moderationStatus: "pending",
    visibility: "visible",
    createdBy: userId,
  });

  if (proposalName) {
    const proposalId = await recordProposalForFood({ name: proposalName, userId, foodId: String(food._id) });
    await Food.updateOne({ _id: food._id }, { $set: { proposedCategoryId: proposalId } });
  }

  await markImagesAttached([...foodImageIds, ...restaurantImageIds]);
  return { error: null, id: String(food._id) };
}
