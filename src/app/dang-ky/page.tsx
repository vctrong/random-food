import type { Metadata } from "next";
import { Suspense } from "react";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { BrandLogo } from "@/components/ui/BrandLogo";

export const metadata: Metadata = {
  title: "Đăng ký",
};

export default function RegisterPage() {
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
