"use client";

import { useState, type Ref } from "react";
import { Flag, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { ResponsivePicker } from "@/components/ui/ResponsivePicker";
import { LoginPrompt } from "@/components/auth/LoginPrompt";
import { ReportForm } from "@/components/food/ReportForm";

type View = "menu" | "form" | "login";

const TITLES: Record<View, string> = {
  menu: "Tuỳ chọn đánh giá",
  form: "Báo cáo đánh giá",
  login: "Đăng nhập để báo cáo",
};

interface ReviewActionsMenuProps {
  reviewId: string;
  authorName: string;
  isAuthenticated: boolean;
  onReported: () => void;
}

/**
 * Nút "⋯" của 1 đánh giá → menu "Báo cáo đánh giá" → form (cùng 1 popover/bottom sheet).
 * Desktop: hiện khi hover bài đánh giá hoặc focus bàn phím; mobile: luôn hiện, mờ nhẹ.
 * Nơi gọi KHÔNG render menu này cho đánh giá của chính user.
 */
export function ReviewActionsMenu({ reviewId, authorName, isAuthenticated, onReported }: ReviewActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("menu");

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setView("menu");
  }

  return (
    <ResponsivePicker
      open={open}
      onOpenChange={handleOpenChange}
      title={TITLES[view]}
      minWidth={view === "menu" ? 220 : 360}
      align="end"
      maxHeight={560}
      trigger={(props) => (
        <button
          type="button"
          ref={props.ref as Ref<HTMLButtonElement>}
          aria-expanded={props["aria-expanded"]}
          aria-haspopup="menu"
          aria-label={`Tuỳ chọn cho đánh giá của ${authorName}`}
          onClick={props.onClick}
          className={cn(
            "size-9 shrink-0 rounded-full flex items-center justify-center text-text-secondary transition-[opacity,background-color,color]",
            "hover:bg-background hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:opacity-100",
            // Mobile luôn hiện (mờ nhẹ); desktop chỉ hiện khi hover/focus bài đánh giá hoặc khi menu đang mở.
            props["aria-expanded"] ? "opacity-100 bg-background" : "opacity-60 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100",
          )}
        >
          <MoreHorizontal className="size-5" aria-hidden />
        </button>
      )}
    >
      {view === "menu" && (
        <div role="menu" aria-label={TITLES.menu} className="p-2">
          <button
            type="button"
            role="menuitem"
            onClick={() => setView(isAuthenticated ? "form" : "login")}
            className="w-full min-h-11 flex items-center gap-2.5 rounded-xl px-3 text-left text-sm font-medium text-text-primary hover:bg-background focus-visible:outline-none focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/35"
          >
            <Flag className="size-4 text-accent-ink" aria-hidden />
            Báo cáo đánh giá
          </button>
        </div>
      )}
      {view === "login" && (
        <LoginPrompt message="Đăng nhập để báo cáo đánh giá này nha — tụi mình cần biết ai gửi để chống báo cáo ảo." onDismiss={() => handleOpenChange(false)} />
      )}
      {view === "form" && (
        <ReportForm
          kind="review"
          reviewId={reviewId}
          onCancel={() => handleOpenChange(false)}
          onSubmitted={() => {
            handleOpenChange(false);
            onReported();
          }}
        />
      )}
    </ResponsivePicker>
  );
}
