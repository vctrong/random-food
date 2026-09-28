import { connectDB } from "@/lib/mongodb";
import { Restaurant } from "@/lib/models/Restaurant";

const MAX_MERGE_HOPS = 5;

/**
 * Quán trùng đã gộp (`mergedIntoRestaurantId`) → trả id quán gốc cuối cùng, để
 * mọi tham chiếu cũ (id quán còn nằm ở client, link cũ) tự trỏ sang quán gốc.
 */
export async function resolveMergedRestaurantId(restaurantId: string): Promise<string> {
  await connectDB();
  let current = restaurantId;
  for (let hop = 0; hop < MAX_MERGE_HOPS; hop++) {
    const doc = (await Restaurant.findById(current).select("mergedIntoRestaurantId").lean()) as {
      mergedIntoRestaurantId?: unknown;
    } | null;
    if (!doc?.mergedIntoRestaurantId) return current;
    current = String(doc.mergedIntoRestaurantId);
  }
  return current;
}
