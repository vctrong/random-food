import { ANNOUNCEMENT_CODE_SUFFIX, ANNOUNCEMENT_LIMITS, type AnnouncementType } from "@/constants/announcements";

/**
 * Hàm thuần xử lý nội dung TipTap JSON của Announcement: làm sạch (whitelist
 * node/mark/attr — không tin JSON client gửi lên), trích text, ước lượng thời gian
 * đọc, sinh mã bài. Render HTML nằm ở lib/announcementRender.ts (server).
 */

export interface TipTapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TipTapNode[];
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  text?: string;
}

const BLOCK_NODES = new Set(["paragraph", "heading", "bulletList", "orderedList", "listItem", "blockquote", "horizontalRule", "image"]);
const INLINE_NODES = new Set(["text", "hardBreak"]);
const SIMPLE_MARKS = new Set(["bold", "italic", "underline", "strike"]);
const MAX_DEPTH = 12;

export function isSafeLinkHref(href: unknown): href is string {
  if (typeof href !== "string" || href.length > 2048) return false;
  if (href.startsWith("/") && !href.startsWith("//")) return true;
  try {
    const url = new URL(href);
    return url.protocol === "https:" || url.protocol === "http:" || url.protocol === "mailto:";
  } catch {
    return false;
  }
}

function cleanMarks(marks: unknown): TipTapNode["marks"] {
  if (!Array.isArray(marks)) return undefined;
  const cleaned: NonNullable<TipTapNode["marks"]> = [];
  for (const mark of marks) {
    if (!mark || typeof mark !== "object") continue;
    const type = (mark as { type?: unknown }).type;
    if (typeof type !== "string") continue;
    if (SIMPLE_MARKS.has(type)) cleaned.push({ type });
    if (type === "link") {
      const href = (mark as { attrs?: { href?: unknown } }).attrs?.href;
      if (isSafeLinkHref(href)) cleaned.push({ type: "link", attrs: { href } });
    }
  }
  return cleaned.length > 0 ? cleaned : undefined;
}

function cleanNode(raw: unknown, isImageAllowed: (src: string) => boolean, depth: number): TipTapNode | null {
  if (!raw || typeof raw !== "object" || depth > MAX_DEPTH) return null;
  const node = raw as Partial<TipTapNode> & { attrs?: Record<string, unknown> };
  const type = node.type;
  if (typeof type !== "string" || !(BLOCK_NODES.has(type) || INLINE_NODES.has(type))) return null;

  if (type === "text") {
    if (typeof node.text !== "string" || node.text.length === 0) return null;
    const marks = cleanMarks(node.marks);
    return { type, text: node.text, ...(marks && { marks }) };
  }
  if (type === "hardBreak" || type === "horizontalRule") return { type };
  if (type === "image") {
    const src = node.attrs?.src;
    if (typeof src !== "string" || !isImageAllowed(src)) return null;
    const alt = typeof node.attrs?.alt === "string" ? node.attrs.alt.slice(0, 200) : null;
    return { type, attrs: { src, alt } };
  }

  const children = Array.isArray(node.content)
    ? node.content.map((child) => cleanNode(child, isImageAllowed, depth + 1)).filter((child): child is TipTapNode => child !== null)
    : [];
  const attrs: Record<string, unknown> = {};
  if (type === "heading") attrs.level = node.attrs?.level === 3 ? 3 : 2;
  if (type === "orderedList") {
    const start = Number(node.attrs?.start);
    attrs.start = Number.isInteger(start) && start > 0 && start < 10_000 ? start : 1;
  }
  return { type, ...(Object.keys(attrs).length > 0 && { attrs }), ...(children.length > 0 && { content: children }) };
}

/** null = nội dung không hợp lệ / rỗng / quá lớn. */
export function sanitizeAnnouncementContent(raw: unknown, isImageAllowed: (src: string) => boolean): TipTapNode | null {
  if (!raw || typeof raw !== "object" || (raw as { type?: unknown }).type !== "doc") return null;
  if (JSON.stringify(raw).length > ANNOUNCEMENT_LIMITS.contentMaxChars) return null;
  const blocks = Array.isArray((raw as TipTapNode).content) ? (raw as TipTapNode).content! : [];
  const content = blocks.map((block) => cleanNode(block, isImageAllowed, 1)).filter((block): block is TipTapNode => block !== null);
  const doc: TipTapNode = { type: "doc", content };
  return extractPlainText(doc).trim().length > 0 || content.some((block) => block.type === "image") ? doc : null;
}

export function extractPlainText(node: TipTapNode): string {
  if (node.type === "text") return node.text ?? "";
  const separator = node.type === "doc" || node.type === "bulletList" || node.type === "orderedList" ? "\n" : " ";
  return (node.content ?? []).map(extractPlainText).join(separator);
}

/** Mọi URL ảnh trong nội dung — để gỡ tag `unattached` trên Cloudinary sau khi lưu. */
export function collectImageSources(node: TipTapNode): string[] {
  const own = node.type === "image" && typeof node.attrs?.src === "string" ? [node.attrs.src] : [];
  return [...own, ...(node.content ?? []).flatMap(collectImageSources)];
}

/** ~200 từ/phút, tối thiểu 1 phút. */
export function estimateReadingMinutes(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Mã bài dạng TB-2026/09-SYS theo tháng đăng (giờ VN) — tự sinh, không lưu DB. */
export function buildAnnouncementCode(type: AnnouncementType, publishAt: Date): string {
  const vn = new Date(publishAt.getTime() + 7 * 60 * 60 * 1000);
  const month = String(vn.getUTCMonth() + 1).padStart(2, "0");
  return `TB-${vn.getUTCFullYear()}/${month}-${ANNOUNCEMENT_CODE_SUFFIX[type]}`;
}
