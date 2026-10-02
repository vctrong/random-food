"use client";

import Image from "next/image";
import Link from "next/link";
import {
  BadgeCheck,
  Bookmark,
  ExternalLink,
  Hourglass,
  MessageSquareText,
  PenLine,
  ScanSearch,
  Star,
  Store,
  Undo2,
  UtensilsCrossed,
} from "lucide-react";
import { MAX_PENDING_EDITS } from "@/features/contributions/submissionRules";
import { EATING_LEVEL_LABELS } from "@/constants/categories";
import { cn, formatDate, formatPriceRange, isAllowedImageHost } from "@/lib/utils";
import { ContributionStatusBadge } from "@/components/food/ContributionStatusBadge";
import { OpeningHoursSummary } from "@/components/restaurant/OpeningHoursSummary";
import type { Contribution } from "@/types/contribution";

interface ContributionCardProps {
  contribution: Contribution;
  onOpenDetail: (contribution: Contribution) => void;
  onEdit: (contribution: Contribution) => void;
}

/** Nhãn nút sửa theo trạng thái: needs_revision là sửa xong gửi lại luôn. */
export function getEditActionLabel(contribution: Contribution): string {
  return contribution.foodStatus === "needs_revision" ? "Chỉnh sửa & gửi lại" : "Chỉnh sửa";
}

export function canEditContribution(contribution: Contribution): boolean {
  return contribution.editable.food || contribution.editable.restaurant;
}

/** Phản hồi hiện tại của đội kiểm duyệt — ghép ghi chú của món và của quán (nếu quán do user tạo kèm). */
export function getCurrentFeedback(contribution: Contribution): { label: string; text: string }[] {
  const items: { label: string; text: string }[] = [];
  if (contribution.moderationNote && (contribution.foodStatus === "needs_revision" || contribution.foodStatus === "rejected")) {
    items.push({ label: "Về món ăn", text: contribution.moderationNote });
  }
  const restaurant = contribution.restaurant;
  if (
    restaurant?.isOwnedByUser &&
    restaurant.moderationNote &&
    (restaurant.status === "needs_revision" || restaurant.status === "rejected")
  ) {
    items.push({ label: "Về quán ăn", text: restaurant.moderationNote });
  }
  return items;
}

