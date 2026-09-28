import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { redirectIfAuthenticated } from "@/lib/requireAuth";

export const metadata: Metadata = {
  title: "Đăng nhập",
};

export default async function LoginPage({ searchParams }: PageProps<"/dang-nhap">) {
  // BR-S09: đã đăng nhập thì chuyển đi ở server, form không kịp render.
  await redirectIfAuthenticated((await searchParams).callbackUrl);

  return (
    <div className="w-full max-w-7xl mx-auto overflow-x-clip px-4 md:px-6 lg:px-8 py-12 md:py-20">
      <div className="mb-6 flex justify-center md:mb-8">
        <BrandLogo priority className="h-16 md:h-[76px]" />
      </div>
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
