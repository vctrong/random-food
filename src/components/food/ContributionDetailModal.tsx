"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink, MapPin, MessageSquareText, PenLine, Undo2, UtensilsCrossed } from "lucide-react";
import { EATING_LEVEL_LABELS } from "@/constants/categories";
import { MAX_PENDING_EDITS } from "@/features/contributions/submissionRules";
import { cn, formatDate, formatDateTime, formatPriceRange, getGoogleMapsUrl, isAllowedImageHost } from "@/lib/utils";
import { withdrawContribution } from "@/services/contributionService";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import { ContributionStatusBadge } from "@/components/food/ContributionStatusBadge";
import { CorrectionNoteBox } from "@/components/food/CorrectionNoteBox";
import { canEditContribution, getCurrentFeedback, getEditActionLabel } from "@/components/food/ContributionCard";
import type { Contribution } from "@/types/contribution";

interface ContributionDetailModalProps {
  contribution: Contribution | null;
  onClose: () => void;
  onEdit: (contribution: Contribution) => void;
  /** Đề xuất vừa đổi (rút / gửi ghi chú) — tải lại danh sách. */
  onChanged: () => void;
}

const DECISION_LABEL = {
  approved: "Đã duyệt",
  needs_revision: "Yêu cầu chỉnh sửa",
  rejected: "Từ chối",
} as const;

const DECISION_DOT = {
  approved: "bg-success",
  needs_revision: "bg-warning",
  rejected: "bg-accent",
} as const;

export function ContributionDetailModal({ contribution, onClose, onEdit, onChanged }: ContributionDetailModalProps) {
  return (
    <Modal isOpen={contribution !== null} onClose={onClose} panelClassName="max-w-2xl">
      {contribution && (
        // key theo id để trạng thái xác nhận rút không dính sang đề xuất khác.
        <DetailBody key={contribution.id} contribution={contribution} onClose={onClose} onEdit={onEdit} onChanged={onChanged} />
      )}
    </Modal>
  );
}