export function ContributionCard({ contribution, onOpenDetail, onEdit }: ContributionCardProps) {
  const { status, images, restaurant } = contribution;
  const cover = images[0];
  const feedback = getCurrentFeedback(contribution);

  return (
    <article className="bg-surface rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow p-4 sm:p-5 flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative w-full sm:w-48 h-44 sm:h-auto sm:min-h-40 rounded-xl overflow-hidden shrink-0 bg-primary-soft flex items-center justify-center">
          {isAllowedImageHost(cover) ? (
            <Image src={cover} alt={contribution.name} fill sizes="(min-width: 640px) 192px, 100vw" className="object-cover" />
          ) : (
            <UtensilsCrossed className="size-8 text-primary/60" aria-hidden />
          )}
          {contribution.priceMin !== null && contribution.priceMax !== null && (
            <span className="absolute top-2 left-2 px-2.5 py-1 rounded-full bg-surface/90 backdrop-blur-md text-[11px] font-bold text-text-primary shadow-sm">
              {formatPriceRange(contribution.priceMin, contribution.priceMax)}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-3">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <ContributionStatusBadge status={status} />
              <span className="text-xs text-text-secondary">Gửi ngày {formatDate(contribution.createdAt)}</span>
            </div>
            <h2 className="mt-2 text-lg font-heading font-semibold text-text-primary truncate">{contribution.name}</h2>
            {restaurant && (
              <p className="mt-0.5 text-sm text-text-secondary flex items-start gap-1.5">
                <Store className="size-4 shrink-0 mt-0.5 text-primary" aria-hidden />
                <span className="min-w-0">
                  {restaurant.isOwnedByUser ? "Quán bạn thêm: " : "Quán: "}
                  <span className="font-semibold text-text-primary">{restaurant.name}</span>
                  <span className="block text-xs truncate">{restaurant.address}</span>
                  <OpeningHoursSummary schedule={restaurant.openingSchedule} className="text-xs" />
                </span>
              </p>
            )}
            {(contribution.categories.length > 0 || contribution.eatingLevels.length > 0) && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {contribution.categories.map((category) => (
                  <span key={category.id} className="px-2 py-0.5 rounded-full bg-accent-soft text-accent-ink text-[11px] font-medium">
                    {category.name}
                  </span>
                ))}
                {contribution.eatingLevels.map((level) => (
                  <span key={level} className="px-2 py-0.5 rounded-full bg-primary-soft text-primary text-[11px] font-medium">
                    {EATING_LEVEL_LABELS[level]}
                  </span>
                ))}
              </div>
            )}
          </div>

          {status === "approved" || status === "hidden" ? (
            <div className="p-3 rounded-xl bg-background flex flex-col gap-1.5 text-xs text-text-secondary">
              {contribution.verifiedAt && (
                <span className="flex items-center gap-1.5 text-text-primary font-medium">
                  <BadgeCheck className="size-4 text-success" aria-hidden />
                  Thẩm định{contribution.verifiedByName ? ` bởi ${contribution.verifiedByName}` : ""} · {formatDate(contribution.verifiedAt)}
                </span>
              )}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-medium">
                <span className="flex items-center gap-1 text-primary">
                  <Bookmark className="size-3.5" aria-hidden /> {contribution.saveCount} lượt lưu
                </span>
                <span className="flex items-center gap-1 text-accent-ink">
                  <Star className="size-3.5" aria-hidden />
                  {contribution.ratingCount > 0
                    ? `${contribution.avgRating.toFixed(1)} · ${contribution.ratingCount} đánh giá`
                    : "Chưa có đánh giá"}
                </span>
              </div>
              {status === "hidden" && (
                <p className="text-text-secondary">Quản trị viên đang tạm ẩn món này khỏi danh sách công khai.</p>
              )}
            </div>
          ) : status === "pending" ? (
            <div className="p-3 rounded-xl bg-primary-soft/60 flex items-start gap-2 text-xs text-text-secondary">
              <Hourglass className="size-4 shrink-0 mt-0.5 text-primary" aria-hidden />
              <p>
                Đang chờ FoodReviewer nhận xác minh. Phát hiện nhập sai thì sửa ngay lúc này nha
                {contribution.remainingEdits !== null && (
                  <span className="font-semibold text-text-primary">
                    {" "}— còn {contribution.remainingEdits}/{MAX_PENDING_EDITS} lần sửa
                  </span>
                )}
                .
              </p>
            </div>
          ) : status === "in_review" ? (
            <div className="p-3 rounded-xl bg-secondary-soft flex items-start gap-2 text-xs text-text-secondary">
              <ScanSearch className="size-4 shrink-0 mt-0.5 text-secondary-strong dark:text-text-primary" aria-hidden />
              <p>
                FoodReviewer đang xác minh thực tế nên đề xuất tạm khoá sửa. Có gì sai, bạn gửi ghi chú đính chính hoặc rút đề xuất.
              </p>
            </div>
          ) : status === "withdrawn" ? (
            <div className="p-3 rounded-xl bg-background flex items-start gap-2 text-xs text-text-secondary">
              <Undo2 className="size-4 shrink-0 mt-0.5" aria-hidden />
              <p>Bạn đã rút đề xuất này — chỉ còn để xem lại.</p>
            </div>
          ) : (
            <div
              className={cn(
                "p-3 rounded-xl flex flex-col gap-1.5",
                status === "needs_revision" ? "bg-warning/15" : "bg-accent/10",
              )}
            >
              <span className="flex items-center gap-1.5 text-xs font-bold text-text-primary">
                <MessageSquareText className="size-4" aria-hidden />
                {status === "needs_revision" ? "Đội kiểm duyệt yêu cầu bổ sung:" : "Lý do từ chối:"}
              </span>
              {feedback.length === 0 ? (
                <p className="text-xs text-text-secondary">Không có ghi chú.</p>
              ) : (
                feedback.map((item) => (
                  <p key={item.label} className="text-sm text-text-secondary leading-relaxed">
                    {feedback.length > 1 && <span className="font-semibold text-text-primary">{item.label}: </span>}
                    “{item.text}”
                  </p>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => onOpenDetail(contribution)}
          className="h-9 px-4 rounded-full bg-background text-text-secondary hover:text-text-primary text-sm font-medium transition-colors"
        >
          Xem chi tiết
        </button>
        {contribution.canSendNote && (
          <button
            type="button"
            onClick={() => onOpenDetail(contribution)}
            className="h-9 px-4 rounded-full border border-border text-text-primary text-sm font-semibold hover:bg-primary-soft transition-colors inline-flex items-center gap-1.5"
          >
            <MessageSquareText className="size-4" aria-hidden />
            Gửi ghi chú đính chính
          </button>
        )}
        {canEditContribution(contribution) && (
          <button
            type="button"
            onClick={() => onEdit(contribution)}
            className="h-9 px-4 rounded-full bg-accent-strong text-white text-sm font-semibold shadow-sm hover:bg-accent-strong-hover active:scale-95 transition-all inline-flex items-center gap-1.5"
          >
            <PenLine className="size-4" aria-hidden />
            {getEditActionLabel(contribution)}
          </button>
        )}
        {contribution.status === "approved" && (
          <Link
            href={`/mon-an/${contribution.id}`}
            className="h-9 px-4 rounded-full bg-primary-strong text-white text-sm font-semibold shadow-sm hover:bg-primary-strong-hover active:scale-95 transition-all inline-flex items-center gap-1.5"
          >
            Xem trang món ăn
            <ExternalLink className="size-3.5" aria-hidden />
          </Link>
        )}
      </div>
    </article>
  );
}
