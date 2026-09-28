import { isValidObjectId, Types } from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { Announcement } from "@/lib/models/Announcement";
import { AuditLog } from "@/lib/models/AuditLog";
import { User } from "@/lib/models/User";
import { UserProfile } from "@/lib/models/UserProfile";
import { getAnnouncementDisplayStatus, liveAnnouncementFilter } from "@/lib/announcementStatus";
import {
  buildAnnouncementCode,
  collectImageSources,
  estimateReadingMinutes,
  extractPlainText,
  sanitizeAnnouncementContent,
  type TipTapNode,
} from "@/lib/announcementContent";
import { renderAnnouncementHtml } from "@/lib/announcementRender";
import { markImagesAttached, parseOwnUploadUrl } from "@/lib/cloudinary";
import { slugifyVietnamese } from "@/lib/vietnameseText";
import {
  ANNOUNCEMENT_LIMITS,
  ANNOUNCEMENT_TARGET_ROLES,
  ANNOUNCEMENT_TYPES,
  BANNER_ANNOUNCEMENT_TYPES,
  RESERVED_ANNOUNCEMENT_SLUGS,
  type AnnouncementTargetRole,
  type AnnouncementType,
} from "@/constants/announcements";
import type {
  AdminAnnouncementDetail,
  AdminAnnouncementRow,
  AnnouncementDetail,
  AnnouncementHighlight,
  AnnouncementInput,
  AnnouncementSummary,
} from "@/types/announcement";

/**
 * Thông báo chính thức (docs/notifications.md mục 6). Phía user luôn lọc bằng
 * liveAnnouncementFilter (đang hiển thị + hợp role); phía Admin thấy mọi trạng
 * thái. Route gọi các hàm Admin phải kiểm requireAdminSession trước.
 */

interface AnnouncementLean {
  _id: Types.ObjectId;
  title: string;
  slug: string;
  summary: string;
  highlights?: AnnouncementHighlight[];
  content: TipTapNode;
  type: AnnouncementType;
  targetRoles?: AnnouncementTargetRole[];
  isPinned?: boolean;
  status: "draft" | "published";
  publishAt?: Date | null;
  expireAt?: Date | null;
  viewCount?: number;
  updatedAt?: Date;
  createdAt?: Date;
}

const SUMMARY_FIELDS = "title slug summary type isPinned publishAt";

function toSummary(doc: AnnouncementLean): AnnouncementSummary {
  const publishAt = doc.publishAt ?? doc.createdAt ?? new Date();
  return {
    id: String(doc._id),
    slug: doc.slug,
    title: doc.title,
    summary: doc.summary,
    type: doc.type,
    isPinned: Boolean(doc.isPinned),
    publishAt: publishAt.toISOString(),
    code: buildAnnouncementCode(doc.type, publishAt),
  };
}

function toDetail(doc: AnnouncementLean): AnnouncementDetail {
  return {
    ...toSummary(doc),
    highlights: doc.highlights ?? [],
    html: renderAnnouncementHtml(doc.content),
    readingMinutes: estimateReadingMinutes(extractPlainText(doc.content)),
  };
}

function toAdminRow(doc: AnnouncementLean): AdminAnnouncementRow {
  return {
    id: String(doc._id),
    slug: doc.slug,
    title: doc.title,
    type: doc.type,
    targetRoles: doc.targetRoles ?? ["all"],
    isPinned: Boolean(doc.isPinned),
    displayStatus: getAnnouncementDisplayStatus(doc),
    publishAt: doc.publishAt ? doc.publishAt.toISOString() : null,
    expireAt: doc.expireAt ? doc.expireAt.toISOString() : null,
    viewCount: doc.viewCount ?? 0,
    updatedAt: (doc.updatedAt ?? doc.createdAt ?? new Date()).toISOString(),
  };
}

/* ----------------------------- Phía người dùng ----------------------------- */

/** Danh sách đang hiển thị cho role (null = Guest) — ghim trước, mới trước. */
export async function listPublicAnnouncements(role: string | null, limit = 50): Promise<AnnouncementSummary[]> {
  await connectDB();
  const docs = (await Announcement.find(liveAnnouncementFilter(role))
    .sort({ isPinned: -1, publishAt: -1 })
    .limit(limit)
    .select(SUMMARY_FIELDS)
    .lean()) as unknown as AnnouncementLean[];
  return docs.map(toSummary);
}

export async function getPublicAnnouncement(slug: string, role: string | null): Promise<AnnouncementDetail | null> {
  await connectDB();
  const doc = (await Announcement.findOne({ ...liveAnnouncementFilter(role), slug: slug.toLowerCase() }).lean()) as AnnouncementLean | null;
  return doc ? toDetail(doc) : null;
}