function DetailBody({
  contribution,
  onClose,
  onEdit,
  onChanged,
}: Omit<ContributionDetailModalProps, "contribution"> & { contribution: Contribution }) {
  const { showToast } = useToast();
  const [isConfirmingWithdraw, setIsConfirmingWithdraw] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const feedback = getCurrentFeedback(contribution);

  async function handleWithdraw() {
    setIsWithdrawing(true);
    const result = await withdrawContribution(contribution.id);
    setIsWithdrawing(false);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    showToast("Đã rút đề xuất.", "success");
    onChanged();
    onClose();
  }

  return (
    <div className="max-h-[88vh] overflow-y-auto rounded-3xl p-5 sm:p-6 flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2 pr-10">
        <ContributionStatusBadge status={contribution.status} />
        <span className="text-xs text-text-secondary">Gửi ngày {formatDate(contribution.createdAt)}</span>
      </div>

      <h3 className="text-xl font-heading font-semibold text-text-primary -mt-2">{contribution.name}</h3>

      {contribution.status === "needs_revision" && feedback.length > 0 && (
        <div className="p-3 rounded-xl bg-warning/15 flex flex-col gap-1.5">
          <span className="flex items-center gap-1.5 text-xs font-bold text-text-primary">
            <MessageSquareText className="size-4" aria-hidden />
            Lý do cần chỉnh sửa:
          </span>
          {feedback.map((item) => (
            <p key={item.label} className="text-sm text-text-secondary leading-relaxed">
              {feedback.length > 1 && <span className="font-semibold text-text-primary">{item.label}: </span>}“{item.text}”
            </p>
          ))}
        </div>
      )}
      {contribution.foodStatus === "pending" && contribution.remainingEdits !== null && (
        <p className="text-sm text-text-secondary -mt-2">
          Đang chờ FoodReviewer nhận xác minh — bạn còn{" "}
          <span className="font-semibold text-text-primary">
            {contribution.remainingEdits}/{MAX_PENDING_EDITS}
          </span>{" "}
          lần sửa.
        </p>
      )}
      {contribution.status === "in_review" && (
        <p className="text-sm text-text-secondary -mt-2">
          FoodReviewer đang xác minh thực tế nên không sửa trực tiếp được nữa. Bạn có thể gửi ghi chú đính chính hoặc rút đề xuất.
        </p>
      )}

      {contribution.images.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {contribution.images.map((url, index) => (
            <div key={url} className="relative size-28 sm:size-32 rounded-xl overflow-hidden shrink-0 bg-primary-soft flex items-center justify-center">
              {isAllowedImageHost(url) ? (
                <Image src={url} alt={`${contribution.name} — ảnh ${index + 1}`} fill sizes="128px" className="object-cover" />
              ) : (
                <UtensilsCrossed className="size-6 text-primary/60" aria-hidden />
              )}
            </div>
          ))}
        </div>
      )}

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <InfoRow label="Giá tham khảo">
          {contribution.priceMin !== null && contribution.priceMax !== null
            ? formatPriceRange(contribution.priceMin, contribution.priceMax)
            : "—"}
        </InfoRow>
        <InfoRow label="Mức độ ăn">
          {contribution.eatingLevels.map((level) => EATING_LEVEL_LABELS[level]).join(", ") || "—"}
        </InfoRow>
        <InfoRow label="Danh mục">{contribution.categories.map((category) => category.name).join(", ") || "—"}</InfoRow>
        <InfoRow label="Cập nhật lần cuối">{formatDateTime(contribution.updatedAt)}</InfoRow>
      </dl>

      {contribution.description && (
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">Mô tả</span>
          <p className="text-sm text-text-primary leading-relaxed whitespace-pre-line">{contribution.description}</p>
        </div>
      )}

      {contribution.restaurant && (
        <div className="p-4 rounded-2xl bg-background flex flex-col gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
            {contribution.restaurant.isOwnedByUser ? "Quán bạn thêm mới" : "Quán bán món này"}
          </span>
          <p className="font-semibold text-text-primary">{contribution.restaurant.name}</p>
          <p className="text-sm text-text-secondary flex items-start gap-1.5">
            <MapPin className="size-4 shrink-0 mt-0.5 text-accent-ink" aria-hidden />
            {contribution.restaurant.address}
          </p>
          <a
            href={getGoogleMapsUrl(contribution.restaurant.location, contribution.restaurant.address)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1 w-fit"
          >
            Mở trên Google Maps <ExternalLink className="size-3" aria-hidden />
          </a>
        </div>
      )}

      <CorrectionNoteBox contributionId={contribution.id} notes={contribution.notes} canSend={contribution.canSendNote} onSent={onChanged} />

      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">Lịch sử phản hồi</span>
        {contribution.feedbackHistory.length === 0 ? (
          <p className="text-sm text-text-secondary">Chưa có phản hồi nào từ FoodReviewer.</p>
        ) : (
          <ol className="flex flex-col gap-3 border-l-2 border-border ml-1.5 pl-4">
            {contribution.feedbackHistory.map((entry) => (
              <li key={entry.id} className="relative">
                <span className={cn("absolute -left-[22px] top-1.5 size-2.5 rounded-full", DECISION_DOT[entry.decision])} />
                <p className="text-sm font-semibold text-text-primary">
                  {DECISION_LABEL[entry.decision]}
                  <span className="font-normal text-text-secondary">
                    {" "}· {entry.targetType === "restaurant" ? "quán ăn" : "món ăn"} · {formatDateTime(entry.createdAt)}
                  </span>
                </p>
                {entry.reason && <p className="text-sm text-text-secondary leading-relaxed mt-0.5">“{entry.reason}”</p>}
              </li>
            ))}
          </ol>
        )}
      </div>

      {isConfirmingWithdraw && (
        <div role="alertdialog" aria-labelledby="withdraw-title" className="p-4 rounded-2xl border border-accent-strong/40 bg-accent-soft flex flex-col gap-3">
          <p id="withdraw-title" className="text-sm font-semibold text-text-primary">
            Rút đề xuất “{contribution.name}”?
          </p>
          <p className="text-sm text-text-secondary">
            Đề xuất sẽ dừng xác minh và không gửi lại được. Muốn đóng góp lại, bạn tạo đề xuất mới.
            {contribution.status === "in_review" && " FoodReviewer đang xác minh sẽ được báo."}
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsConfirmingWithdraw(false)} disabled={isWithdrawing}>
              Giữ lại
            </Button>
            <Button
              size="sm"
              className="!bg-accent-strong hover:!bg-accent-strong-hover"
              onClick={handleWithdraw}
              isLoading={isWithdrawing}
              leftIcon={<Undo2 className="size-4" aria-hidden />}
            >
              Rút đề xuất
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-2 pt-1">
        {contribution.canWithdraw && !isConfirmingWithdraw && (
          <button
            type="button"
            onClick={() => setIsConfirmingWithdraw(true)}
            className="h-10 px-5 rounded-full border border-border text-text-secondary hover:text-text-primary text-sm font-medium transition-colors inline-flex items-center gap-1.5"
          >
            <Undo2 className="size-4" aria-hidden />
            Rút đề xuất
          </button>
        )}
        {canEditContribution(contribution) && (
          <button
            type="button"
            onClick={() => onEdit(contribution)}
            className="h-10 px-5 rounded-full bg-accent-strong text-white text-sm font-semibold shadow-sm hover:bg-accent-strong-hover active:scale-95 transition-all inline-flex items-center gap-1.5"
          >
            <PenLine className="size-4" aria-hidden />
            {getEditActionLabel(contribution)}
          </button>
        )}
        {contribution.status === "approved" && (
          <Link
            href={`/mon-an/${contribution.id}`}
            className="h-10 px-5 rounded-full bg-primary-strong text-white text-sm font-semibold shadow-sm hover:bg-primary-strong-hover active:scale-95 transition-all inline-flex items-center gap-1.5"
          >
            Xem trang món ăn
          </Link>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">{label}</dt>
      <dd className="text-text-primary">{children}</dd>
    </div>
  );
}
