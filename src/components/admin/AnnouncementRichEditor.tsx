"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { EditorContent, useEditor, type Editor, type JSONContent } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
import {
  Bold,
  Heading2,
  Heading3,
  Images,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
  Unlink,
} from "lucide-react";
import { announcementExtensions } from "@/lib/announcementEditor";
import { isSafeLinkHref } from "@/lib/announcementContent";
import { discardAnnouncementImage } from "@/services/announcementService";
import { useToast } from "@/components/ui/ToastProvider";
import { GalleryManagerModal, type GalleryModalResult } from "@/components/admin/GalleryManagerModal";
import type { GalleryImage } from "@/lib/media/galleryLayout";
import { ANNOUNCEMENT_PROSE_CLASS } from "@/components/announcements/announcementProse";
import { cn } from "@/lib/utils";

interface AnnouncementRichEditorProps {
  initialContent: JSONContent | null;
  onChange: (content: JSONContent) => void;
  labelledBy: string;
  /** URL ảnh có trong bản đã lưu — ảnh này KHÔNG được xoá ngay khi bỏ khỏi editor (lưu bài mới xử lý). */
  savedImageSrcs: ReadonlySet<string>;
  /** Báo các URL vừa bị xoá thật khỏi Cloudinary (để chặn lưu nếu Hoàn tác đưa chúng trở lại). */
  onImagesDiscarded: (srcs: string[]) => void;
}

interface GalleryModalState {
  mode: "insert" | "edit";
  /** Vị trí node gallery đang sửa (chế độ edit). */
  pos: number | null;
  images: GalleryImage[];
  otherImageSrcs: string[];
  /** Đổi mỗi lần mở để modal khởi tạo lại trạng thái. */
  openId: number;
}

/** Mọi URL ảnh trong doc (ảnh lẻ cũ + bộ ảnh), bỏ qua node tại `skipPos`. */
function imageSrcsInDoc(editor: Editor, skipPos: number | null = null): string[] {
  const srcs: string[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (pos === skipPos) return false;
    if (node.type.name === "image" && typeof node.attrs.src === "string") srcs.push(node.attrs.src);
    if (node.type.name === "gallery") srcs.push(...((node.attrs.images ?? []) as GalleryImage[]).map((image) => image.src));
    return true;
  });
  return srcs;
}

