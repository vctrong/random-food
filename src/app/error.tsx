"use client";

import { useEffect } from "react";
import { Home, RotateCw, ServerCrash } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * Error boundary cấp route segment (bắt buộc "use client" theo quy ước
 * Next.js App Router). Header/Footer của RootLayout vẫn render bình thường
 * quanh đây vì lỗi không xảy ra ở chính RootLayout (trường hợp đó dùng
 * global-error.tsx, hiếm gặp hơn nên chưa cần thiết lúc này).
 */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Chưa có dịch vụ theo dõi lỗi (Sentry...) nên tạm log ra console để dev tra cứu.
    console.error(error);
  }, [error]);

  return (
    <div className="w-full max-w-2xl mx-auto px-4 md:px-6 lg:px-8 py-16 md:py-24">
      <div className="flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-surface text-primary-pink text-sm font-semibold shadow-sm mb-6">
          <ServerCrash className="size-4" aria-hidden />
          <span>Đã có lỗi xảy ra · 500</span>
        </div>

        <span className="font-subheading font-extrabold leading-none tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary-pink via-primary-pink to-primary-blue text-[96px] sm:text-[128px] select-none mb-6">
          500
        </span>

        <h1 className="text-2xl md:text-3xl font-subheading font-bold text-text-primary mb-2">
          Bếp của chúng tôi đang gặp trục trặc
        </h1>
        <p className="text-text-secondary max-w-md mb-8">
          Hệ thống vừa gặp một sự cố kỹ thuật ngoài dự kiến. Đội ngũ đã ghi nhận và đang xử lý — bạn thử tải lại trang
          hoặc quay về trang chủ giúp mình nhé.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Button onClick={() => reset()} leftIcon={<RotateCw className="size-4" aria-hidden />}>
            Thử tải lại trang
          </Button>
          <Button href="/" variant="outline" leftIcon={<Home className="size-4" aria-hidden />}>
            Về trang chủ
          </Button>
        </div>

        {error.digest && (
          <p className="mt-8 text-xs text-text-secondary">
            Mã tham chiếu lỗi: <code className="px-1.5 py-0.5 rounded bg-surface text-text-primary">{error.digest}</code>
          </p>
        )}
      </div>
    </div>
  );
}
