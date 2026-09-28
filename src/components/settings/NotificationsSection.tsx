"use client";

import { useState, type ReactNode } from "react";
import { Bell, ChefHat, Flag, Lock, MailWarning, ShieldCheck, ShieldHalf, UserCog, type LucideIcon } from "lucide-react";
import { Toggle } from "@/components/ui/Toggle";
import { cn } from "@/lib/utils";

/**
 * Bảng loại thông báo × kênh (docs/notifications.md mục 8). Thông báo trong app
 * luôn bật nên không có cột riêng; Push chưa ra mắt → cột disabled.
 */

type EmailRule =
  | { kind: "optional"; type: string }
  | { kind: "mandatory"; why: string }
  | { kind: "none"; why?: string };

interface SettingRow {
  label: string;
  description: string;
  email: EmailRule;
}

interface SettingGroup {
  id: string;
  title: string;
  icon: LucideIcon;
  rows: SettingRow[];
  roles?: ("foodreviewer" | "admin")[];
}

const GROUPS: SettingGroup[] = [
  {
    id: "contributions",
    title: "Đóng góp của bạn",
    icon: ChefHat,
    rows: [
      { label: "Món/quán được duyệt", description: "Đóng góp của bạn đã được công khai.", email: { kind: "optional", type: "food_approved" } },
      { label: "Món/quán bị từ chối", description: "Kèm lý do từ đội kiểm duyệt.", email: { kind: "optional", type: "food_rejected" } },
      { label: "Cần bạn chỉnh sửa", description: "Kèm góp ý, có nút mở thẳng form sửa.", email: { kind: "optional", type: "food_needs_revision" } },
      { label: "Thông tin được chỉnh giúp", description: "Đội kiểm duyệt sửa giá, địa chỉ, vị trí hoặc giờ mở cửa.", email: { kind: "none" } },
      { label: "Kết quả đề xuất danh mục", description: "Đề xuất được duyệt, gộp hoặc từ chối.", email: { kind: "none" } },
    ],
  },
  {
    id: "reports",
    title: "Báo cáo & nội dung",
    icon: Flag,
    rows: [
      { label: "Báo cáo của bạn đã được xử lý", description: "Kết quả sau khi Admin xem xét báo cáo bạn gửi.", email: { kind: "none" } },
      { label: "Nội dung của bạn bị gỡ", description: "Đánh giá, món hoặc quán bị gỡ do vi phạm, kèm lý do.", email: { kind: "optional", type: "content_removed" } },
    ],
  },
  {
    id: "account",
    title: "Tài khoản & bảo mật",
    icon: ShieldCheck,
    rows: [
      {
        label: "Tài khoản bị khoá / mở khoá",
        description: "Trạng thái truy cập tài khoản của bạn.",
        email: { kind: "mandatory", why: "Bạn cần biết ngay khi quyền truy cập tài khoản thay đổi, kể cả lúc không mở app." },
      },
      {
        label: "Thay đổi vai trò",
        description: "Admin đổi vai trò tài khoản của bạn.",
        email: { kind: "mandatory", why: "Vai trò quyết định bạn làm được gì trong app nên luôn được báo qua email." },
      },
      {
        label: "Kết quả ứng tuyển FoodReviewer",
        description: "Email chỉ gửi khi đơn được duyệt (vai trò thay đổi).",
        email: { kind: "mandatory", why: "Được duyệt nghĩa là vai trò của bạn thay đổi — luôn báo qua email." },
      },
      {
        label: "Đổi / tạo mật khẩu",
        description: "Mật khẩu tài khoản vừa được thay đổi.",
        email: { kind: "mandatory", why: "Giúp bạn phát hiện kịp nếu có người khác đổi mật khẩu của bạn." },
      },
      {
        label: "Đăng nhập không thành công",
        description: "Có người đăng nhập sai mật khẩu vào tài khoản của bạn.",
        email: { kind: "none", why: "Không gửi email để kẻ xấu không lợi dụng dội thư vào hộp thư của bạn." },
      },
    ],
  },
  {
    id: "reviewer",
    title: "Kiểm duyệt",
    icon: ShieldHalf,
    roles: ["foodreviewer", "admin"],
    rows: [
      { label: "Người dùng đã sửa theo góp ý", description: "Đóng góp bạn yêu cầu sửa đã được gửi lại.", email: { kind: "none" } },
    ],
  },
  {
    id: "admin",
    title: "Quản trị",
    icon: UserCog,
    roles: ["admin"],
    rows: [{ label: "Có báo cáo mới", description: "Mỗi case báo cáo mới mở gửi 1 thông báo.", email: { kind: "none" } }],
  },
];

interface NotificationsSectionProps {
  initialEmailPrefs: Record<string, boolean>;
  role: string;
  onChange: (prefs: Record<string, boolean>) => void;
}

