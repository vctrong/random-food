/**
 * Nội dung HTML do TipTap render từ JSON đã sanitize (lib/announcementRender.ts) — dùng chung
 * cho trang chi tiết và trình soạn thảo Admin (xem gì được nấy). Style bằng arbitrary
 * variant để không phải thêm lớp CSS toàn cục.
 */
export const ANNOUNCEMENT_PROSE_CLASS =
  "text-[15px] leading-7 text-text-primary sm:text-base " +
  "[&_p]:mb-4 [&_p:last-child]:mb-0 " +
  "[&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:font-heading [&_h2]:text-xl [&_h2]:text-text-primary " +
  "[&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:font-heading [&_h3]:text-lg [&_h3]:text-text-primary " +
  "[&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-1.5 [&_li>p]:mb-0 " +
  "[&_a]:font-semibold [&_a]:text-primary-strong [&_a]:underline [&_a]:underline-offset-2 dark:[&_a]:text-primary " +
  "[&_strong]:font-bold [&_blockquote]:my-5 [&_blockquote]:rounded-r-xl [&_blockquote]:border-l-4 [&_blockquote]:border-primary " +
  "[&_blockquote]:bg-primary-soft/50 [&_blockquote]:px-4 [&_blockquote]:py-3 [&_blockquote]:text-text-primary " +
  "[&_hr]:my-8 [&_hr]:border-border [&_img]:my-5 [&_img]:h-auto [&_img]:w-full [&_img]:rounded-2xl [&_img]:border [&_img]:border-border";
