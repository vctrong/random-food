import type { Metadata } from "next";
import { Suspense } from "react";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = {
  title: "Đăng ký | Hôm Nay Ăn Gì?",
};

export default function RegisterPage() {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-12 md:py-20">
      <Suspense>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
