"use client";

import { useState } from "react";
import { Bell, ChefHat, ChevronDown, Info, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Toggle } from "@/components/ui/Toggle";
import { cn } from "@/lib/utils";

interface NotificationItem {
  type: string;
  label: string;
  description: string;
  /** true = bắt buộc, không cho tắt (thông báo bảo mật quan trọng). */
  locked?: boolean;
}

interface NotificationGroup {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  items: NotificationItem[];
}

interface NotificationsSectionProps {
  initialPrefs: Record<string, boolean>;
  hasAppliedReviewer: boolean;
  onChange: (prefs: Record<string, boolean>) => void;
}

function buildGroups(hasAppliedReviewer: boolean): NotificationGroup[] {
  const groups: NotificationGroup[] = [
    {
      id: "contributions",
      title: "Đóng góp của bạn",
      description: "Cập nhật khi món/quán bạn đóng góp được xử lý.",
      icon: ChefHat,
      items: [
        { type: "food_approved", label: "Nội dung được duyệt", description: "Món/quán bạn gửi đã được công khai." },
        { type: "food_rejected", label: "Nội dung bị từ chối", description: "Món/quán bạn gửi không được duyệt." },
        { type: "food_needs_revision", label: "Cần chỉnh sửa", description: "Nội dung cần bổ sung trước khi duyệt lại." },
        { type: "report_handled", label: "Report của bạn đã xử lý", description: "Report bạn gửi lên đã có kết quả." },
      ],
    },
    {
      id: "security",
      title: "Bảo mật tài khoản",
      description: "Các thông báo quan trọng về bảo mật — phần lớn bắt buộc bật để bạn kịp phát hiện bất thường.",
      icon: ShieldCheck,
      items: [
        {
          type: "account_banned",
          label: "Tài khoản bị khoá",
          description: "Bắt buộc — để bạn biết ngay khi tài khoản bị hạn chế.",
          locked: true,
        },
        {
          type: "account_unbanned",
          label: "Tài khoản được mở khoá",
          description: "Bắt buộc — xác nhận tài khoản đã hoạt động lại.",
          locked: true,
        },
        {
          type: "login_failed",
          label: "Đăng nhập thất bại",
          description: "Bắt buộc — cảnh báo sớm nếu có người cố đăng nhập trái phép.",
          locked: true,
        },
        {
          type: "password_changed",
          label: "Đổi mật khẩu",
          description: "Bắt buộc — xác nhận mật khẩu vừa được thay đổi.",
          locked: true,
        },
        { type: "login_success", label: "Đăng nhập thành công", description: "Tuỳ chọn — báo mỗi lần đăng nhập, có thể tắt để đỡ spam." },
      ],
    },
    {
      id: "system",
      title: "Hệ thống",
      description: "Thông báo chung từ NayAnGi (bảo trì, thay đổi lớn...).",
      icon: Info,
      items: [
        {
          type: "system",
          label: "Thông báo hệ thống",
          description: "Hiện chưa có sự kiện nào trong hệ thống gửi loại thông báo này — để sẵn cho các cập nhật sau này.",
        },
      ],
    },
  ];

  if (hasAppliedReviewer) {
    groups.splice(1, 0, {
      id: "reviewer",
      title: "Ứng tuyển FoodReviewer",
      description: "Cập nhật kết quả đơn ứng tuyển bạn đã nộp.",
      icon: Bell,
      items: [
        {
          type: "reviewer_application_result",
          label: "Kết quả ứng tuyển FoodReviewer",
          description: "Admin đã duyệt hoặc từ chối đơn ứng tuyển của bạn.",
        },
      ],
    });
  }

  return groups;
}

