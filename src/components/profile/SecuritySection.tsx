"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { KeyRound, LogOut, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ConfirmDangerModal } from "@/components/ui/ConfirmDangerModal";
import { useToast } from "@/components/ui/ToastProvider";
import { getApiErrorMessage, getNetworkErrorMessage } from "@/lib/errorMessages";
import { isPasswordValid, PASSWORD_POLICY_MESSAGE } from "@/lib/password";

interface SecuritySectionProps {
  authProvider: "local" | "google";
}

export function SecuritySection({ authProvider }: SecuritySectionProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOutEverywhere, setIsLoggingOutEverywhere] = useState(false);
  const { showToast } = useToast();
  const router = useRouter();
  const { update: updateSession } = useSession();

  async function signOutWithToast(message: string) {
    // signOut mặc định điều hướng bằng window.location (full reload) — làm mất
    // toast ngay lập tức. Dùng redirect:false rồi tự chuyển trang bằng router
    // để ToastProvider (ở root layout) không bị unmount trước khi kịp hiện.
    await signOut({ redirect: false });
    showToast(message, "info");
    router.push("/");
    router.refresh();
  }

  async function handleChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError(null);

    if (!isPasswordValid(newPassword)) {
      setPasswordError(PASSWORD_POLICY_MESSAGE);
      showToast(PASSWORD_POLICY_MESSAGE, "error");
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json();
      setIsChangingPassword(false);

      if (!response.ok) {
        const message = getApiErrorMessage(response.status, data.error);
        setPasswordError(message);
        showToast(message, "error");
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      // Đổi mật khẩu bump sessionVersion để thu hồi thiết bị khác — đồng bộ lại
      // token của thiết bị hiện tại để không tự đăng xuất chính mình.
      await updateSession();
      showToast("Đã đổi mật khẩu thành công! Các thiết bị khác đã bị đăng xuất.", "success");
    } catch {
      setIsChangingPassword(false);
      showToast(getNetworkErrorMessage(), "error");
    }
  }

  async function handleLogoutEverywhere() {
    setIsLoggingOutEverywhere(true);
    try {
      await fetch("/api/account", { method: "POST" });
      await signOutWithToast("Đã đăng xuất khỏi mọi thiết bị.");
    } finally {
      setIsLoggingOutEverywhere(false);
      setIsLogoutModalOpen(false);
    }
  }

  return (
    <div id="bao-mat" className="scroll-mt-24 flex flex-col gap-4">
      {authProvider === "local" ? (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <KeyRound className="size-5 text-primary" aria-hidden />
            <h2 className="font-semibold text-text-primary">Đổi mật khẩu</h2>
          </div>
          <form onSubmit={handleChangePassword} className="flex flex-col gap-3 max-w-sm">
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              placeholder="Mật khẩu hiện tại"
              className="h-11 px-4 rounded-xl border border-border bg-surface focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            />
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="Mật khẩu mới (8+ ký tự, có chữ, số, ký tự đặc biệt)"
              className="h-11 px-4 rounded-xl border border-border bg-surface focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            />
            <p className="text-xs text-text-secondary -mt-1">{PASSWORD_POLICY_MESSAGE}</p>
            {passwordError && <p className="text-sm text-red-600 dark:text-red-400">{passwordError}</p>}
            <Button type="submit" size="sm" isLoading={isChangingPassword} className="self-start">
              Đổi mật khẩu
            </Button>
          </form>
        </Card>
      ) : (
        <Card className="p-6 flex items-center gap-3">
          <ShieldCheck className="size-5 text-primary shrink-0" aria-hidden />
          <p className="text-sm text-text-secondary">
            Tài khoản đăng nhập bằng Google — mật khẩu được quản lý bởi Google, không đổi được tại đây.
          </p>
        </Card>
      )}

      <Card className="p-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <LogOut className="size-5 text-primary" aria-hidden />
            <h2 className="font-semibold text-text-primary">Phiên đăng nhập</h2>
          </div>
          <p className="text-sm text-text-secondary">
            Đăng xuất khỏi mọi thiết bị khác đang đăng nhập bằng tài khoản này (kể cả thiết bị bạn quên đăng xuất).
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setIsLogoutModalOpen(true)}>
          Đăng xuất khỏi mọi thiết bị
        </Button>
      </Card>

      <ConfirmDangerModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogoutEverywhere}
        isLoading={isLoggingOutEverywhere}
        title="Đăng xuất khỏi mọi thiết bị?"
        description="Bạn (và mọi thiết bị khác đang đăng nhập bằng tài khoản này) sẽ bị đăng xuất ngay, kể cả thiết bị hiện tại."
        confirmLabel="Đăng xuất tất cả"
      />
    </div>
  );
}
