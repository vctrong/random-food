"use client";

import Link from "next/link";
import { BadgeCheck, ChevronRight, ClipboardCheck } from "lucide-react";
import { APPLICATION_BENEFITS } from "@/constants/reviewerApplication";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReviewerApplicationFormView } from "@/components/reviewer/ReviewerApplicationFormView";
import { ReviewerApplicationStatusView } from "@/components/reviewer/ReviewerApplicationStatusView";
import type { ReviewerApplicationOverview } from "@/types/reviewerApplication";

interface ReviewerApplicationPageContentProps {
  overview: ReviewerApplicationOverview;
  categories: { id: string; name: string }[];
  defaultFullName: string;
}

export function ReviewerApplicationPageContent({ overview, categories, defaultFullName }: ReviewerApplicationPageContentProps) {
  const { access, application } = overview;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-10 flex flex-col gap-8">
      <header className="flex flex-col gap-6">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-text-secondary">
          <Link href="/" className="hover:text-primary-blue transition-colors">Trang chủ</Link>
          <ChevronRight className="size-3.5" aria-hidden />
          <span className="text-text-primary font-medium">Ứng tuyển FoodReviewer</span>
        </nav>

        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-soft-blue text-primary-blue text-xs font-bold uppercase tracking-wider mb-2">
            <BadgeCheck className="size-3.5" aria-hidden />
            <span>Chương trình FoodReviewer</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-text-primary">Trở thành FoodReviewer</h1>
          <p className="text-text-secondary mt-2 leading-relaxed">
            FoodReviewer là người xác minh món ăn và quán ăn do cộng đồng đóng góp có thật và đúng thông tin trước khi được công khai — giữ cho bản đồ ẩm thực
            Cần Thơ luôn đáng tin.
          </p>
        </div>

        {access.state === "eligible" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {APPLICATION_BENEFITS.map(({ icon: Icon, title, text }) => (
              <div key={title} className="p-5 rounded-2xl bg-white border border-border shadow-sm flex flex-col gap-2">
                <span className="size-10 rounded-xl bg-soft-blue text-primary-blue flex items-center justify-center">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h3 className="font-heading font-semibold text-text-primary">{title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        )}
      </header>

      {access.state === "already_reviewer" && (
        <EmptyState
          icon={ClipboardCheck}
          title="Bạn đã là FoodReviewer"
          description="Tài khoản của bạn đã có quyền thẩm định. Vào không gian thẩm định để xem hàng chờ."
          action={<Button href="/reviewer">Vào không gian thẩm định</Button>}
        />
      )}

      {(access.state === "pending" || access.state === "cooldown") && application && (
        <ReviewerApplicationStatusView access={access} application={application} />
      )}

      {access.state === "eligible" && (
        <ReviewerApplicationFormView categories={categories} defaultFullName={defaultFullName} previousApplication={application} />
      )}
    </div>
  );
}
