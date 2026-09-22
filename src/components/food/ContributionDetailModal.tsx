"use client";

import Image from "next/image";
import Link from "next/link";
import { ExternalLink, MapPin, PenLine, UtensilsCrossed } from "lucide-react";
import { EATING_LEVEL_LABELS } from "@/constants/categories";
import { cn, formatDate, formatDateTime, formatPriceRange, getGoogleMapsUrl, isAllowedImageHost } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import { ContributionStatusBadge } from "@/components/food/ContributionStatusBadge";
import type { Contribution } from "@/types/contribution";

interface ContributionDetailModalProps {
  contribution: Contribution | null;
  onClose: () => void;
  onEdit: (contribution: Contribution) => void;
}

const DECISION_LABEL = {
  approved: "Đã duyệt",
  needs_revision: "Yêu cầu chỉnh sửa",
  rejected: "Từ chối",
} as const;

const DECISION_DOT = {
  approved: "bg-success",
  needs_revision: "bg-warning",
  rejected: "bg-primary-pink",
} as const;

export function ContributionDetailModal({ contribution, onClose, onEdit }: ContributionDetailModalProps) {
  return (
    <Modal isOpen={contribution !== null} onClose={onClose} panelClassName="max-w-2xl">
      {contribution && (
        <div className="max-h-[88vh] overflow-y-auto rounded-3xl p-5 sm:p-6 flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2 pr-10">
            <ContributionStatusBadge status={contribution.status} />
            <span className="text-xs text-text-secondary">Gửi ngày {formatDate(contribution.createdAt)}</span>
          </div>

          <h3 className="text-xl font-subheading font-semibold text-text-primary -mt-2">{contribution.name}</h3>

          {contribution.images.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {contribution.images.map((url, index) => (
                <div key={url} className="relative size-28 sm:size-32 rounded-xl overflow-hidden shrink-0 bg-soft-blue flex items-center justify-center">
                  {isAllowedImageHost(url) ? (
                    <Image src={url} alt={`${contribution.name} — ảnh ${index + 1}`} fill sizes="128px" className="object-cover" />
                  ) : (
                    <UtensilsCrossed className="size-6 text-primary-blue/60" aria-hidden />
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
            <div className="p-4 rounded-2xl bg-cream flex flex-col gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                {contribution.restaurant.isOwnedByUser ? "Quán bạn thêm mới" : "Quán bán món này"}
              </span>
              <p className="font-semibold text-text-primary">{contribution.restaurant.name}</p>
              <p className="text-sm text-text-secondary flex items-start gap-1.5">
                <MapPin className="size-4 shrink-0 mt-0.5 text-primary-pink" aria-hidden />
                {contribution.restaurant.address}
              </p>
              <a
                href={getGoogleMapsUrl(contribution.restaurant.location, contribution.restaurant.address)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-primary-blue hover:underline inline-flex items-center gap-1 w-fit"
              >
                Mở trên Google Maps <ExternalLink className="size-3" aria-hidden />
              </a>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">Lịch sử phản hồi</span>
            {contribution.feedbackHistory.length === 0 ? (
              <p className="text-sm text-text-secondary">Chưa có phản hồi nào — hồ sơ đang chờ FoodReviewer xử lý.</p>
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

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            {contribution.status === "needs_revision" && (
              <button
                type="button"
                onClick={() => onEdit(contribution)}
                className="h-10 px-5 rounded-full bg-primary-pink text-white text-sm font-semibold shadow-sm hover:opacity-90 active:scale-95 transition-all inline-flex items-center gap-1.5"
              >
                <PenLine className="size-4" aria-hidden />
                Chỉnh sửa & nộp lại
              </button>
            )}
            {contribution.status === "approved" && (
              <Link
                href={`/mon-an/${contribution.id}`}
                className="h-10 px-5 rounded-full bg-primary-blue text-white text-sm font-semibold shadow-sm hover:bg-[#4a8ddb] active:scale-95 transition-all inline-flex items-center gap-1.5"
              >
                Xem trang món ăn
              </Link>
            )}
          </div>
        </div>
      )}
    </Modal>
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