export function NotificationsSection({ initialPrefs, hasAppliedReviewer, onChange }: NotificationsSectionProps) {
  const [prefs, setPrefs] = useState(initialPrefs);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const groups = buildGroups(hasAppliedReviewer);

  function updatePrefs(next: Record<string, boolean>) {
    setPrefs(next);
    onChange(next);
  }

  function toggleItem(type: string) {
    updatePrefs({ ...prefs, [type]: !prefs[type] });
  }

  function toggleGroup(group: NotificationGroup) {
    const optionalItems = group.items.filter((item) => !item.locked);
    if (optionalItems.length === 0) return;
    const allOn = optionalItems.every((item) => prefs[item.type] ?? false);
    const next = { ...prefs };
    for (const item of optionalItems) next[item.type] = !allOn;
    updatePrefs(next);
  }

  function toggleExpanded(id: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <section id="thong-bao" className="bg-surface rounded-2xl p-6 shadow-sm space-y-4 scroll-mt-24">
      <div className="flex items-center gap-3 pb-3 border-b border-border">
        <span className="inline-flex p-2 rounded-xl bg-soft-pink text-primary-pink">
          <Bell className="size-5" aria-hidden />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Thông báo</h2>
          <p className="text-sm text-text-secondary">Chọn loại thông báo bạn muốn nhận, theo từng nhóm.</p>
        </div>
      </div>

      <div className="space-y-3">
        {groups.map((group) => {
          const optionalItems = group.items.filter((item) => !item.locked);
          const isExpanded = expandedGroups.has(group.id);
          const allOptionalOn = optionalItems.length > 0 && optionalItems.every((item) => prefs[item.type] ?? false);

          return (
            <div key={group.id} className="rounded-xl border border-border overflow-hidden">
              {/* 2 button riêng biệt (không lồng nhau — <button> không được chứa <button> theo spec HTML):
                  vùng label mở rộng/thu gọn, Toggle + nút mũi tên nằm ngoài. */}
              <div className="w-full flex items-center justify-between gap-3 p-4 hover:bg-soft-blue/20 transition-colors">
                <button
                  type="button"
                  onClick={() => toggleExpanded(group.id)}
                  aria-expanded={isExpanded}
                  className="flex items-center gap-3 min-w-0 flex-1 text-left"
                >
                  <group.icon className="size-4.5 text-primary-blue shrink-0" aria-hidden />
                  <div className="min-w-0">
                    <p className="font-semibold text-text-primary">{group.title}</p>
                    <p className="text-xs text-text-secondary truncate">{group.description}</p>
                  </div>
                </button>
                <div className="flex items-center gap-3 shrink-0">
                  {optionalItems.length > 0 && (
                    <Toggle checked={allOptionalOn} onChange={() => toggleGroup(group)} label={`Bật/tắt cả nhóm ${group.title}`} />
                  )}
                  <button
                    type="button"
                    onClick={() => toggleExpanded(group.id)}
                    aria-label={isExpanded ? `Thu gọn nhóm ${group.title}` : `Mở rộng nhóm ${group.title}`}
                    aria-expanded={isExpanded}
                    className="text-text-secondary hover:text-text-primary transition-colors"
                  >
                    <ChevronDown className={cn("size-4 transition-transform", isExpanded && "rotate-180")} aria-hidden />
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="divide-y divide-border border-t border-border">
                  {group.items.map((item) =>
                    item.locked ? (
                      <div key={item.type} className="flex items-center justify-between gap-3 py-3 px-4 bg-soft-blue/10">
                        <div>
                          <p className="text-sm text-text-primary">{item.label}</p>
                          <p className="text-xs text-text-secondary">{item.description}</p>
                        </div>
                        <span className="shrink-0 text-[11px] font-semibold px-2 py-1 rounded-full bg-soft-blue text-primary-blue">
                          Bắt buộc
                        </span>
                      </div>
                    ) : (
                      <div key={item.type} className="flex items-center justify-between gap-3 py-3 px-4">
                        <div>
                          <p className="text-sm text-text-primary">{item.label}</p>
                          <p className="text-xs text-text-secondary">{item.description}</p>
                        </div>
                        <Toggle checked={prefs[item.type] ?? false} onChange={() => toggleItem(item.type)} label={item.label} />
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
