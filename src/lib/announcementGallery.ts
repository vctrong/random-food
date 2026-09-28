import { Node } from "@tiptap/core";
import type { DOMOutputSpec } from "@tiptap/pm/model";
import {
  cloudinarySrcSet,
  cloudinaryTiny,
  cloudinaryWidth,
} from "@/lib/media/cloudinaryUrl";
import {
  GALLERY_CELL_WIDTHS,
  GALLERY_CLASSES,
  GALLERY_FULL_WIDTH,
  GALLERY_SINGLE_WIDTHS,
  GALLERY_VISIBLE_MAX,
  galleryLayout,
  gallerySizes,
  parseGalleryImagesAttr,
  type GalleryImage,
} from "@/lib/media/galleryLayout";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    gallery: {
      /** Chèn bộ ảnh mới tại con trỏ. */
      insertGallery: (images: GalleryImage[]) => ReturnType;
    };
  }
}

function sizeAttrs(image: GalleryImage) {
  return image.width && image.height ? { width: String(image.width), height: String(image.height) } : {};
}

function renderSingle(image: GalleryImage): DOMOutputSpec {
  // Ảnh trong suốt: nền sáng, KHÔNG có lớp ảnh mờ phía sau (sẽ lộ qua vùng trong suốt).
  const backdrop: DOMOutputSpec[] = image.transparent
    ? []
    : [["img", { src: cloudinaryTiny(image.src), alt: "", "aria-hidden": "true", loading: "lazy", decoding: "async", class: GALLERY_CLASSES.singleBackdrop }]];
  return [
    "a",
    {
      href: cloudinaryWidth(image.src, GALLERY_FULL_WIDTH),
      "data-gallery-item": "0",
      "aria-label": image.alt ? `Xem ảnh lớn: ${image.alt}` : "Xem ảnh lớn",
      class: image.transparent ? `${GALLERY_CLASSES.singleFrame} ${GALLERY_CLASSES.transparentBackdrop}` : GALLERY_CLASSES.singleFrame,
    },
    ...backdrop,
    [
      "img",
      {
        src: cloudinaryWidth(image.src, 1200),
        srcset: cloudinarySrcSet(image.src, GALLERY_SINGLE_WIDTHS),
        sizes: gallerySizes(1),
        alt: image.alt ?? "",
        ...sizeAttrs(image),
        loading: "lazy",
        decoding: "async",
        class: GALLERY_CLASSES.singleImage,
      },
    ],
  ];
}

function renderGrid(images: GalleryImage[]): DOMOutputSpec {
  const layout = galleryLayout(images.length);
  const cells = images.slice(0, GALLERY_VISIBLE_MAX).map((image, index): DOMOutputSpec => {
    const isMoreCell = layout.hiddenCount > 0 && index === GALLERY_VISIBLE_MAX - 1;
    const label = isMoreCell ? `Xem thêm ${layout.hiddenCount} ảnh` : image.alt ? `Xem ảnh lớn: ${image.alt}` : `Xem ảnh ${index + 1}`;
    return [
      "a",
      {
        href: cloudinaryWidth(image.src, GALLERY_FULL_WIDTH),
        "data-gallery-item": String(index),
        "aria-label": label,
        class: [GALLERY_CLASSES.cell, layout.cellClasses[index], image.transparent && GALLERY_CLASSES.transparentBackdrop].filter(Boolean).join(" "),
      },
      [
        "img",
        {
          src: cloudinaryWidth(image.src, 800),
          srcset: cloudinarySrcSet(image.src, GALLERY_CELL_WIDTHS),
          sizes: gallerySizes(layout.cellFractions[index]),
          alt: isMoreCell ? "" : (image.alt ?? ""),
          loading: "lazy",
          decoding: "async",
          class: GALLERY_CLASSES.cellImage,
        },
      ],
      ...(isMoreCell ? [["span", { class: GALLERY_CLASSES.more, "aria-hidden": "true" }, `+${layout.hiddenCount}`] as DOMOutputSpec] : []),
    ];
  });
  return ["div", { class: `${GALLERY_CLASSES.grid} ${layout.gridClass}` }, ...cells];
}

/**
 * Bộ ảnh trong thông báo — 1 node cho mọi số lượng ảnh (1 ảnh = khung ảnh đơn giữ
 * tỉ lệ gốc; 2–5+ ảnh = lưới kiểu Facebook). Dùng chung editor (client) và render
 * HTML (server). Bấm ảnh mở lightbox (components/announcements/AnnouncementLightbox.tsx)
 * đọc danh sách đầy đủ từ `data-images`.
 */
export const Gallery = Node.create({
  name: "gallery",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      images: {
        default: [],
        parseHTML: (element) => parseGalleryImagesAttr(element.getAttribute("data-images")),
        // Render thủ công trong renderHTML bên dưới.
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [{ tag: "figure[data-gallery]" }];
  },

  renderHTML({ node }) {
    const images = (node.attrs.images ?? []) as GalleryImage[];
    return [
      "figure",
      {
        "data-gallery": "",
        "data-count": String(images.length),
        "data-images": JSON.stringify(images),
        class: GALLERY_CLASSES.figure,
      },
      images.length === 1 ? renderSingle(images[0]) : renderGrid(images),
    ];
  },

  addCommands() {
    return {
      insertGallery:
        (images) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { images } }),
    };
  },
});
