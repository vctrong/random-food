"use client";

import { useRef, useState, type ReactNode } from "react";
import { EditorContent, useEditor, type Editor, type JSONContent } from "@tiptap/react";
import {
  Bold,
  Heading2,
  Heading3,
  ImagePlus,
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
import { UploadError, uploadImage } from "@/services/uploadService";
import { useToast } from "@/components/ui/ToastProvider";
import { ANNOUNCEMENT_PROSE_CLASS } from "@/components/announcements/announcementProse";
import { cn } from "@/lib/utils";

interface AnnouncementRichEditorProps {
  initialContent: JSONContent | null;
  onChange: (content: JSONContent) => void;
  labelledBy: string;
}

/** Trình soạn thảo nội dung thông báo chính thức — chỉ các định dạng có trong announcementExtensions. */
export function AnnouncementRichEditor({ initialContent, onChange, labelledBy }: AnnouncementRichEditorProps) {
  const editor = useEditor({
    extensions: announcementExtensions,
    content: initialContent ?? "",
    // Next.js SSR: không render editor ở server để tránh lệch hydrate.
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: {
        class: cn(ANNOUNCEMENT_PROSE_CLASS, "min-h-[320px] px-4 py-4 focus:outline-none"),
        "aria-labelledby": labelledBy,
        "aria-multiline": "true",
        role: "textbox",
      },
    },
    onUpdate: ({ editor: current }) => onChange(current.getJSON()),
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15">
      {editor ? <Toolbar editor={editor} /> : <div className="h-11 border-b border-border bg-background" />}
      <EditorContent editor={editor} />
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

function Toolbar({ editor }: { editor: Editor }) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [linkDraft, setLinkDraft] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
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

  async function handleImage(file: File | undefined) {
    if (!file) return;
    setUploadProgress(0);
    try {
      const url = await uploadImage(file, "announcement", { onProgress: setUploadProgress });
      chain().setImage({ src: url, alt: file.name.replace(/\.\w+$/, "") }).run();
    } catch (error) {
      showToast(error instanceof UploadError ? error.message : "Tải ảnh thất bại, thử lại nha.", "error");
    } finally {
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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
        <ToolButton label="Chèn ảnh" disabled={uploadProgress !== null} onClick={() => fileInputRef.current?.click()}>
          <ImagePlus className="size-4" aria-hidden />
        </ToolButton>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => void handleImage(event.target.files?.[0])}
        />
        <Divider />
        <ToolButton label="Hoàn tác" disabled={!editor.can().undo()} onClick={() => chain().undo().run()}>
          <Undo2 className="size-4" aria-hidden />
        </ToolButton>
        <ToolButton label="Làm lại" disabled={!editor.can().redo()} onClick={() => chain().redo().run()}>
          <Redo2 className="size-4" aria-hidden />
        </ToolButton>
        {uploadProgress !== null && (
          <span className="ml-2 text-xs font-semibold text-primary-strong tabular-nums dark:text-primary">Đang tải ảnh {uploadProgress}%</span>
        )}
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
