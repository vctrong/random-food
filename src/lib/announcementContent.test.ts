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

describe("gallery", () => {
  const img = (extra: Record<string, unknown> = {}) => ({ src: OWN_IMAGE, alt: "Món ngon", width: 1200, height: 800, ...extra });

  it("sanitize: chỉ giữ ảnh của app + alt/kích thước hợp lệ, bộ rỗng bị bỏ", () => {
    const cleaned = sanitizeAnnouncementContent(
      doc(
        { type: "paragraph", content: [{ type: "text", text: "Ảnh" }] },
        {
          type: "gallery",
          attrs: {
            onclick: "x",
            images: [img({ onerror: "x", width: -5, height: "800" }), { src: "https://evil.example/x.png" }, "rác"],
          },
        },
        { type: "gallery", attrs: { images: [{ src: "https://evil.example/x.png" }] } },
      ),
      isOwn,
    );
    expect(cleaned?.content?.[1]).toEqual({
      type: "gallery",
      attrs: { images: [{ src: OWN_IMAGE, alt: "Món ngon", width: null, height: null }] },
    });
    expect(cleaned?.content).toHaveLength(2);
    expect(cleaned && collectImageSources(cleaned)).toEqual([OWN_IMAGE]);
  });

  it("bài chỉ có bộ ảnh vẫn hợp lệ", () => {
    expect(sanitizeAnnouncementContent(doc({ type: "gallery", attrs: { images: [img()] } }), isOwn)).not.toBeNull();
  });

  it("render ảnh đơn: giữ tỉ lệ, có nền mờ, ảnh qua transform Cloudinary", () => {
    const html = renderAnnouncementHtml(doc({ type: "gallery", attrs: { images: [img()] } }) as never);
    expect(html).toContain('data-count="1"');
    expect(html).toContain("/image/upload/c_limit,w_1200,f_auto,q_auto/v1/nayangi/announcements/a.jpg");
    expect(html).toContain('width="1200"');
    expect(html).toContain("object-contain");
    expect(html).toContain("blur-2xl");
  });

  it("render 7 ảnh: 5 ô, ô cuối +2, data-images đủ 7 ảnh", () => {
    const images = Array.from({ length: 7 }, (_, index) => img({ alt: `Ảnh ${index + 1}` }));
    const html = renderAnnouncementHtml(doc({ type: "gallery", attrs: { images } }) as never);
    expect(html.match(/data-gallery-item=/g)).toHaveLength(5);
    expect(html).toContain("+2");
    expect(html).toContain("grid-cols-6");
    const json = /data-images="([^"]*)"/.exec(html)?.[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&");
    expect(JSON.parse(json ?? "[]")).toHaveLength(7);
  });

  it("ảnh trong suốt: chỉ giữ cờ transparent khi đúng true; ảnh đơn nền sáng, không có lớp ảnh mờ", () => {
    const cleaned = sanitizeAnnouncementContent(
      doc({ type: "gallery", attrs: { images: [img({ transparent: true }), img({ transparent: "yes" })] } }),
      isOwn,
    );
    const images = (cleaned?.content?.[0].attrs as { images: Record<string, unknown>[] }).images;
    expect(images[0].transparent).toBe(true);
    expect(images[1]).not.toHaveProperty("transparent");

    const single = renderAnnouncementHtml(doc({ type: "gallery", attrs: { images: [img({ transparent: true })] } }) as never);
    expect(single).not.toContain("blur-2xl");
    expect(single).toContain("dark:bg-text-primary");
    const opaque = renderAnnouncementHtml(doc({ type: "gallery", attrs: { images: [img()] } }) as never);
    expect(opaque).toContain("blur-2xl");
    expect(opaque).not.toContain("dark:bg-text-primary");
  });

  it("alt độc không thoát được khỏi attribute (dấu \" bị escape)", () => {
    const html = renderAnnouncementHtml(doc({ type: "gallery", attrs: { images: [img({ alt: '"><script>alert(1)</script>' })] } }) as never);
    expect(html).not.toMatch(/"><script/);
    expect(html).toContain('alt="&quot;><script>');
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