/** Trình soạn thảo nội dung thông báo chính thức — chỉ các định dạng có trong announcementExtensions. */
export function AnnouncementRichEditor({
  initialContent,
  onChange,
  labelledBy,
  savedImageSrcs,
  onImagesDiscarded,
}: AnnouncementRichEditorProps) {
  const [galleryModal, setGalleryModal] = useState<GalleryModalState | null>(null);
  // editorProps được tạo 1 lần lúc khởi tạo editor → gọi qua ref để luôn dùng hàm mới nhất.
  const openGalleryRef = useRef<(pos: number | null, images: GalleryImage[]) => void>(() => {});

  const editor = useEditor({
    extensions: announcementExtensions,
    content: initialContent ?? "",
    // Next.js SSR: không render editor ở server để tránh lệch hydrate.
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: {
        class: cn(
          ANNOUNCEMENT_PROSE_CLASS,
          "min-h-[320px] px-4 py-4 focus:outline-none",
          // Bộ ảnh trong editor: bấm để sửa, khi được chọn có viền nhấn.
          "[&_figure[data-gallery]]:cursor-pointer [&_figure[data-gallery]_a]:cursor-pointer",
          "[&_figure.ProseMirror-selectednode]:rounded-2xl [&_figure.ProseMirror-selectednode]:ring-4 [&_figure.ProseMirror-selectednode]:ring-primary/40",
        ),
        "aria-labelledby": labelledBy,
        "aria-multiline": "true",
        role: "textbox",
      },
      handleDOMEvents: {
        // Bấm bộ ảnh trong bài → mở modal sửa (không đi theo link ảnh). Node atom có
        // DOM contenteditable=false nên bắt click trực tiếp rồi dò vị trí node.
        click: (view, event) => {
          const figure = event.target instanceof Element ? event.target.closest("figure[data-gallery]") : null;
          if (!figure || !view.dom.contains(figure)) return false;
          event.preventDefault();
          const domPos = view.posAtDOM(figure, 0);
          const pos = [domPos, domPos - 1].find((candidate) => view.state.doc.nodeAt(candidate)?.type.name === "gallery");
          if (pos === undefined) return true;
          openGalleryRef.current(pos, (view.state.doc.nodeAt(pos)?.attrs.images ?? []) as GalleryImage[]);
          return true;
        },
      },
      // Chọn bộ ảnh bằng bàn phím rồi Enter → mở modal sửa.
      handleKeyDown: (view, event) => {
        const { selection } = view.state;
        if (event.key !== "Enter" || !(selection instanceof NodeSelection) || selection.node.type.name !== "gallery") return false;
        openGalleryRef.current(selection.from, (selection.node.attrs.images ?? []) as GalleryImage[]);
        return true;
      },
    },
    onUpdate: ({ editor: current }) => onChange(current.getJSON()),
  });

  function openGallery(pos: number | null, images: GalleryImage[]) {
    if (!editor) return;
    setGalleryModal({
      mode: pos === null ? "insert" : "edit",
      pos,
      images,
      otherImageSrcs: imageSrcsInDoc(editor, pos),
      openId: Date.now(),
    });
  }
  useEffect(() => {
    openGalleryRef.current = openGallery;
  });

  /** Ảnh bị bỏ mà chưa từng nằm trong bản đã lưu và không còn trong bài → xoá khỏi Cloudinary ngay. */
  function discardUnsaved(srcs: string[]) {
    if (!editor || srcs.length === 0) return;
    const inDoc = new Set(imageSrcsInDoc(editor));
    const toDiscard = [...new Set(srcs)].filter((src) => !savedImageSrcs.has(src) && !inDoc.has(src));
    if (toDiscard.length === 0) return;
    onImagesDiscarded(toDiscard);
    // Không chặn UI; xoá hụt thì ảnh vẫn mang tag `unattached` → cron dọn sau.
    toDiscard.forEach((src) => void discardAnnouncementImage(src));
  }

  function applyGallery({ images, droppedSrcs }: GalleryModalResult) {
    const state = galleryModal;
    setGalleryModal(null);
    if (!editor || !state) return;
    if (state.pos === null) {
      if (images.length > 0) editor.chain().focus().insertGallery(images).run();
    } else {
      const pos = state.pos;
      const node = editor.state.doc.nodeAt(pos);
      if (node?.type.name === "gallery") {
        editor
          .chain()
          .focus()
          .command(({ tr }) => {
            if (images.length === 0) tr.delete(pos, pos + node.nodeSize);
            else tr.setNodeMarkup(pos, undefined, { ...node.attrs, images });
            return true;
          })
          .run();
      }
    }
    discardUnsaved(droppedSrcs);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15">
      {editor ? (
        <Toolbar editor={editor} onOpenGallery={() => openGallery(null, [])} />
      ) : (
        <div className="h-11 border-b border-border bg-background" />
      )}
      <EditorContent editor={editor} />
      {galleryModal && (
        <GalleryManagerModal
          key={galleryModal.openId}
          mode={galleryModal.mode}
          initialImages={galleryModal.images}
          otherImageSrcs={galleryModal.otherImageSrcs}
          onApply={applyGallery}
          onCancel={(uploadedSrcs) => {
            setGalleryModal(null);
            discardUnsaved(uploadedSrcs);
          }}
        />
      )}
    </div>
  );
}

