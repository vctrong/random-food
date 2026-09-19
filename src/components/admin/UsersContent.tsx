"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Lock, Search, ShieldCheck, Unlock, Users as UsersIcon } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import { ACCOUNT_STATUS_LABELS, ROLE_LABELS } from "@/constants/admin";
import { cn, formatDateTime, isAllowedImageHost } from "@/lib/utils";
import type { AdminUserRow, UserRole } from "@/types/admin";

interface UsersContentProps {
  initialUsers: AdminUserRow[];
}

type RoleFilter = "all" | UserRole;
type StatusFilter = "all" | "active" | "banned";

export function UsersContent({ initialUsers }: UsersContentProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [pendingRoleChangeId, setPendingRoleChangeId] = useState<string | null>(null);
  const [banTarget, setBanTarget] = useState<AdminUserRow | null>(null);
  const [banReason, setBanReason] = useState("");
  const [isSubmittingBan, setIsSubmittingBan] = useState(false);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) => {
      if (roleFilter !== "all" && user.role !== roleFilter) return false;
      if (statusFilter !== "all" && user.accountStatus !== statusFilter) return false;
      if (!query) return true;
      return user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query);
    });
  }, [users, search, roleFilter, statusFilter]);

  async function handleRoleChange(userId: string, role: UserRole) {
    setPendingRoleChangeId(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error ?? "Có lỗi xảy ra.", "error");
        return;
      }
      setUsers((prev) => prev.map((user) => (user.id === userId ? { ...user, role } : user)));
      showToast("Đã cập nhật vai trò.", "success");
      router.refresh();
    } finally {
      setPendingRoleChangeId(null);
    }
  }

  async function handleUnban(user: AdminUserRow) {
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, accountStatus: "active" }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error ?? "Có lỗi xảy ra.", "error");
      return;
    }
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, accountStatus: "active" } : u)));
    showToast(`Đã mở khoá tài khoản "${user.name}".`, "success");
    router.refresh();
  }

  async function handleConfirmBan() {
    if (!banTarget) return;
    setIsSubmittingBan(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: banTarget.id, accountStatus: "banned", reason: banReason }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error ?? "Có lỗi xảy ra.", "error");
        return;
      }
      setUsers((prev) => prev.map((u) => (u.id === banTarget.id ? { ...u, accountStatus: "banned" } : u)));
      showToast(`Đã khoá tài khoản "${banTarget.name}".`, "success");
      setBanTarget(null);
      setBanReason("");
      router.refresh();
    } finally {
      setIsSubmittingBan(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <h1 className="text-2xl md:text-3xl font-heading font-semibold text-text-primary tracking-tight">
          Quản lý người dùng &amp; phân quyền
        </h1>
        <p className="text-sm text-text-secondary">
          {users.length} tài khoản · {users.filter((u) => u.accountStatus === "banned").length} đang bị khoá
        </p>
      </div>

      <Card className="p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-text-secondary" aria-hidden />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên hoặc email..."
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-cream text-text-primary text-sm placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-blue/40"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
            className="h-11 px-3 rounded-xl bg-cream text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-blue/40"
          >
            <option value="all">Tất cả vai trò</option>
            <option value="user">Thành viên</option>
            <option value="foodreviewer">FoodReviewer</option>
            <option value="admin">Admin</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="h-11 px-3 rounded-xl bg-cream text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-blue/40"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Hoạt động</option>
            <option value="banned">Đã khoá</option>
          </select>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState icon={UsersIcon} title="Không có người dùng phù hợp" description="Thử đổi bộ lọc hoặc từ khoá tìm kiếm." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-text-secondary">
                  <th className="px-4 py-3 font-semibold">Thành viên</th>
                  <th className="px-4 py-3 font-semibold">Vai trò</th>
                  <th className="px-4 py-3 font-semibold">Trạng thái</th>
                  <th className="px-4 py-3 font-semibold">Cảnh cáo</th>
                  <th className="px-4 py-3 font-semibold">Đăng nhập cuối</th>
                  <th className="px-4 py-3 font-semibold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {isAllowedImageHost(user.avatarUrl) ? (
                          <Image src={user.avatarUrl as string} alt={user.name} width={36} height={36} className="size-9 rounded-full object-cover" />
                        ) : (
                          <span className="size-9 rounded-full bg-soft-blue text-primary-blue font-semibold flex items-center justify-center text-sm">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-text-primary truncate">{user.name}</p>
                          <p className="text-xs text-text-secondary truncate">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={user.role}
                        disabled={pendingRoleChangeId === user.id}
                        onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                        className="h-9 px-2 rounded-lg bg-cream text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-blue/40 disabled:opacity-60"
                      >
                        <option value="user">{ROLE_LABELS.user}</option>
                        <option value="foodreviewer">{ROLE_LABELS.foodreviewer}</option>
                        <option value="admin">{ROLE_LABELS.admin}</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={user.accountStatus === "banned" ? "pink" : "success"}>
                        {ACCOUNT_STATUS_LABELS[user.accountStatus]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("font-semibold", user.warningCount > 0 ? "text-primary-pink" : "text-text-secondary")}>
                        {user.warningCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary text-xs whitespace-nowrap">
                      {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Chưa đăng nhập"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {user.accountStatus === "banned" ? (
                        <Button size="sm" variant="outline" leftIcon={<Unlock className="size-3.5" />} onClick={() => handleUnban(user)}>
                          Mở khoá
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" leftIcon={<Lock className="size-3.5" />} onClick={() => setBanTarget(user)}>
                          Khoá
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal isOpen={!!banTarget} onClose={() => setBanTarget(null)} panelClassName="max-w-md p-6 space-y-4">
        <div className="flex items-center gap-2 text-primary-pink">
          <ShieldCheck className="size-5" aria-hidden />
          <h3 className="font-heading font-semibold text-text-primary">Khoá tài khoản {banTarget?.name}</h3>
        </div>
        <p className="text-sm text-text-secondary">
          Tài khoản sẽ bị đăng xuất khỏi mọi thiết bị và không thể đăng nhập lại cho tới khi được mở khoá.
        </p>
        <textarea
          value={banReason}
          onChange={(e) => setBanReason(e.target.value)}
          placeholder="Lý do khoá tài khoản (tuỳ chọn)..."
          rows={3}
          className="w-full px-3 py-2 rounded-xl bg-cream text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-blue/40 resize-none"
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setBanTarget(null)}>
            Huỷ
          </Button>
          <Button size="sm" isLoading={isSubmittingBan} onClick={handleConfirmBan}>
            Xác nhận khoá
          </Button>
        </div>
      </Modal>
    </div>
  );
}
