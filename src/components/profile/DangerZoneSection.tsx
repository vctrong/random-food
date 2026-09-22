"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ConfirmDangerModal } from "@/components/ui/ConfirmDangerModal";
import { useToast } from "@/components/ui/ToastProvider";

interface DangerZoneSectionProps {
  email: string;
}

export function DangerZoneSection({ email }: DangerZoneSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { showToast } = useToast();
  const router = useRouter();

  async function handleDeleteAccount() {
    setIsDeleting(true);
    try {
      await fetch("/api/account", { method: "DELETE" });
      await signOut({ redirect: false });
      showToast("Tài khoản đã được khoá và bạn đã đăng xuất. Liên hệ Admin nếu muốn mở lại.", "info");
      router.push("/");
      router.refresh();
    } finally {
      setIsDeleting(false);
      setIsModalOpen(false);
    }
  }

  return (
    <div id="nguy-hiem" className="scroll-mt-24">
      <Card className="p-6 border-red-200 dark:border-red-500/30">
        <h2 className="font-semibold text-red-600 dark:text-red-400 mb-1">Vùng nguy hiểm</h2>
        <p className="text-sm text-text-secondary mb-4">
          Xoá tài khoản sẽ khoá đăng nhập ngay lập tức (soft-delete — cần Admin mở lại nếu muốn dùng lại). Dữ liệu đóng góp cũ vẫn được giữ cho mục đích kiểm duyệt.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          leftIcon={<Trash2 className="size-4" aria-hidden />}
          className="!text-red-600 dark:!text-red-400 !border-red-200 dark:!border-red-500/30 hover:!bg-red-50 dark:hover:!bg-red-500/10"
        >
          Xoá tài khoản
        </Button>
      </Card>

      <ConfirmDangerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleDeleteAccount}
        isLoading={isDeleting}
        title="Xoá tài khoản này?"
        description="Hành động này khoá tài khoản ngay và đăng xuất bạn khỏi mọi thiết bị. Không thể tự mở lại — cần liên hệ Admin."
        confirmLabel="Xoá tài khoản"
        requireTypedConfirmation={email}
      />
    </div>
  );
}
