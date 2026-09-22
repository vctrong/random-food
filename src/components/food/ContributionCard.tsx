"use client";

import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, Bookmark, ExternalLink, Hourglass, MessageSquareText, PenLine, Star, Store, UtensilsCrossed } from "lucide-react";
import { EATING_LEVEL_LABELS } from "@/constants/categories";
import { cn, formatDate, formatPriceRange, isAllowedImageHost } from "@/lib/utils";
import { ContributionStatusBadge } from "@/components/food/ContributionStatusBadge";
import type { Contribution } from "@/types/contribution";

interface ContributionCardProps {
  contribution: Contribution;
  onOpenDetail: (contribution: Contribution) => void;
  onEdit: (contribution: Contribution) => void;
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
        <div className="relative w-full sm:w-48 h-44 sm:h-auto sm:min-h-40 rounded-xl overflow-hidden shrink-0 bg-soft-blue flex items-center justify-center">
          {isAllowedImageHost(cover) ? (
            <Image src={cover} alt={contribution.name} fill sizes="(min-width: 640px) 192px, 100vw" className="object-cover" />
          ) : (
            <UtensilsCrossed className="size-8 text-primary-blue/60" aria-hidden />
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
            <h2 className="mt-2 text-lg font-subheading font-semibold text-text-primary truncate">{contribution.name}</h2>
            {restaurant && (
              <p className="mt-0.5 text-sm text-text-secondary flex items-start gap-1.5">
                <Store className="size-4 shrink-0 mt-0.5 text-primary-blue" aria-hidden />
                <span className="min-w-0">
                  {restaurant.isOwnedByUser ? "Quán bạn thêm: " : "Quán: "}
                  <span className="font-semibold text-text-primary">{restaurant.name}</span>
                  <span className="block text-xs truncate">{restaurant.address}</span>
                </span>
              </p>
            )}
            {(contribution.categories.length > 0 || contribution.eatingLevels.length > 0) && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {contribution.categories.map((category) => (
                  <span key={category.id} className="px-2 py-0.5 rounded-full bg-soft-pink text-primary-pink text-[11px] font-medium">
                    {category.name}
                  </span>
                ))}
                {contribution.eatingLevels.map((level) => (
                  <span key={level} className="px-2 py-0.5 rounded-full bg-soft-blue text-primary-blue text-[11px] font-medium">
                    {EATING_LEVEL_LABELS[level]}
                  </span>
                ))}
              </div>
            )}
          </div>

          {status === "approved" || status === "hidden" ? (
            <div className="p-3 rounded-xl bg-cream flex flex-col gap-1.5 text-xs text-text-secondary">
              {contribution.verifiedAt && (
                <span className="flex items-center gap-1.5 text-text-primary font-medium">
                  <BadgeCheck className="size-4 text-success" aria-hidden />
                  Thẩm định{contribution.verifiedByName ? ` bởi ${contribution.verifiedByName}` : ""} · {formatDate(contribution.verifiedAt)}
                </span>
              )}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-medium">
                <span className="flex items-center gap-1 text-primary-blue">
                  <Bookmark className="size-3.5" aria-hidden /> {contribution.saveCount} lượt lưu
                </span>
                <span className="flex items-center gap-1 text-primary-pink">
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
            <div className="p-3 rounded-xl bg-soft-blue/60 flex items-start gap-2 text-xs text-text-secondary">
              <Hourglass className="size-4 shrink-0 mt-0.5 text-primary-blue" aria-hidden />
              <p>
                FoodReviewer sẽ kiểm tra thông tin món và địa chỉ quán thực tế trước khi công khai. Bạn sẽ nhận thông báo khi có kết quả.
              </p>
            </div>
          ) : (
            <div
              className={cn(
                "p-3 rounded-xl flex flex-col gap-1.5",
                status === "needs_revision" ? "bg-warning/15" : "bg-primary-pink/10",
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
          className="h-9 px-4 rounded-full bg-cream text-text-secondary hover:text-text-primary text-sm font-medium transition-colors"
        >
          Xem chi tiết
        </button>
        {contribution.status === "needs_revision" && (
          <button
            type="button"
            onClick={() => onEdit(contribution)}
            className="h-9 px-4 rounded-full bg-primary-pink text-white text-sm font-semibold shadow-sm hover:opacity-90 active:scale-95 transition-all inline-flex items-center gap-1.5"
          >
            <PenLine className="size-4" aria-hidden />
            Chỉnh sửa & nộp lại
          </button>
        )}
        {contribution.status === "approved" && (
          <Link
            href={`/mon-an/${contribution.id}`}
            className="h-9 px-4 rounded-full bg-primary-blue text-white text-sm font-semibold shadow-sm hover:bg-[#4a8ddb] active:scale-95 transition-all inline-flex items-center gap-1.5"
          >
            Xem trang món ăn
            <ExternalLink className="size-3.5" aria-hidden />
          </Link>
        )}
      </div>
    </article>
  );
}