/** Xem trước cho Admin — mọi trạng thái. */
export async function getAnnouncementPreview(slug: string): Promise<AnnouncementDetail | null> {
  await connectDB();
  const doc = (await Announcement.findOne({ slug: slug.toLowerCase() }).lean()) as AnnouncementLean | null;
  return doc ? toDetail(doc) : null;
}

export async function listOtherAnnouncements(role: string | null, excludeSlug: string, limit = 3): Promise<AnnouncementSummary[]> {
  await connectDB();
  const docs = (await Announcement.find({ ...liveAnnouncementFilter(role), slug: { $ne: excludeSlug } })
    .sort({ publishAt: -1 })
    .limit(limit)
    .select(SUMMARY_FIELDS)
    .lean()) as unknown as AnnouncementLean[];
  return docs.map(toSummary);
}

/** Banner trang chủ: bài quan trọng/bảo trì đang hiển thị mới nhất. */
export async function getBannerAnnouncement(role: string | null): Promise<AnnouncementSummary | null> {
  await connectDB();
  const doc = (await Announcement.findOne({ ...liveAnnouncementFilter(role), type: { $in: BANNER_ANNOUNCEMENT_TYPES } })
    .sort({ publishAt: -1 })
    .select(SUMMARY_FIELDS)
    .lean()) as AnnouncementLean | null;
  return doc ? toSummary(doc) : null;
}

export async function incrementAnnouncementView(slug: string, role: string | null): Promise<boolean> {
  await connectDB();
  const result = await Announcement.updateOne({ ...liveAnnouncementFilter(role), slug: slug.toLowerCase() }, { $inc: { viewCount: 1 } });
  return result.modifiedCount > 0;
}

interface ReadState {
  seenAt: Date;
  readIds: Types.ObjectId[];
}

/**
 * Trạng thái đọc thông báo chính thức của user: mốc "đọc hết" + các bài đọc lẻ.
 * Chưa có mốc thì lấy ngày tạo tài khoản để user mới không bị dồn bài cũ.
 */
async function getReadState(userId: string): Promise<ReadState> {
  const profile = (await UserProfile.findOne({ userId }).select("lastAnnouncementSeenAt readAnnouncementIds").lean()) as {
    lastAnnouncementSeenAt?: Date;
    readAnnouncementIds?: Types.ObjectId[];
  } | null;
  const readIds = profile?.readAnnouncementIds ?? [];
  if (profile?.lastAnnouncementSeenAt) return { seenAt: profile.lastAnnouncementSeenAt, readIds };
  const user = (await User.findById(userId).select("createdAt").lean()) as { createdAt?: Date } | null;
  return { seenAt: user?.createdAt ?? new Date(0), readIds };
}

function unseenFilter(role: string, { seenAt, readIds }: ReadState) {
  return {
    $and: [liveAnnouncementFilter(role), { publishAt: { $gt: seenAt } }, ...(readIds.length > 0 ? [{ _id: { $nin: readIds } }] : [])],
  };
}

export async function countUnseenAnnouncements(userId: string, role: string): Promise<number> {
  await connectDB();
  return Announcement.countDocuments(unseenFilter(role, await getReadState(userId)));
}

/** Bài chưa xem — hiện đầu dropdown chuông. */
export async function listUnseenAnnouncements(userId: string, role: string, limit = 5): Promise<AnnouncementSummary[]> {
  await connectDB();
  const docs = (await Announcement.find(unseenFilter(role, await getReadState(userId)))
    .sort({ publishAt: -1 })
    .limit(limit)
    .select(SUMMARY_FIELDS)
    .lean()) as unknown as AnnouncementLean[];
  return docs.map(toSummary);
}

/** Bấm/mở 1 bài → CHỈ bài đó là đã đọc (các bài khác giữ nguyên). */
export async function markAnnouncementRead(userId: string, announcementId: string): Promise<boolean> {
  if (!isValidObjectId(announcementId)) return false;
  await connectDB();
  if (!(await Announcement.exists({ _id: announcementId }))) return false;
  await UserProfile.updateOne(
    { userId },
    { $addToSet: { readAnnouncementIds: new Types.ObjectId(announcementId) }, $set: { updatedAt: new Date() } },
    { upsert: true },
  );
  return true;
}

/** "Đánh dấu đã đọc hết" — mốc lên hiện tại, danh sách đọc lẻ không còn cần nữa. */
export async function markAllAnnouncementsRead(userId: string): Promise<void> {
  await connectDB();
  const now = new Date();
  await UserProfile.updateOne(
    { userId },
    { $set: { lastAnnouncementSeenAt: now, readAnnouncementIds: [], updatedAt: now } },
    { upsert: true },
  );
}

/* --------------------------------- Phía Admin -------------------------------- */

