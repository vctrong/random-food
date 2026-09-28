"use client";

import { useId, useState } from "react";
import { EyeOff, Send } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { REMOVAL_REASON_MAX_LENGTH, REMOVAL_REASON_PRESETS } from "@/constants/admin";
import { cn } from "@/lib/utils";

interface RemovalReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void | Promise<void>;
  kind: "review" | "food" | "restaurant";
  /** Tên món/quán (hoặc món được đánh giá) để Admin nhìn lại trước khi gỡ. */
  subjectName: string;
  /** Tên tác giả/người đóng góp sẽ nhận thông báo. */
  recipientName: string;
  isLoading?: boolean;
}

const KIND_LABEL = { review: "đánh giá", food: "món", restaurant: "quán" } as const;

/** Admin gỡ (ẩn) nội dung — bắt buộc lý do, gửi kèm thông báo content_removed. */
export function RemovalReasonModal({
  isOpen,
  onClose,
  onConfirm,
  kind,
  subjectName,
  recipientName,
  isLoading = false,
}: RemovalReasonModalProps) {
  const titleId = useId();
  const noteId = useId();
  const [reason, setReason] = useState("");
  const presets = REMOVAL_REASON_PRESETS[kind === "review" ? "review" : "place"];
  const trimmed = reason.trim();

  function handleClose() {
    if (isLoading) return;
    setReason("");
    onClose();
  }

  async function handleConfirm() {
    if (!trimmed) return;
    await onConfirm(trimmed);
    setReason("");
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} variant="sheet" labelledBy={titleId} panelClassName="max-w-md p-6">
      <div className="flex items-start gap-3">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-ink">
          <EyeOff className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h3 id={titleId} className="text-lg font-heading font-semibold text-text-primary">
            Gỡ {KIND_LABEL[kind]} này?
          </h3>
          <p className="mt-0.5 truncate text-sm text-text-secondary">{subjectName || "Không rõ tên"}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2.5">
        <label htmlFor={noteId} className="text-sm font-semibold text-text-primary">
          Lý do gỡ <span className="text-xs font-normal text-text-secondary">(bắt buộc)</span>
        </label>
        <div className="flex flex-wrap gap-1.5">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setReason(preset)}
              aria-pressed={reason === preset}
              className={cn(
                "min-h-9 rounded-full border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                reason === preset
                  ? "border-primary bg-primary-soft text-text-primary"
                  : "border-border text-text-secondary hover:border-primary-line hover:text-text-primary",
              )}
            >
              {preset}
            </button>
          ))}
        </div>
        <textarea
          id={noteId}
          rows={3}
          maxLength={REMOVAL_REASON_MAX_LENGTH}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Hoặc tự gõ lý do cụ thể…"
          className="w-full resize-none rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
        />
        <div className="flex items-start justify-between gap-3 text-xs text-text-secondary">
          <p className="flex items-start gap-1.5">
            <Send className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
            <span>
              Lý do sẽ được gửi kèm thông báo tới <strong className="font-semibold text-text-primary">{recipientName}</strong>.
            </span>
          </p>
          <span className="shrink-0 tabular-nums">
            {reason.length}/{REMOVAL_REASON_MAX_LENGTH}
          </span>
        </div>
      </div>

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={handleClose} disabled={isLoading}>
          Huỷ
        </Button>
        <Button onClick={handleConfirm} disabled={!trimmed} isLoading={isLoading} leftIcon={<EyeOff className="size-4" />}>
          Gỡ {KIND_LABEL[kind]}
        </Button>
      </div>
    </Modal>
  );
}