export function NotificationsSection({ initialEmailPrefs, role, onChange }: NotificationsSectionProps) {
  const [prefs, setPrefs] = useState(initialEmailPrefs);
  const groups = GROUPS.filter((group) => !group.roles || group.roles.includes(role as "foodreviewer" | "admin"));
  const anyEmailOn = Object.values(prefs).some(Boolean);

  function toggle(type: string) {
    const next = { ...prefs, [type]: !prefs[type] };
    setPrefs(next);
    onChange(next);
  }

  return (
    <section id="thong-bao" className="scroll-mt-24 space-y-5 rounded-2xl bg-surface p-6 shadow-sm">
      <div className="flex items-center gap-3 border-b border-border pb-3">
        <span className="inline-flex rounded-xl bg-accent-soft p-2 text-accent-ink">
          <Bell className="size-5" aria-hidden />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Thông báo</h2>
          <p className="text-sm text-text-secondary">
            Mọi thông báo luôn có trong app (biểu tượng chuông). Chọn thêm loại nào muốn nhận qua email.
          </p>
        </div>
      </div>

      {anyEmailOn && (
        <p className="flex items-start gap-2 rounded-xl bg-primary-soft/60 px-3.5 py-2.5 text-sm text-text-primary">
          <MailWarning className="mt-0.5 size-4 shrink-0 text-primary-strong dark:text-primary" aria-hidden />
          <span>Không thấy email? Nhớ kiểm tra thư mục Spam/Quảng cáo và đánh dấu “Không phải spam” để lần sau vào hộp thư chính nha.</span>
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-border">
        {/* Hàng tiêu đề cột — ẩn trên mobile (mỗi dòng tự ghi nhãn kênh). */}
        <div className="hidden grid-cols-[1fr_7rem_7rem] items-center gap-3 border-b border-border bg-background px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-text-secondary sm:grid">
          <span>Loại thông báo</span>
          <span className="text-center">Email</span>
          <span className="text-center">
            Push
            <span className="ml-1 rounded-full bg-accent-soft px-1.5 py-0.5 text-[10px] normal-case tracking-normal text-accent-ink">
              Sắp ra mắt
            </span>
          </span>
        </div>

        {groups.map((group) => (
          <div key={group.id} role="group" aria-labelledby={`notif-group-${group.id}`}>
            <p
              id={`notif-group-${group.id}`}
              className="flex items-center gap-2 border-b border-border bg-primary-soft/25 px-4 py-2 text-sm font-semibold text-text-primary"
            >
              <group.icon className="size-4 text-primary" aria-hidden />
              {group.title}
            </p>
            <ul className="divide-y divide-border border-b border-border last:border-b-0">
              {group.rows.map((row) => (
                <li key={row.label} className="grid gap-3 px-4 py-3 sm:grid-cols-[1fr_7rem_7rem] sm:items-center">
                  <div>
                    <p className="text-sm text-text-primary">{row.label}</p>
                    <p className="text-xs text-text-secondary">{row.description}</p>
                  </div>
                  <ChannelCell label="Email">
                    <EmailCell rule={row.email} label={row.label} prefs={prefs} onToggle={toggle} />
                  </ChannelCell>
                  <ChannelCell label="Push">
                    <span title="Sắp ra mắt">
                      <Toggle checked={false} onChange={() => undefined} disabled label={`Push: ${row.label} (sắp ra mắt)`} />
                    </span>
                  </ChannelCell>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Mobile: "Email ....... [toggle]" theo hàng; từ sm là 1 ô căn giữa trong lưới cột. */
function ChannelCell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 sm:justify-center">
      <span className="text-xs font-semibold text-text-secondary sm:hidden">
        {label}
        {label === "Push" && <span className="ml-1 font-normal">(sắp ra mắt)</span>}
      </span>
      {children}
    </div>
  );
}

function EmailCell({
  rule,
  label,
  prefs,
  onToggle,
}: {
  rule: EmailRule;
  label: string;
  prefs: Record<string, boolean>;
  onToggle: (type: string) => void;
}) {
  if (rule.kind === "optional") {
    return <Toggle checked={prefs[rule.type] ?? false} onChange={() => onToggle(rule.type)} label={`Email: ${label}`} />;
  }
  if (rule.kind === "mandatory") {
    return (
      <span
        title={rule.why}
        className="group/lock relative inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-1 text-[11px] font-semibold text-primary-strong dark:text-primary"
        tabIndex={0}
        aria-label={`Email bắt buộc: ${rule.why}`}
      >
        <Lock className="size-3" aria-hidden />
        Bắt buộc
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full right-0 z-20 mb-2 hidden w-60 rounded-xl border border-border bg-surface p-2.5 text-left text-xs font-normal text-text-primary shadow-lg group-hover/lock:block group-focus/lock:block sm:left-1/2 sm:right-auto sm:-translate-x-1/2"
        >
          {rule.why}
        </span>
      </span>
    );
  }
  return (
    <span title={rule.why} className={cn("text-xs text-text-secondary", rule.why && "cursor-help underline decoration-dotted")}>
      Chỉ trong app
    </span>
  );
}
