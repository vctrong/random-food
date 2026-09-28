"use client";

import { usePathname } from "next/navigation";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * Lời mời đăng nhập nhẹ nhàng đặt trong popover/bottom sheet (không redirect đột ngột).
 * Đăng nhập xong quay về đúng trang đang xem.
 */
export function LoginPrompt({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  const pathname = usePathname();
  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-start gap-3">
        <span className="size-10 shrink-0 rounded-full bg-primary-soft text-primary flex items-center justify-center">
          <LogIn className="size-5" aria-hidden />
        </span>
        <p className="text-sm text-text-primary">{message}</p>
      </div>
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <Button type="button" variant="outline" onClick={onDismiss}>
          Để sau
        </Button>
        <Button href={`/dang-nhap?callbackUrl=${encodeURIComponent(pathname || "/")}`}>Đăng nhập</Button>
      </div>
    </div>
  );
}
