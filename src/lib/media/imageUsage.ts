import type { Types } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { Announcement } from "@/lib/models/Announcement";
import { Food } from "@/lib/models/Food";
import { FoodReviewerApplication } from "@/lib/models/FoodReviewerApplication";
import { Restaurant } from "@/lib/models/Restaurant";
import { User } from "@/lib/models/User";
import { UserProfile } from "@/lib/models/UserProfile";
import { escapeRegExp } from "@/lib/vietnameseText";

/**
 * Lớp bảo vệ thứ hai trước khi xoá ảnh Cloudinary: public_id nào còn xuất hiện trong
 * DB thì KHÔNG được xoá (dù tag nói là `unattached`). So theo public_id ở cuối URL
 * (bỏ qua version `v123/` và đuôi file) để khớp mọi biến thể URL cùng 1 ảnh.
 *
 * Thêm field/collection lưu URL ảnh mới → phải thêm vào đây.
 */

function urlPattern(publicIds: string[]): RegExp {
  return new RegExp(`/(?:v\\d+/)?(${publicIds.map(escapeRegExp).join("|")})\\.[a-z0-9]+$`, "i");
}

/** `lookup`: public_id viết thường → public_id gốc (regex không phân biệt hoa thường để chắc ăn — thừa thì chỉ là không xoá). */
function collectMatches(values: unknown[], pattern: RegExp, lookup: Map<string, string>, into: Set<string>) {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const match = pattern.exec(value);
    const original = match && lookup.get(match[1].toLowerCase());
    if (original) into.add(original);
  }
}

/** Trả tập public_id (trong `publicIds`) còn được dùng ở đâu đó trong DB. */
export async function findUsedPublicIds(
  publicIds: string[],
  { excludeAnnouncementId }: { excludeAnnouncementId?: string | Types.ObjectId } = {},
): Promise<Set<string>> {
  const used = new Set<string>();
  if (publicIds.length === 0) return used;
  await connectDB();
  const pattern = urlPattern(publicIds);
  const lookup = new Map(publicIds.map((id) => [id.toLowerCase(), id]));
  const regexFilter = { $regex: pattern };

  const [foods, restaurants, users, profiles, applications, announcements] = await Promise.all([
    Food.find({ images: regexFilter }).select("images").lean(),
    Restaurant.find({ images: regexFilter }).select("images").lean(),
    User.find({ avatarUrl: regexFilter }).select("avatarUrl").lean(),
    UserProfile.find({ avatarUrl: regexFilter }).select("avatarUrl").lean(),
    FoodReviewerApplication.find({ portfolioImages: regexFilter }).select("portfolioImages").lean(),
    // content là Mixed (cây TipTap) — không query sâu được, đọc hết rồi dò chuỗi (số bài ít).
    Announcement.find(excludeAnnouncementId ? { _id: { $ne: excludeAnnouncementId } } : {}).select("content").lean(),
  ]);

  for (const doc of foods as { images?: unknown[] }[]) collectMatches(doc.images ?? [], pattern, lookup, used);
  for (const doc of restaurants as { images?: unknown[] }[]) collectMatches(doc.images ?? [], pattern, lookup, used);
  for (const doc of [...users, ...profiles] as { avatarUrl?: unknown }[]) collectMatches([doc.avatarUrl], pattern, lookup, used);
  for (const doc of applications as { portfolioImages?: unknown[] }[]) collectMatches(doc.portfolioImages ?? [], pattern, lookup, used);

  const contentPattern = new RegExp(pattern.source.replace(/\$$/, "(?=[\"?#])"), "gi");
  for (const doc of announcements as { content?: unknown }[]) {
    const text = JSON.stringify(doc.content ?? null);
    for (const match of text.matchAll(contentPattern)) {
      const original = lookup.get(match[1].toLowerCase());
      if (original) used.add(original);
    }
  }
  return used;
}
