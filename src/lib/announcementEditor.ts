import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";

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
  Image.configure({ HTMLAttributes: { loading: "lazy" } }),
];
