import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  Flag,
  KeyRound,
  Lock,
  LockOpen,
  MessageSquareText,
  PencilLine,
  RefreshCw,
  ScanSearch,
  Undo2,
  Tag,
  Trash2,
  Wrench,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { NotificationIconKey, NotificationTone } from "@/features/notifications/notificationContent";

export const NOTIFICATION_ICONS: Record<NotificationIconKey, LucideIcon> = {
  check: CheckCircle2,
  x: XCircle,
  pencil: PencilLine,
  wrench: Wrench,
  refresh: RefreshCw,
  tag: Tag,
  flag: Flag,
  trash: Trash2,
  lock: Lock,
  unlock: LockOpen,
  badge: BadgeCheck,
  key: KeyRound,
  alert: AlertTriangle,
  search: ScanSearch,
  undo: Undo2,
  message: MessageSquareText,
};

/** Ô icon theo tông — chỉ token thương hiệu (CLAUDE.md 4.3), chữ trên nền nhạt đạt tương phản cả 2 theme. */
export const NOTIFICATION_TONE_CLASSES: Record<NotificationTone, string> = {
  primary: "bg-primary-soft text-primary-strong dark:text-primary",
  accent: "bg-accent-soft text-accent-ink",
  secondary: "bg-secondary-soft text-secondary-strong dark:text-text-primary",
  success: "bg-success/15 text-success",
  warning: "bg-warning/20 text-secondary-strong dark:text-warning",
};
