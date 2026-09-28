import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Gallery } from "@/lib/announcementGallery";

/**
 * Bộ extension TipTap DÙNG CHUNG cho trình soạn thảo (client) và render HTML
 * (server) — hai bên phải khớp, nếu không node lạ sẽ bị bỏ khi render.
 * Chỉ các node/mark ở đây mới được lưu (xem sanitizeAnnouncementContent).
 */
export const announcementExtensions = [
  StarterKit.configure({
    heading: { levels: [2, 3] },
    code: false,
    codeBlock: false,
    link: {
      openOnClick: false,
      autolink: true,
      defaultProtocol: "https",
      protocols: ["https", "http", "mailto"],
      HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
    },
  }),
  // Ảnh lẻ kiểu cũ — chỉ còn để hiển thị/sửa bài cũ; ảnh mới luôn chèn qua bộ ảnh (Gallery).
  Image.configure({ HTMLAttributes: { loading: "lazy" } }),
  Gallery,
];
