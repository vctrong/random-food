import type { Metadata } from "next";
import { Suspense } from "react";
import { ForgotPasswordFlow } from "@/components/auth/ForgotPasswordFlow";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { redirectIfAuthenticated } from "@/lib/requireAuth";

export const metadata: Metadata = {
  title: "Quên mật khẩu",
  robots: { index: false },
};

export default async function ForgotPasswordPage() {
  // BR-S09: trang chỉ dành cho khách — đã đăng nhập thì đổi mật khẩu trong Hồ sơ.
  await redirectIfAuthenticated(undefined);

  return (
    <div className="w-full max-w-7xl mx-auto overflow-x-clip px-4 md:px-6 lg:px-8 py-12 md:py-20">
      <div className="mb-6 flex justify-center md:mb-8">
        <BrandLogo priority className="h-16 md:h-[76px]" />
      </div>
      <Suspense>
        <ForgotPasswordFlow />
      </Suspense>
    </div>
  );
}
