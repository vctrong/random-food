"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { signOut, useSession } from "next-auth/react";
import { Dices, LogOut, Settings, User, X } from "lucide-react";
import { MAIN_NAV_LINKS, isActiveRoute } from "@/constants/navigation";
import { BrandMark } from "@/components/ui/BrandMark";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { cn } from "@/lib/utils";

interface MobileMenuSheetProps {
  open: boolean;
  pathname: string;
  onClose: () => void;
}

/** Menu trượt từ trên xuống (dưới lg) — mở bằng nút "đôi đũa" trên navbar mobile. */
export function MobileMenuSheet({ open, pathname, onClose }: MobileMenuSheetProps) {
  const { data: session, status } = useSession();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const user = status === "authenticated" ? session?.user : null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="mobile-menu"
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Menu điều hướng"
          initial={{ y: "-100%", opacity: 0.6 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-100%", opacity: 0.6 }}
          transition={{ type: "spring", stiffness: 320, damping: 34 }}
          className="fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-background px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] lg:hidden"
        >
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-accent-soft opacity-70 [mask-image:linear-gradient(to_bottom,black,transparent)]" />

          <div className="relative flex items-center justify-between border-b border-accent/30 pb-3">
            <Link href="/" onClick={onClose}>
              <BrandMark />
            </Link>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Đóng menu"
              className="inline-flex size-11 items-center justify-center rounded-full border border-accent/50 bg-surface text-accent-ink shadow-sm"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>

          <nav className="relative mt-4 flex flex-col gap-2.5">
            {MAIN_NAV_LINKS.map(({ href, label, icon: Icon }, index) => {
              const isActive = isActiveRoute(pathname, href);
              const isRandom = href === "/random";
              return (
                <motion.div
                  key={href}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 + index * 0.04 }}
                >
                  <Link
                    href={href}
                    onClick={onClose}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex min-h-12 items-center justify-between gap-3 rounded-2xl border px-4 py-3 font-heading text-base shadow-sm",
                      isActive
                        ? "border-primary/40 bg-primary-soft text-primary-strong dark:text-primary"
                        : isRandom
                          ? "border-accent/50 bg-accent-soft text-accent-ink"
                          : "border-border bg-surface text-text-primary",
                    )}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className={cn("size-5", isRandom && !isActive && "animate-dice-wiggle")} aria-hidden />
                      {label}
                    </span>
                    {isActive && (
                      <span className="rounded-full bg-primary-strong px-2 py-0.5 font-body text-[11px] font-bold text-white">
                        Hiện tại
                      </span>
                    )}
                  </Link>
                </motion.div>
              );
            })}
          </nav>

          <div className="relative mt-auto space-y-3 border-t border-accent/30 pt-4">
            <div className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-2.5">
              <span className="text-sm font-semibold text-text-primary">Giao diện</span>
              <ThemeToggle />
            </div>

            {user ? (
              <div className="rounded-2xl border border-border bg-surface p-3">
                <div className="flex items-center gap-3">
                  {user.image ? (
                    <Image src={user.image} alt="" width={40} height={40} className="size-10 rounded-full object-cover" />
                  ) : (
                    <span className="inline-flex size-10 items-center justify-center rounded-full bg-primary-soft font-semibold text-primary">
                      {(user.name ?? user.email ?? "?").charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-text-primary">{user.name}</p>
                    <p className="truncate text-xs text-text-secondary">{user.email}</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs font-bold">
                  <Link href="/ho-so" onClick={onClose} className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-primary-soft text-primary-strong dark:text-primary">
                    <User className="size-4" aria-hidden />
                    Hồ sơ
                  </Link>
                  <Link href="/cai-dat" onClick={onClose} className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-primary-soft text-primary-strong dark:text-primary">
                    <Settings className="size-4" aria-hidden />
                    Cài đặt
                  </Link>
                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-accent-soft text-accent-ink"
                  >
                    <LogOut className="size-4" aria-hidden />
                    Đăng xuất
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/dang-nhap"
                  onClick={onClose}
                  className="flex min-h-11 items-center justify-center rounded-xl border border-primary bg-surface text-sm font-bold text-primary-strong dark:text-primary"
                >
                  Đăng nhập
                </Link>
                <Link
                  href="/dang-ky"
                  onClick={onClose}
                  className="flex min-h-11 items-center justify-center rounded-xl bg-primary-strong text-sm font-bold text-white"
                >
                  Đăng ký ngay
                </Link>
              </div>
            )}

            <Link
              href="/random"
              onClick={onClose}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary-strong font-heading text-base text-white shadow-[0_4px_0_0_var(--color-primary-strong-hover)] transition-transform active:translate-y-1"
            >
              <Dices className="size-5" aria-hidden />
              Random món ăn ngay
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
