import type { Metadata } from "next";
import { Suspense } from "react";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { redirectIfAuthenticated } from "@/lib/requireAuth";

export const metadata: Metadata = {
  title: "Đăng ký",
};

export default async function RegisterPage({ searchParams }: PageProps<"/dang-ky">) {
  // BR-S09: đã đăng nhập thì chuyển đi ở server, form không kịp render.
  await redirectIfAuthenticated((await searchParams).callbackUrl);

  return (
    <div className="w-full max-w-7xl mx-auto overflow-x-clip px-4 md:px-6 lg:px-8 py-12 md:py-20">
      <div className="mb-6 flex justify-center md:mb-8">
        <BrandLogo priority className="h-16 md:h-[76px]" />
      </div>
      <Suspense>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