function ToolButton({
  label,
  isActive = false,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  isActive?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={isActive}
      title={label}
      className={cn(
        "grid size-8 place-items-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40",
        isActive ? "bg-primary-strong text-white" : "text-text-secondary hover:bg-primary-soft hover:text-text-primary",
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span aria-hidden className="mx-1 h-5 w-px bg-border" />;
}

function Toolbar({ editor, onOpenGallery }: { editor: Editor; onOpenGallery: () => void }) {
  const { showToast } = useToast();
  const [linkDraft, setLinkDraft] = useState<string | null>(null);
  const chain = () => editor.chain().focus();

  function openLinkInput() {
    const current = editor.getAttributes("link").href as string | undefined;
    setLinkDraft(current ?? "https://");
  }

  function applyLink() {
    const href = (linkDraft ?? "").trim();
    if (!href || href === "https://") {
      chain().extendMarkRange("link").unsetLink().run();
    } else if (!isSafeLinkHref(href)) {
      showToast("Link phải bắt đầu bằng https://, http://, mailto: hoặc / (trang trong app).", "warning");
      return;
    } else {
      chain().extendMarkRange("link").setLink({ href }).run();
    }
    setLinkDraft(null);
  }

  return (
    <div className="border-b border-border bg-background">
      <div role="toolbar" aria-label="Định dạng nội dung" className="flex flex-wrap items-center gap-0.5 px-2 py-1.5">
        <ToolButton label="Tiêu đề lớn" isActive={editor.isActive("heading", { level: 2 })} onClick={() => chain().toggleHeading({ level: 2 }).run()}>
          <Heading2 className="size-4" aria-hidden />
        </ToolButton>
        <ToolButton label="Tiêu đề nhỏ" isActive={editor.isActive("heading", { level: 3 })} onClick={() => chain().toggleHeading({ level: 3 }).run()}>
          <Heading3 className="size-4" aria-hidden />
        </ToolButton>
        <Divider />
        <ToolButton label="In đậm" isActive={editor.isActive("bold")} onClick={() => chain().toggleBold().run()}>
          <Bold className="size-4" aria-hidden />
        </ToolButton>
        <ToolButton label="In nghiêng" isActive={editor.isActive("italic")} onClick={() => chain().toggleItalic().run()}>
          <Italic className="size-4" aria-hidden />
        </ToolButton>
        <ToolButton label="Gạch chân" isActive={editor.isActive("underline")} onClick={() => chain().toggleUnderline().run()}>
          <Underline className="size-4" aria-hidden />
        </ToolButton>
        <ToolButton label="Gạch ngang" isActive={editor.isActive("strike")} onClick={() => chain().toggleStrike().run()}>
          <Strikethrough className="size-4" aria-hidden />
        </ToolButton>
        <Divider />
        <ToolButton label="Danh sách chấm" isActive={editor.isActive("bulletList")} onClick={() => chain().toggleBulletList().run()}>
          <List className="size-4" aria-hidden />
        </ToolButton>
        <ToolButton label="Danh sách số" isActive={editor.isActive("orderedList")} onClick={() => chain().toggleOrderedList().run()}>
          <ListOrdered className="size-4" aria-hidden />
        </ToolButton>
        <ToolButton label="Trích dẫn / khối nổi bật" isActive={editor.isActive("blockquote")} onClick={() => chain().toggleBlockquote().run()}>
          <Quote className="size-4" aria-hidden />
        </ToolButton>
        <ToolButton label="Đường kẻ ngang" onClick={() => chain().setHorizontalRule().run()}>
          <Minus className="size-4" aria-hidden />
        </ToolButton>
        <Divider />
        <ToolButton label="Chèn link" isActive={editor.isActive("link")} onClick={openLinkInput}>
          <Link2 className="size-4" aria-hidden />
        </ToolButton>
        {editor.isActive("link") && (
          <ToolButton label="Bỏ link" onClick={() => chain().extendMarkRange("link").unsetLink().run()}>
            <Unlink className="size-4" aria-hidden />
          </ToolButton>
        )}
        <ToolButton label="Chèn bộ ảnh (1 hoặc nhiều ảnh)" onClick={onOpenGallery}>
          <Images className="size-4" aria-hidden />
        </ToolButton>
        <Divider />
        <ToolButton label="Hoàn tác" disabled={!editor.can().undo()} onClick={() => chain().undo().run()}>
          <Undo2 className="size-4" aria-hidden />
        </ToolButton>
        <ToolButton label="Làm lại" disabled={!editor.can().redo()} onClick={() => chain().redo().run()}>
          <Redo2 className="size-4" aria-hidden />
        </ToolButton>
      </div>

      {linkDraft !== null && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border px-3 py-2">
          <label htmlFor="announcement-link-input" className="text-xs font-semibold text-text-secondary">
            Địa chỉ link
          </label>
          <input
            id="announcement-link-input"
            autoFocus
            value={linkDraft}
            onChange={(event) => setLinkDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                applyLink();
              }
              if (event.key === "Escape") setLinkDraft(null);
            }}
            placeholder="https://… hoặc /tin-tuc"
            className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 text-sm text-text-primary focus:border-primary focus:outline-none"
          />
          <button type="button" onClick={applyLink} className="h-9 rounded-lg bg-primary-strong px-3 text-sm font-semibold text-white hover:bg-primary-strong-hover">
            Áp dụng
          </button>
          <button type="button" onClick={() => setLinkDraft(null)} className="h-9 rounded-lg px-3 text-sm font-semibold text-text-secondary hover:text-text-primary">
            Huỷ
          </button>
        </div>
      )}
    </div>
  );
}