const optionalDate = z
  .string()
  .datetime({ offset: true })
  .nullable()
  .optional()
  .transform((value) => (value ? new Date(value) : null));

const inputSchema = z
  .object({
    title: z.string().trim().min(5).max(ANNOUNCEMENT_LIMITS.titleMax),
    slug: z.string().trim().max(ANNOUNCEMENT_LIMITS.slugMax).optional(),
    summary: z.string().trim().min(10).max(ANNOUNCEMENT_LIMITS.summaryMax),
    highlights: z
      .array(
        z.object({
          label: z.string().trim().min(1).max(ANNOUNCEMENT_LIMITS.highlightLabelMax),
          value: z.string().trim().min(1).max(ANNOUNCEMENT_LIMITS.highlightValueMax),
          note: z.string().trim().max(ANNOUNCEMENT_LIMITS.highlightNoteMax).optional(),
        }),
      )
      .max(ANNOUNCEMENT_LIMITS.highlightsMax),
    content: z.unknown(),
    type: z.enum(ANNOUNCEMENT_TYPES),
    targetRoles: z.array(z.enum(ANNOUNCEMENT_TARGET_ROLES)).min(1).max(ANNOUNCEMENT_TARGET_ROLES.length),
    isPinned: z.boolean(),
    status: z.enum(["draft", "published"]),
    publishAt: optionalDate,
    expireAt: optionalDate,
  })
  .strict();

export type AnnouncementError =
  | "INVALID_INPUT"
  | "INVALID_CONTENT"
  | "INVALID_SLUG"
  | "SLUG_TAKEN"
  | "INVALID_SCHEDULE"
  | "NOT_FOUND";

interface NormalizedInput {
  title: string;
  slug: string;
  summary: string;
  highlights: AnnouncementHighlight[];
  content: TipTapNode;
  type: AnnouncementType;
  targetRoles: AnnouncementTargetRole[];
  isPinned: boolean;
  status: "draft" | "published";
  publishAt: Date | null;
  expireAt: Date | null;
  imageIds: string[];
}

function isOwnAnnouncementImage(src: string): boolean {
  return parseOwnUploadUrl(src, "announcement") !== null;
}

/** "Tất cả" đã gồm mọi role — lưu gọn thành ["all"]. */
function normalizeTargets(targets: AnnouncementTargetRole[]): AnnouncementTargetRole[] {
  const unique = [...new Set(targets)];
  return unique.includes("all") ? ["all"] : unique;
}

async function uniqueSlug(base: string, excludeId?: string): Promise<string | null> {
  const root = slugifyVietnamese(base).slice(0, ANNOUNCEMENT_LIMITS.slugMax).replace(/-+$/, "");
  if (!root || RESERVED_ANNOUNCEMENT_SLUGS.has(root)) return null;
  for (let attempt = 1; attempt <= 50; attempt += 1) {
    const candidate = attempt === 1 ? root : `${root}-${attempt}`;
    const clash = await Announcement.exists({ slug: candidate, ...(excludeId && { _id: { $ne: excludeId } }) });
    if (!clash) return candidate;
  }
  return null;
}

async function normalizeInput(
  raw: unknown,
  existing: AnnouncementLean | null,
): Promise<{ ok: true; data: NormalizedInput } | { ok: false; error: AnnouncementError }> {
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };
  const input = parsed.data;

  const content = sanitizeAnnouncementContent(input.content, isOwnAnnouncementImage);
  if (!content) return { ok: false, error: "INVALID_CONTENT" };

  // Slug tự gõ phải khớp định dạng; để trống thì sinh từ tiêu đề (giữ slug cũ khi sửa).
  const wantedSlug = input.slug?.trim() || existing?.slug || input.title;
  if (input.slug?.trim() && slugifyVietnamese(input.slug) !== input.slug.trim().toLowerCase()) {
    return { ok: false, error: "INVALID_SLUG" };
  }
  const slug = await uniqueSlug(wantedSlug, existing ? String(existing._id) : undefined);
  if (!slug) return { ok: false, error: "INVALID_SLUG" };
  if (input.slug?.trim() && slug !== input.slug.trim().toLowerCase()) return { ok: false, error: "SLUG_TAKEN" };

  let publishAt = input.publishAt;
  if (input.status === "published") {
    const wasPublished = existing?.status === "published";
    // "Đăng ngay" (không chọn giờ) → bây giờ; bài đang đăng thì giữ mốc cũ nếu form không đổi.
    if (!publishAt) publishAt = wasPublished && existing?.publishAt ? existing.publishAt : new Date();
    // Nháp chuyển sang đăng với mốc quá khứ → đăng từ bây giờ (tránh bài "mới" mà ngày đăng cũ).
    if (!wasPublished && publishAt.getTime() < Date.now()) publishAt = new Date();
  }
  if (input.expireAt && publishAt && input.expireAt.getTime() <= publishAt.getTime()) {
    return { ok: false, error: "INVALID_SCHEDULE" };
  }

  return {
    ok: true,
    data: {
      title: input.title,
      slug,
      summary: input.summary,
      highlights: input.highlights.map((item) => ({ label: item.label, value: item.value, ...(item.note && { note: item.note }) })),
      content,
      type: input.type,
      targetRoles: normalizeTargets(input.targetRoles),
      isPinned: input.isPinned,
      status: input.status,
      publishAt,
      expireAt: input.expireAt,
      imageIds: collectImageSources(content)
        .map((src) => parseOwnUploadUrl(src, "announcement"))
        .filter((id): id is string => id !== null),
    },
  };
}

