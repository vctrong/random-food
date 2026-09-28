"use client";

import { useEffect, useState, type Ref } from "react";
import { useSession } from "next-auth/react";
import { Flag, HeartHandshake } from "lucide-react";
import { ResponsivePicker } from "@/components/ui/ResponsivePicker";
import { useToast } from "@/components/ui/ToastProvider";
import { LoginPrompt } from "@/components/auth/LoginPrompt";
import { ReportForm } from "@/components/food/ReportForm";
import { fetchMyReportedIds } from "@/services/reportService";
import { REPORT_THANK_YOU_TOAST } from "@/constants/reports";
import { REPORT_INFO_LINK_LABEL } from "@/constants/infoNotice";

interface PlaceReportLinkProps {
  foodId: string;
  restaurantId: string | null;
}

/**
 * Link nhỏ "Thông tin chưa đúng?" ở trang chi tiết món → form báo cáo món/quán.
 * Món/quán không bị ẩn sau khi báo cáo — chỉ toast cảm ơn. Đã báo cáo hết thì
 * hiện trạng thái "Bạn đã báo cáo" thay vì mở lại form.
 */
export function PlaceReportLink({ foodId, restaurantId }: PlaceReportLinkProps) {
  const { status } = useSession();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [reported, setReported] = useState({ food: false, restaurant: false });

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    Promise.all([
      fetchMyReportedIds("food", [foodId]),
      restaurantId ? fetchMyReportedIds("restaurant", [restaurantId]) : Promise.resolve(new Set<string>()),
    ]).then(([foods, restaurants]) => {
      if (!cancelled) setReported({ food: foods.has(foodId), restaurant: Boolean(restaurantId && restaurants.has(restaurantId)) });
    });
    return () => {
      cancelled = true;
    };
  }, [status, foodId, restaurantId]);

  const allReported = reported.food && (!restaurantId || reported.restaurant);
  if (allReported) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-text-secondary">
        <HeartHandshake className="size-3.5 text-primary" aria-hidden />
        Bạn đã báo cáo thông tin này rồi, cảm ơn bạn nha 💙
      </p>
    );
  }

  return (
    <ResponsivePicker
      open={open}
      onOpenChange={setOpen}
      title={status === "authenticated" ? "Báo thông tin chưa đúng" : "Đăng nhập để báo cáo"}
      minWidth={380}
      maxHeight={600}
      trigger={(props) => (
        <button
          type="button"
          ref={props.ref as Ref<HTMLButtonElement>}
          aria-expanded={props["aria-expanded"]}
          aria-haspopup={props["aria-haspopup"]}
          onClick={props.onClick}
          className="self-start inline-flex items-center gap-1.5 min-h-10 rounded-lg px-1 text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Flag className="size-3.5" aria-hidden />
          {REPORT_INFO_LINK_LABEL}
        </button>
      )}
    >
      {status === "authenticated" ? (
        <ReportForm
          kind="place"
          foodId={foodId}
          restaurantId={restaurantId}
          reported={reported}
          onCancel={() => setOpen(false)}
          onSubmitted={({ targetType }) => {
            setOpen(false);
            setReported((prev) => ({ ...prev, [targetType === "restaurant" ? "restaurant" : "food"]: true }));
            showToast(REPORT_THANK_YOU_TOAST, "success");
          }}
        />
      ) : (
        <LoginPrompt message="Đăng nhập để báo thông tin chưa đúng cho tụi mình nha." onDismiss={() => setOpen(false)} />
      )}
    </ResponsivePicker>
  );
}
