"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Search, Star } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/ToastProvider";
import { formatDateTime } from "@/lib/utils";
import type { AdminReviewRow } from "@/types/admin";

interface ReviewsModerationContentProps {
  initialReviews: AdminReviewRow[];
}

type StatusFilter = "all" | "visible" | "hidden";

export function ReviewsModerationContent({ initialReviews }: ReviewsModerationContentProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [reviews, setReviews] = useState(initialReviews);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return reviews.filter((review) => {
      if (statusFilter !== "all" && review.status !== statusFilter) return false;
      if (!query) return true;
      return (
        review.user.name.toLowerCase().includes(query) ||
        (review.comment ?? "").toLowerCase().includes(query) ||
        (review.foodName ?? "").toLowerCase().includes(query)
      );
    });
  }, [reviews, statusFilter, search]);

  async function handleToggle(review: AdminReviewRow) {
    const status = review.status === "visible" ? "hidden" : "visible";
    const res = await fetch("/api/admin/reviews", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewId: review.id, status }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error ?? "Có lỗi xảy ra.", "error");
      return;
    }
    setReviews((prev) => prev.map((r) => (r.id === review.id ? { ...r, status } : r)));
    showToast(status === "hidden" ? "Đã ẩn đánh giá." : "Đã hiện lại đánh giá.", "success");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <h1 className="text-2xl md:text-3xl font-subheading font-semibold text-text-primary tracking-tight">
          Kiểm duyệt đánh giá &amp; bình luận
        </h1>
        <p className="text-sm text-text-secondary">{reviews.length} đánh giá trong hệ thống</p>
      </div>

      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-text-secondary" aria-hidden />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo người đánh giá, món ăn, nội dung..."
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-cream text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-blue/40"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="h-11 px-3 rounded-xl bg-cream text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-blue/40"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="visible">Đang hiển thị</option>
            <option value="hidden">Đã ẩn</option>
          </select>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Star}
          title="Chưa có đánh giá nào"
          description="Đánh giá món ăn từ người dùng sẽ hiện tại đây để kiểm duyệt."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-text-secondary">
                  <th className="px-4 py-3 font-semibold">Món ăn &amp; nhà hàng</th>
                  <th className="px-4 py-3 font-semibold">Người đánh giá</th>
                  <th className="px-4 py-3 font-semibold">Điểm</th>
                  <th className="px-4 py-3 font-semibold">Nội dung</th>
                  <th className="px-4 py-3 font-semibold">Trạng thái</th>
                  <th className="px-4 py-3 font-semibold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((review) => (
                  <tr key={review.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-text-primary">{review.foodName ?? "—"}</p>
                      <p className="text-xs text-text-secondary">{review.restaurantName ?? ""}</p>
                    </td>
                    <td className="px-4 py-3 text-text-primary">{review.user.name}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 font-semibold text-primary-blue">
                        <Star className="size-3.5 fill-current" aria-hidden />
                        {review.rating.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-text-primary line-clamp-2">{review.comment ?? "(không có bình luận)"}</p>
                      <p className="text-xs text-text-secondary mt-0.5">{formatDateTime(review.createdAt)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={review.status === "visible" ? "success" : "pink"}>
                        {review.status === "visible" ? "Đang hiển thị" : "Đã ẩn"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {review.status === "visible" ? (
                        <Button size="sm" variant="outline" leftIcon={<EyeOff className="size-3.5" />} onClick={() => handleToggle(review)}>
                          Ẩn
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" leftIcon={<Eye className="size-3.5" />} onClick={() => handleToggle(review)}>
                          Hiện lại
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
