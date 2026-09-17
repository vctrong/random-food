"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { KeyRound, LogOut, Mail, ShieldAlert, ShieldCheck, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { useToast } from "@/components/ui/ToastProvider";
import { getApiErrorMessage, getNetworkErrorMessage } from "@/lib/errorMessages";
import { isPasswordValid, PASSWORD_POLICY_MESSAGE } from "@/lib/password";

const NOTIFICATION_LABELS: Record<string, string> = {
  food_approved: "Nội dung đóng góp được duyệt",
  food_rejected: "Nội dung đóng góp bị từ chối",
  food_needs_revision: "Nội dung cần chỉnh sửa",
  report_handled: "Report của bạn đã được xử lý",
  reviewer_application_result: "Kết quả ứng tuyển FoodReviewer",
  system: "Thông báo hệ thống",
  login_success: "Đăng nhập thành công",
  login_failed: "Đăng nhập thất bại",
  account_banned: "Tài khoản bị khóa",
  account_unbanned: "Tài khoản được mở khóa",
  password_changed: "Đổi mật khẩu",
};

interface AccountSectionProps {
  email: string;
  authProvider: "local" | "google";
  initialNotificationPrefs: Record<string, boolean>;
}

export function AccountSection({ email, authProvider, initialNotificationPrefs }: AccountSectionProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState(initialNotificationPrefs);
  const [isDeleting, setIsDeleting] = useState(false);
  const { showToast } = useToast();
  const router = useRouter();
  const { update: updateSession } = useSession();

  // signOut mặc định điều hướng bằng window.location (full reload) — làm mất
  // toast ngay lập tức. Dùng redirect:false rồi tự chuyển trang bằng router
  // để ToastProvider (ở root layout) không bị unmount trước khi kịp hiện.
  async function signOutWithToast(message: string) {
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
      // Đổi mật khẩu bumping sessionVersion để thu hồi các thiết bị khác — đồng bộ
      // lại token của thiết bị hiện tại để không tự đăng xuất chính mình.
      await updateSession();
      showToast("Đã đổi mật khẩu thành công! Các thiết bị khác đã bị đăng xuất.", "success");
    } catch {
      setIsChangingPassword(false);
      showToast(getNetworkErrorMessage(), "error");
    }
  }

  async function toggleNotification(type: string) {
    const next = { ...notificationPrefs, [type]: !notificationPrefs[type] };
    setNotificationPrefs(next);
    await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationPrefs: next }),
    });
  }

  async function handleDeleteAccount() {
    if (!window.confirm("Bạn chắc chắn muốn xoá/khoá tài khoản? Hành động này cần Admin mở lại.")) {
      return;
    }
    setIsDeleting(true);
    await fetch("/api/account", { method: "DELETE" });
    await signOutWithToast("Tài khoản đã được khoá và bạn đã đăng xuất.");
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="size-5 text-primary-blue" aria-hidden />
          <h2 className="font-semibold text-text-primary">Thông tin tài khoản</h2>
        </div>
        <p className="text-sm text-text-secondary">Email đăng nhập</p>
        <p className="text-text-primary font-medium">{email}</p>
      </Card>

      {authProvider === "local" ? (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <KeyRound className="size-5 text-primary-blue" aria-hidden />
            <h2 className="font-semibold text-text-primary">Đổi mật khẩu</h2>
          </div>
          <form onSubmit={handleChangePassword} className="flex flex-col gap-3 max-w-sm">
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              placeholder="Mật khẩu hiện tại"
              className="h-11 px-4 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary-blue/40 focus:border-primary-blue"
            />
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="Mật khẩu mới (8+ ký tự, có chữ, số, ký tự đặc biệt)"
              className="h-11 px-4 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary-blue/40 focus:border-primary-blue"
            />
            <p className="text-xs text-text-secondary -mt-1">{PASSWORD_POLICY_MESSAGE}</p>
            {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
            <Button type="submit" size="sm" isLoading={isChangingPassword} className="self-start">
              Đổi mật khẩu
            </Button>
          </form>
        </Card>
      ) : (
        <Card className="p-6 flex items-center gap-3">
          <ShieldCheck className="size-5 text-primary-blue" aria-hidden />
          <p className="text-sm text-text-secondary">
            Tài khoản đăng nhập bằng Google — mật khẩu được quản lý bởi Google.
          </p>
        </Card>
      )}

      <Card className="p-6">
        <h2 className="font-semibold text-text-primary mb-4">Thông báo</h2>
        <div className="flex flex-col divide-y divide-border">
          {Object.entries(NOTIFICATION_LABELS).map(([type, label]) => (
            <div key={type} className="flex items-center justify-between py-2.5">
              <span className="text-sm text-text-primary">{label}</span>
              <Toggle
                checked={notificationPrefs[type] ?? false}
                onChange={() => toggleNotification(type)}
                label={label}
              />
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-2">
          <ShieldAlert className="size-5 text-primary-blue" aria-hidden />
          <h2 className="font-semibold text-text-primary">Quyền riêng tư</h2>
        </div>
        <p className="text-sm text-text-secondary">
          Chi tiết chính sách quyền riêng tư sẽ được cập nhật ở bản sau.
        </p>
      </Card>

      <Card className="p-6">
        <h2 className="font-semibold text-red-600 mb-4">Vùng nguy hiểm</h2>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await fetch("/api/account", { method: "POST" });
              await signOutWithToast("Đã đăng xuất khỏi mọi thiết bị.");
            }}
            leftIcon={<LogOut className="size-4" aria-hidden />}
          >
            Đăng xuất khỏi mọi thiết bị
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeleteAccount}
            isLoading={isDeleting}
            leftIcon={<Trash2 className="size-4" aria-hidden />}
            className="text-red-600"
          >
            Xoá tài khoản
          </Button>
        </div>
      </Card>
    </div>
  );
}