async function audit(adminId: string, action: string, id: unknown, title: string, metadata: Record<string, unknown> = {}) {
  await AuditLog.create({ actorId: adminId, action, targetType: "announcement", targetId: id, reason: title, metadata });
}

export async function listAdminAnnouncements(): Promise<AdminAnnouncementRow[]> {
  await connectDB();
  const docs = (await Announcement.find({})
    .sort({ updatedAt: -1 })
    .select("-content -highlights -summary")
    .lean()) as unknown as AnnouncementLean[];
  return docs.map(toAdminRow);
}

export async function getAdminAnnouncement(id: string): Promise<AdminAnnouncementDetail | null> {
  if (!isValidObjectId(id)) return null;
  await connectDB();
  const doc = (await Announcement.findById(id).lean()) as AnnouncementLean | null;
  if (!doc) return null;
  return { ...toAdminRow(doc), summary: doc.summary, highlights: doc.highlights ?? [], content: doc.content, status: doc.status };
}

export async function createAnnouncement(
  adminId: string,
  raw: AnnouncementInput | unknown,
): Promise<{ error: AnnouncementError | null; id?: string; slug?: string }> {
  await connectDB();
  const normalized = await normalizeInput(raw, null);
  if (!normalized.ok) return { error: normalized.error };
  const { imageIds, ...data } = normalized.data;

  const doc = await Announcement.create({ ...data, createdBy: adminId, createdAt: new Date(), updatedAt: new Date() });
  try {
    await audit(adminId, "announcement_create", doc._id, data.title, { status: data.status, type: data.type });
    if (data.status === "published") {
      await audit(adminId, "announcement_publish", doc._id, data.title, { publishAt: data.publishAt?.toISOString() ?? null });
    }
  } catch (error) {
    // Mọi thao tác phải có nhật ký — không ghi được thì huỷ bài vừa tạo, tránh bài "mồ côi" đang hiển thị.
    await Announcement.deleteOne({ _id: doc._id });
    await AuditLog.deleteMany({ targetType: "announcement", targetId: doc._id });
    throw error;
  }
  await markImagesAttached(imageIds);
  return { error: null, id: String(doc._id), slug: data.slug };
}

export async function updateAnnouncement(
  adminId: string,
  id: string,
  raw: AnnouncementInput | unknown,
): Promise<{ error: AnnouncementError | null; slug?: string }> {
  if (!isValidObjectId(id)) return { error: "NOT_FOUND" };
  await connectDB();
  const existing = (await Announcement.findById(id).lean()) as AnnouncementLean | null;
  if (!existing) return { error: "NOT_FOUND" };

  const normalized = await normalizeInput(raw, existing);
  if (!normalized.ok) return { error: normalized.error };
  const { imageIds, expireAt, ...data } = normalized.data;

  // Không được $set và $unset cùng 1 field trong 1 lệnh.
  await Announcement.updateOne(
    { _id: id },
    expireAt
      ? { $set: { ...data, expireAt, updatedAt: new Date() } }
      : { $set: { ...data, updatedAt: new Date() }, $unset: { expireAt: "" } },
  );
  await audit(adminId, "announcement_update", id, data.title, { status: data.status });
  if (existing.status !== "published" && data.status === "published") {
    await audit(adminId, "announcement_publish", id, data.title, { publishAt: data.publishAt?.toISOString() ?? null });
  }
  await markImagesAttached(imageIds);
  return { error: null, slug: data.slug };
}

export async function deleteAnnouncement(adminId: string, id: string): Promise<{ error: "NOT_FOUND" | null }> {
  if (!isValidObjectId(id)) return { error: "NOT_FOUND" };
  await connectDB();
  const doc = (await Announcement.findByIdAndDelete(id).select("title").lean()) as { title?: string } | null;
  if (!doc) return { error: "NOT_FOUND" };
  await audit(adminId, "announcement_delete", id, doc.title ?? "");
  return { error: null };
}
