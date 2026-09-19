import { connectDB } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { AuditLog } from "@/lib/models/AuditLog";
import { createNotification } from "@/lib/notify";
import type { AccountStatus, AdminUserRow, UserRole } from "@/types/admin";

export async function getUsers(): Promise<AdminUserRow[]> {
  await connectDB();
  const users = await User.find({}).sort({ createdAt: -1 }).lean();

  return users.map((user) => ({
    id: String(user._id),
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl ?? null,
    role: (user.role ?? "user") as UserRole,
    accountStatus: (user.accountStatus ?? "active") as AccountStatus,
    warningCount: user.warningCount ?? 0,
    authProvider: (user.authProvider ?? "local") as "local" | "google",
    isVerified: user.isVerified ?? false,
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
    createdAt: (user.createdAt ?? new Date()).toISOString(),
  }));
}

type UserActionError = "NOT_FOUND" | "CANNOT_DEMOTE_SELF";

interface ChangeRoleInput {
  adminId: string;
  targetUserId: string;
  role: UserRole;
}

export async function changeUserRole({
  adminId,
  targetUserId,
  role,
}: ChangeRoleInput): Promise<{ error: UserActionError | null }> {
  await connectDB();
  const user = await User.findById(targetUserId);
  if (!user) return { error: "NOT_FOUND" };
  if (String(user._id) === adminId && role !== "admin") {
    // Tránh admin tự hạ quyền chính mình, có thể khiến hệ thống mất người quản trị.
    return { error: "CANNOT_DEMOTE_SELF" };
  }

  const previousRole = user.role;
  user.role = role;
  await user.save();

  await AuditLog.create({
    actorId: adminId,
    action: "change_user_role",
    targetType: "user",
    targetId: targetUserId,
    reason: `Đổi role từ "${previousRole}" sang "${role}"`,
    metadata: { name: user.name },
  });

  return { error: null };
}

interface SetAccountStatusInput {
  adminId: string;
  targetUserId: string;
  status: AccountStatus;
  reason: string;
}

export async function setAccountStatus({
  adminId,
  targetUserId,
  status,
  reason,
}: SetAccountStatusInput): Promise<{ error: UserActionError | null }> {
  await connectDB();
  const user = await User.findById(targetUserId);
  if (!user) return { error: "NOT_FOUND" };
  if (String(user._id) === adminId && status === "banned") {
    return { error: "CANNOT_DEMOTE_SELF" };
  }

  user.accountStatus = status;
  if (status === "banned") {
    user.sessionVersion = (user.sessionVersion ?? 0) + 1; // thu hồi mọi session đang hoạt động
  }
  await user.save();

  await AuditLog.create({
    actorId: adminId,
    action: status === "banned" ? "ban_user" : "unban_user",
    targetType: "user",
    targetId: targetUserId,
    reason: reason.trim() || undefined,
    metadata: { name: user.name },
  });

  await createNotification({
    userId: targetUserId,
    type: status === "banned" ? "account_banned" : "account_unbanned",
    message:
      status === "banned"
        ? `Tài khoản của bạn đã bị khoá.${reason.trim() ? ` Lý do: ${reason.trim()}` : ""}`
        : "Tài khoản của bạn đã được mở khoá.",
  });

  return { error: null };
}
