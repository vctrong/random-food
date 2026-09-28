import { describe, expect, it } from "vitest";
import {
  buildAnnouncementCode,
  collectImageSources,
  diffRemovedImages,
  estimateReadingMinutes,
  isSafeLinkHref,
  sanitizeAnnouncementContent,
} from "./announcementContent";
import { renderAnnouncementHtml } from "./announcementRender";

const OWN_IMAGE = "https://res.cloudinary.com/demo/image/upload/v1/nayangi/announcements/a.jpg";
const isOwn = (src: string) => src === OWN_IMAGE;

function doc(...content: unknown[]) {
  return { type: "doc", content };
}

describe("sanitizeAnnouncementContent", () => {
  it("bỏ node lạ, attr lạ và link nguy hiểm", () => {
    const cleaned = sanitizeAnnouncementContent(
      doc(
        { type: "paragraph", attrs: { onclick: "x" }, content: [
          { type: "text", text: "Xin chào", marks: [{ type: "bold" }, { type: "link", attrs: { href: "javascript:alert(1)" } }] },
        ] },
        { type: "script", content: [{ type: "text", text: "alert(1)" }] },
        { type: "codeBlock", content: [{ type: "text", text: "x" }] },
      ),
      isOwn,
    );
    expect(cleaned).toEqual(doc({ type: "paragraph", content: [{ type: "text", text: "Xin chào", marks: [{ type: "bold" }] }] }));
  });

  it("chỉ giữ ảnh tải lên từ Cloudinary của app", () => {
    const cleaned = sanitizeAnnouncementContent(
      doc(
        { type: "paragraph", content: [{ type: "text", text: "Ảnh" }] },
        { type: "image", attrs: { src: OWN_IMAGE, alt: "ok", onerror: "x" } },
        { type: "image", attrs: { src: "https://evil.example/x.png" } },
      ),
      isOwn,
    );
    expect(cleaned && collectImageSources(cleaned)).toEqual([OWN_IMAGE]);
  });

  it("nội dung rỗng / sai gốc → null", () => {
    expect(sanitizeAnnouncementContent(doc({ type: "paragraph" }), isOwn)).toBeNull();
    expect(sanitizeAnnouncementContent({ type: "paragraph" }, isOwn)).toBeNull();
    expect(sanitizeAnnouncementContent("<p>hi</p>", isOwn)).toBeNull();
  });

  it("render ra HTML không chứa thẻ tuỳ ý, text được escape", () => {
    const cleaned = sanitizeAnnouncementContent(
      doc({ type: "heading", attrs: { level: 9 }, content: [{ type: "text", text: "<img src=x onerror=alert(1)>" }] }),
      isOwn,
    );
    const html = renderAnnouncementHtml(cleaned!);
    expect(html).toContain("<h2>");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });
});

describe("helpers", () => {
  it("isSafeLinkHref", () => {
    expect(isSafeLinkHref("https://nayangi.io.vn")).toBe(true);
    expect(isSafeLinkHref("/tin-tuc")).toBe(true);
    expect(isSafeLinkHref("mailto:a@b.vn")).toBe(true);
    expect(isSafeLinkHref("//evil.com")).toBe(false);
    expect(isSafeLinkHref("javascript:alert(1)")).toBe(false);
  });

  it("mã bài theo tháng giờ VN", () => {
    // 30/09 18:00 UTC = 01:00 ngày 01/10 giờ VN.
    expect(buildAnnouncementCode("maintenance", new Date("2026-09-30T18:00:00Z"))).toBe("TB-2026/10-SYS");
  });

  it("diffRemovedImages: chỉ ảnh cũ không còn trong bản mới, bỏ trùng", () => {
    expect(diffRemovedImages(["a", "b", "b", "c"], ["c", "d"])).toEqual(["a", "b"]);
    expect(diffRemovedImages([], ["a"])).toEqual([]);
  });

  it("thời gian đọc tối thiểu 1 phút", () => {
    expect(estimateReadingMinutes("vài chữ")).toBe(1);
    expect(estimateReadingMinutes(Array(600).fill("chữ").join(" "))).toBe(3);
  });
});
