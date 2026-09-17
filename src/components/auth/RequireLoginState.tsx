import type { LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

interface RequireLoginStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  callbackUrl: string;
}

/** BR-U01/U02: Guest không lưu trữ — dùng khi guest gõ thẳng URL vào trang cần đăng nhập. */
export function RequireLoginState({ icon, title, description, callbackUrl }: RequireLoginStateProps) {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-16">
      <EmptyState
        icon={icon}
        title={title}
        description={description}
        action={
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button href={`/dang-nhap?callbackUrl=${encodeURIComponent(callbackUrl)}`} variant="primary" size="sm">
              Đăng nhập
            </Button>
            <Button href={`/dang-ky?callbackUrl=${encodeURIComponent(callbackUrl)}`} variant="outline" size="sm">
              Đăng ký
            </Button>
          </div>
        }
      />
    </div>
  );
}
