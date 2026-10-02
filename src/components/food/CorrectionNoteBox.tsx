"use client";

import { useState } from "react";
import { MessageSquareText, Send } from "lucide-react";
import { SUBMISSION_NOTE_MAX_LENGTH } from "@/features/contributions/submissionRules";
import { formatDateTime } from "@/lib/utils";
import { sendCorrectionNote } from "@/services/contributionService";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import type { SubmissionNoteItem } from "@/types/contribution";

interface CorrectionNoteBoxProps {
  contributionId: string;
  notes: SubmissionNoteItem[];
  /** false = đề xuất không còn `in_review` — chỉ xem lại ghi chú đã gửi. */
  canSend: boolean;
  onSent: () => void;
}

/** Ghi chú đính chính gửi FoodReviewer đang xác minh — thay cho việc sửa trực tiếp khi `in_review`. */
export function CorrectionNoteBox({ contributionId, notes, canSend, onSent }: CorrectionNoteBoxProps) {
  const { showToast } = useToast();
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const trimmed = content.trim();

  if (!canSend && notes.length === 0) return null;

  async function handleSend() {
    if (!trimmed || isSending) return;
    setIsSending(true);
    const result = await sendCorrectionNote(contributionId, trimmed);
    setIsSending(false);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    setContent("");
    showToast("Đã gửi ghi chú cho FoodReviewer đang xác minh.", "success");
    onSent();
  }

  return (
    <div className="flex flex-col gap-2.5">
      <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">Ghi chú đính chính</span>

      {notes.length > 0 && (
        <ul className="flex flex-col gap-2">
          {notes.map((note) => (
            <li key={note.id} className="p-3 rounded-xl bg-background text-sm text-text-primary">
              <p className="whitespace-pre-line leading-relaxed">{note.content}</p>
              <span className="block mt-1 text-xs text-text-secondary">{formatDateTime(note.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}

      {canSend && (
        <div className="flex flex-col gap-2">
          <label htmlFor={`correction-note-${contributionId}`} className="text-sm text-text-secondary flex items-start gap-1.5">
            <MessageSquareText className="size-4 shrink-0 mt-0.5 text-primary" aria-hidden />
            Phát hiện thông tin sai? Ghi rõ chỗ cần đính chính để FoodReviewer kiểm tra đúng.
          </label>
          <textarea
            id={`correction-note-${contributionId}`}
            rows={3}
            maxLength={SUBMISSION_NOTE_MAX_LENGTH}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Ví dụ: Giá đúng là 35.000–45.000đ, mình gõ nhầm."
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-sm text-text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary resize-none"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-text-secondary">
              {content.length}/{SUBMISSION_NOTE_MAX_LENGTH}
            </span>
            <Button size="sm" onClick={handleSend} isLoading={isSending} disabled={!trimmed} leftIcon={<Send className="size-4" aria-hidden />}>
              Gửi ghi chú
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
