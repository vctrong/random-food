import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Đăng nhập | Hôm Nay Ăn Gì?",
};

export default function LoginPage() {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-12 md:py-20">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
