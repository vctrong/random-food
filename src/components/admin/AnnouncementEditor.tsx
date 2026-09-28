"use client";

import { useId, useState } from "react";
import dynamic from "next/dynamic";
import type { JSONContent } from "@tiptap/react";
import { ArrowLeft, CalendarClock, Eye, FileText, Pin, Plus, Send, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { useToast } from "@/components/ui/ToastProvider";
import { AnnouncementTypeBadge } from "@/components/announcements/AnnouncementBadges";
import {
  ANNOUNCEMENT_LIMITS,
  ANNOUNCEMENT_TARGET_LABELS,
  ANNOUNCEMENT_TYPES,
  type AnnouncementTargetRole,
  type AnnouncementType,
} from "@/constants/announcements";
import { createAnnouncement, updateAnnouncement } from "@/services/announcementService";
import { cn } from "@/lib/utils";
import type { AdminAnnouncementDetail, AnnouncementHighlight, AnnouncementInput } from "@/types/announcement";

// TipTap cần DOM — tải phía client, có khung giữ chỗ để form không nhảy.
const AnnouncementRichEditor = dynamic(
  () => import("./AnnouncementRichEditor").then((module) => module.AnnouncementRichEditor),
  { ssr: false, loading: () => <div className="h-[380px] animate-pulse rounded-2xl border border-border bg-background" /> },
);

type PublishMode = "draft" | "now" | "schedule";

const SPECIFIC_ROLES: Exclude<AnnouncementTargetRole, "all">[] = ["user", "foodreviewer", "admin"];

const inputClass =
  "w-full rounded-xl border border-border bg-surface px-3.5 text-sm text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15";

/** ISO → giá trị cho <input type="datetime-local"> theo giờ máy người dùng. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function fromLocalInput(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

function initialMode(existing: AdminAnnouncementDetail | null): PublishMode {
  if (!existing || existing.status === "draft") return "draft";
  return existing.displayStatus === "scheduled" ? "schedule" : "now";
}

interface AnnouncementEditorProps {
  existing: AdminAnnouncementDetail | null;
  onDone: () => void;
  onCancel: () => void;
}

export function AnnouncementEditor({ existing, onDone, onCancel }: AnnouncementEditorProps) {
  const { showToast } = useToast();
  const ids = { title: useId(), slug: useId(), summary: useId(), content: useId(), publishAt: useId(), expireAt: useId() };
  const [title, setTitle] = useState(existing?.title ?? "");
  const [slug, setSlug] = useState(existing?.slug ?? "");
  const [summary, setSummary] = useState(existing?.summary ?? "");
  const [type, setType] = useState<AnnouncementType>(existing?.type ?? "news");
  const [targets, setTargets] = useState<AnnouncementTargetRole[]>(existing?.targetRoles ?? ["all"]);
  const [isPinned, setIsPinned] = useState(existing?.isPinned ?? false);
  const [highlights, setHighlights] = useState<AnnouncementHighlight[]>(existing?.highlights ?? []);
  const [content, setContent] = useState<JSONContent | null>((existing?.content as JSONContent | undefined) ?? null);
  const [mode, setMode] = useState<PublishMode>(initialMode(existing));
  const [publishAt, setPublishAt] = useState(toLocalInput(existing?.status === "published" ? existing.publishAt : null));
  const [expireAt, setExpireAt] = useState(toLocalInput(existing?.expireAt ?? null));
  const [isSaving, setIsSaving] = useState(false);

  const isAllTargets = targets.includes("all");
  const isLive = existing?.displayStatus === "live";

  function toggleSpecificRole(role: Exclude<AnnouncementTargetRole, "all">) {
    const current = targets.filter((item) => item !== "all");
    const next = current.includes(role) ? current.filter((item) => item !== role) : [...current, role];
    setTargets(next);
  }

  function updateHighlight(index: number, patch: Partial<AnnouncementHighlight>) {
    setHighlights((items) => items.map((item, position) => (position === index ? { ...item, ...patch } : item)));
  }

  function validate(): string | null {
    if (title.trim().length < 5) return "Tiêu đề cần ít nhất 5 ký tự.";
    if (summary.trim().length < 10) return "Mô tả ngắn cần ít nhất 10 ký tự.";
    if (targets.length === 0) return "Chọn ít nhất 1 nhóm đối tượng.";
    if (highlights.some((item) => !item.label.trim() || !item.value.trim())) return "Mỗi ô tóm tắt cần có nhãn và giá trị.";
    if (!content || !(content.content ?? []).some((node) => node.content?.length || node.type === "image")) return "Nội dung đang trống.";
    if (mode === "schedule") {
      if (!publishAt) return "Chọn thời điểm hẹn đăng.";
      if (new Date(publishAt).getTime() <= Date.now()) return "Thời điểm hẹn đăng phải ở tương lai.";
    }
    if (expireAt) {
      const start = mode === "schedule" && publishAt ? new Date(publishAt).getTime() : Date.now();
      if (new Date(expireAt).getTime() <= start) return "Ngày hết hạn phải sau thời điểm đăng.";
    }
    return null;
  }

  async function save() {
    const problem = validate();
    if (problem) {
      showToast(problem, "warning");
      return;
    }
    const input: AnnouncementInput = {
      title: title.trim(),
      ...(slug.trim() && { slug: slug.trim().toLowerCase() }),
      summary: summary.trim(),
      highlights: highlights.map((item) => ({
        label: item.label.trim(),
        value: item.value.trim(),
        ...(item.note?.trim() && { note: item.note.trim() }),
      })),
      content,
      type,
      targetRoles: targets,
      isPinned,
      status: mode === "draft" ? "draft" : "published",
      publishAt: mode === "schedule" ? fromLocalInput(publishAt) : null,
      expireAt: fromLocalInput(expireAt),
    };
    setIsSaving(true);
    const result = existing ? await updateAnnouncement(existing.id, input) : await createAnnouncement(input);
    setIsSaving(false);
    if (!result.ok) {
      showToast(result.message, "error");
      return;
    }
    showToast(
      mode === "draft" ? "Đã lưu nháp" : mode === "schedule" ? "Đã hẹn giờ đăng thông báo" : existing ? "Đã cập nhật thông báo" : "Đã đăng thông báo",
      "success",
    );
    onDone();
  }

  const saveLabel = mode === "draft" ? "Lưu nháp" : mode === "schedule" ? "Hẹn giờ đăng" : existing?.status === "published" ? "Lưu thay đổi" : "Đăng ngay";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-text-secondary transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Danh sách thông báo
        </button>
        {existing && (
          <a
            href={`/tin-tuc/${existing.slug}?preview=1`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3.5 text-sm font-semibold text-text-secondary transition-colors hover:border-primary-line hover:text-text-primary"
          >
            <Eye className="size-4" aria-hidden />
            Xem trước bản đã lưu
          </a>
        )}
      </div>

      <h1 className="text-2xl md:text-3xl font-heading text-text-primary">{existing ? "Sửa thông báo" : "Tạo thông báo chính thức"}</h1>
      {isLive && (
        <p className="rounded-xl bg-primary-soft/60 px-4 py-2.5 text-sm text-text-primary">
          Bài đang hiển thị — thay đổi sẽ áp dụng ngay khi lưu, không gửi lại thông báo cho người đã xem.
        </p>
      )}

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        {/* Cột nội dung */}
        <div className="space-y-5">
          <section className="space-y-4 rounded-2xl border border-border bg-surface p-5">
            <div className="space-y-1.5">
              <label htmlFor={ids.title} className="text-sm font-semibold text-text-primary">Tiêu đề</label>
              <input
                id={ids.title}
                value={title}
                maxLength={ANNOUNCEMENT_LIMITS.titleMax}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="VD: Thông báo bảo trì hệ thống ngày 05/10/2026"
                className={cn(inputClass, "h-11")}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor={ids.slug} className="text-sm font-semibold text-text-primary">
                Đường dẫn <span className="font-normal text-text-secondary">(để trống để tự tạo từ tiêu đề)</span>
              </label>
              <div className="flex items-center rounded-xl border border-border bg-background focus-within:border-primary">
                <span className="pl-3.5 text-sm text-text-secondary">/tin-tuc/</span>
                <input
                  id={ids.slug}
                  value={slug}
                  maxLength={ANNOUNCEMENT_LIMITS.slugMax}
                  onChange={(event) => setSlug(event.target.value.toLowerCase().replace(/\s+/g, "-"))}
                  placeholder="bao-tri-he-thong-05-10-2026"
                  className="h-11 min-w-0 flex-1 bg-transparent pr-3.5 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor={ids.summary} className="flex items-baseline justify-between text-sm font-semibold text-text-primary">
                Mô tả ngắn
                <span className="text-xs font-normal text-text-secondary tabular-nums">
                  {summary.length}/{ANNOUNCEMENT_LIMITS.summaryMax}
                </span>
              </label>
              <textarea
                id={ids.summary}
                rows={3}
                value={summary}
                maxLength={ANNOUNCEMENT_LIMITS.summaryMax}
                onChange={(event) => setSummary(event.target.value)}
                placeholder="Hiện ở thẻ danh sách Tin tức, banner trang chủ và chuông thông báo."
                className={cn(inputClass, "resize-none py-2.5")}
              />
            </div>
          </section>

          <section className="space-y-3 rounded-2xl border border-border bg-surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-h4 text-text-primary">Tóm tắt thông tin quan trọng</h2>
                <p className="text-xs text-text-secondary">Tuỳ chọn, tối đa {ANNOUNCEMENT_LIMITS.highlightsMax} ô — VD: Thời gian · Phạm vi ảnh hưởng · Dữ liệu.</p>
              </div>
              {highlights.length < ANNOUNCEMENT_LIMITS.highlightsMax && (
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Plus className="size-4" />}
                  onClick={() => setHighlights((items) => [...items, { label: "", value: "", note: "" }])}
                >
                  Thêm ô
                </Button>
              )}
            </div>
            {highlights.length > 0 && (
              <div className="grid gap-3 md:grid-cols-3">
                {highlights.map((item, index) => (
                  <div key={index} className="relative space-y-2 rounded-xl border border-border bg-background p-3">
                    <button
                      type="button"
                      onClick={() => setHighlights((items) => items.filter((_, position) => position !== index))}
                      aria-label={`Xoá ô tóm tắt ${index + 1}`}
                      className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-lg text-text-secondary hover:bg-accent-soft hover:text-accent-ink"
                    >
                      <X className="size-3.5" aria-hidden />
                    </button>
                    <input
                      aria-label={`Nhãn ô ${index + 1}`}
                      value={item.label}
                      maxLength={ANNOUNCEMENT_LIMITS.highlightLabelMax}
                      onChange={(event) => updateHighlight(index, { label: event.target.value })}
                      placeholder="Nhãn (VD: Thời gian)"
                      className={cn(inputClass, "h-9 pr-8 text-xs uppercase")}
                    />
                    <input
                      aria-label={`Giá trị ô ${index + 1}`}
                      value={item.value}
                      maxLength={ANNOUNCEMENT_LIMITS.highlightValueMax}
                      onChange={(event) => updateHighlight(index, { value: event.target.value })}
                      placeholder="Giá trị (VD: 00:00 – 04:00)"
                      className={cn(inputClass, "h-9 font-semibold")}
                    />
                    <input
                      aria-label={`Ghi chú ô ${index + 1}`}
                      value={item.note ?? ""}
                      maxLength={ANNOUNCEMENT_LIMITS.highlightNoteMax}
                      onChange={(event) => updateHighlight(index, { note: event.target.value })}
                      placeholder="Ghi chú (tuỳ chọn)"
                      className={cn(inputClass, "h-9 text-xs")}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-2">
            <h2 id={ids.content} className="text-h4 text-text-primary">Nội dung</h2>
            <AnnouncementRichEditor initialContent={content} onChange={setContent} labelledBy={ids.content} />
            <p className="text-xs text-text-secondary">Chữ ký “Trân trọng, Đội ngũ NayAnGi” và khối liên hệ được tự thêm cuối bài.</p>
          </section>
        </div>

        {/* Cột thiết lập */}
        <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
          <section className="space-y-3 rounded-2xl border border-border bg-surface p-5">
            <h2 className="text-h4 text-text-primary">Loại thông báo</h2>
            <div className="grid grid-cols-2 gap-2">
              {ANNOUNCEMENT_TYPES.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setType(value)}
                  aria-pressed={type === value}
                  className={cn(
                    "rounded-xl border p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    type === value ? "border-primary bg-primary-soft/60" : "border-border hover:border-primary-line",
                  )}
                >
                  <AnnouncementTypeBadge type={value} className="w-full justify-center" />
                </button>
              ))}
            </div>
            {(type === "important" || type === "maintenance") && (
              <p className="text-xs text-text-secondary">Loại này hiện thêm banner ở trang chủ (người dùng đóng được).</p>
            )}
          </section>

          <section className="space-y-3 rounded-2xl border border-border bg-surface p-5">
            <h2 className="text-h4 text-text-primary">Ai được xem?</h2>
            <label className="flex items-center gap-2.5 text-sm text-text-primary">
              <input type="radio" name="target-mode" checked={isAllTargets} onChange={() => setTargets(["all"])} className="size-4 accent-[var(--color-primary-strong)]" />
              {ANNOUNCEMENT_TARGET_LABELS.all}
            </label>
            <label className="flex items-center gap-2.5 text-sm text-text-primary">
              <input
                type="radio"
                name="target-mode"
                checked={!isAllTargets}
                onChange={() => setTargets(["user"])}
                className="size-4 accent-[var(--color-primary-strong)]"
              />
              Chỉ một số nhóm đã đăng nhập
            </label>
            {!isAllTargets && (
              <div className="ml-6 space-y-2 border-l-2 border-primary-line pl-3">
                {SPECIFIC_ROLES.map((role) => (
                  <label key={role} className="flex items-center gap-2.5 text-sm text-text-primary">
                    <input
                      type="checkbox"
                      checked={targets.includes(role)}
                      onChange={() => toggleSpecificRole(role)}
                      className="size-4 rounded accent-[var(--color-primary-strong)]"
                    />
                    {ANNOUNCEMENT_TARGET_LABELS[role]}
                  </label>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
              <span className="flex items-center gap-2 text-sm text-text-primary">
                <Pin className="size-4 text-secondary" aria-hidden />
                Ghim đầu Tin tức
              </span>
              <Toggle checked={isPinned} onChange={() => setIsPinned((value) => !value)} label="Ghim thông báo" />
            </div>
          </section>

          <section className="space-y-3 rounded-2xl border border-border bg-surface p-5">
            <h2 className="text-h4 text-text-primary">Đăng bài</h2>
            <div role="radiogroup" aria-label="Cách đăng" className="space-y-2">
              {(
                [
                  { value: "draft", label: "Lưu nháp", hint: "Chưa ai thấy.", icon: FileText },
                  { value: "now", label: existing?.status === "published" ? "Giữ đang đăng" : "Đăng ngay", hint: "Hiện ngay sau khi lưu.", icon: Send },
                  { value: "schedule", label: "Hẹn giờ", hint: "Tự hiện đúng giờ đã chọn.", icon: CalendarClock },
                ] as const
              ).map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors",
                    mode === option.value ? "border-primary bg-primary-soft/50" : "border-border hover:border-primary-line",
                  )}
                >
                  <input
                    type="radio"
                    name="publish-mode"
                    value={option.value}
                    checked={mode === option.value}
                    onChange={() => setMode(option.value)}
                    className="mt-0.5 size-4 accent-[var(--color-primary-strong)]"
                  />
                  <span>
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-text-primary">
                      <option.icon className="size-4 text-primary" aria-hidden />
                      {option.label}
                    </span>
                    <span className="text-xs text-text-secondary">{option.hint}</span>
                  </span>
                </label>
              ))}
            </div>
            {mode === "schedule" && (
              <div className="space-y-1.5">
                <label htmlFor={ids.publishAt} className="text-sm font-semibold text-text-primary">Thời điểm đăng</label>
                <input
                  id={ids.publishAt}
                  type="datetime-local"
                  value={publishAt}
                  onChange={(event) => setPublishAt(event.target.value)}
                  className={cn(inputClass, "h-11")}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <label htmlFor={ids.expireAt} className="text-sm font-semibold text-text-primary">
                Hết hạn <span className="font-normal text-text-secondary">(tuỳ chọn — tự ẩn sau mốc này)</span>
              </label>
              <div className="flex gap-2">
                <input
                  id={ids.expireAt}
                  type="datetime-local"
                  value={expireAt}
                  onChange={(event) => setExpireAt(event.target.value)}
                  className={cn(inputClass, "h-11")}
                />
                {expireAt && (
                  <button
                    type="button"
                    onClick={() => setExpireAt("")}
                    aria-label="Bỏ ngày hết hạn"
                    className="grid size-11 shrink-0 place-items-center rounded-xl border border-border text-text-secondary hover:text-text-primary"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                )}
              </div>
            </div>
            <Button fullWidth isLoading={isSaving} onClick={save} leftIcon={mode === "draft" ? <FileText className="size-4" /> : <Send className="size-4" />}>
              {saveLabel}
            </Button>
          </section>
        </aside>
      </div>
    </div>
  );
}
