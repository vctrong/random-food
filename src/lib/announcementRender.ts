import { generateHTML } from "@tiptap/html/server";
import { announcementExtensions } from "@/lib/announcementEditor";
import type { TipTapNode } from "@/lib/announcementContent";

/**
 * Render nội dung Announcement (TipTap JSON đã sanitize lúc lưu) ra HTML ở server.
 * generateHTML chỉ dựng node/mark có trong schema của extension và escape text,
 * nên HTML trả về không chứa thẻ tuỳ ý từ người nhập.
 */
export function renderAnnouncementHtml(content: TipTapNode): string {
  try {
    return generateHTML(content as Parameters<typeof generateHTML>[0], announcementExtensions);
  } catch (error) {
    console.error("[announcement] render failed", error);
    return "";
  }
}
