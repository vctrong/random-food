"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { BadgeCheck, Bookmark, ChefHat, ChevronDown, ClipboardCheck, History, LogOut, Settings, ShieldCheck, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";

export function UserMenu() {
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (status === "loading") {
    return <div className="size-9 rounded-full bg-soft-blue animate-pulse" />;
  }

  if (status !== "authenticated" || !session?.user) {
    return (
      <div className="flex items-center gap-2 shrink-0">
        <Button href="/dang-nhap" variant="outline" size="sm">
          Đăng nhập
        </Button>
        <Button href="/dang-ky" variant="primary" size="sm">
          Đăng ký
        </Button>
      </div>
    );
  }

  const { name, email, image } = session.user;
  const role = (session.user as { role?: string }).role;
  const isReviewer = role === "foodreviewer" || role === "admin";
  const isAdmin = role === "admin";
  const initial = (name ?? email ?? "?").charAt(0).toUpperCase();

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full bg-surface border border-border hover:bg-soft-blue transition-colors"
      >
        {image ? (
          <Image
            src={image}
            alt={name ?? "Ảnh đại diện"}
            width={32}
            height={32}
            className="size-8 rounded-full object-cover"
          />
        ) : (
          <span className="size-8 rounded-full bg-soft-blue text-primary-blue font-semibold flex items-center justify-center text-sm">
            {initial}
          </span>
        )}
        <span className="hidden sm:inline text-sm font-medium text-text-primary max-w-[120px] truncate">
          {name}
        </span>
        <ChevronDown
          className={cn("size-4 text-text-secondary transition-transform", isOpen && "rotate-180")}
          aria-hidden
        />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-surface border border-border shadow-xl overflow-hidden animate-fade-slide-up"
        >
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold text-text-primary truncate">{name}</p>
            <p className="text-xs text-text-secondary truncate">{email}</p>
          </div>
          {isAdmin && (
            <Link
              href="/admin"
              role="menuitem"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-primary-pink font-medium hover:bg-soft-pink transition-colors border-b border-border"
            >
              <ShieldCheck className="size-4" aria-hidden />
              Quản trị hệ thống
            </Link>
          )}
          {isReviewer && (
            <Link
              href="/reviewer"
              role="menuitem"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-primary-blue font-medium hover:bg-soft-blue transition-colors border-b border-border"
            >
              <ClipboardCheck className="size-4" aria-hidden />
              Không gian thẩm định
            </Link>
          )}
          <Link
            href="/ho-so"
            role="menuitem"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-primary hover:bg-soft-blue transition-colors"
          >
            <UserIcon className="size-4 text-text-secondary" aria-hidden />
            Hồ sơ &amp; Sở thích
          </Link>
          <Link
            href="/lich-su"
            role="menuitem"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-primary hover:bg-soft-blue transition-colors"
          >
            <History className="size-4 text-text-secondary" aria-hidden />
            Lịch sử
          </Link>
          <Link
            href="/dong-gop"
            role="menuitem"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-primary hover:bg-soft-blue transition-colors"
          >
            <ChefHat className="size-4 text-text-secondary" aria-hidden />
            Món đã đóng góp
          </Link>
          {!isReviewer && (
            <Link
              href="/ung-tuyen-reviewer"
              role="menuitem"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-primary hover:bg-soft-blue transition-colors"
            >
              <BadgeCheck className="size-4 text-text-secondary" aria-hidden />
              Ứng tuyển FoodReviewer
            </Link>
          )}
          <Link
            href="/da-luu"
            role="menuitem"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-primary hover:bg-soft-blue transition-colors"
          >
            <Bookmark className="size-4 text-text-secondary" aria-hidden />
            Đã lưu
          </Link>
          <Link
            href="/cai-dat"
            role="menuitem"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-primary hover:bg-soft-blue transition-colors border-b border-border"
          >
            <Settings className="size-4 text-text-secondary" aria-hidden />
            Cài đặt
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={async () => {
              setIsOpen(false);
              // signOut mặc định điều hướng bằng window.location (full reload) —
              // làm mất toast ngay lập tức. Dùng redirect:false rồi tự chuyển
              // trang bằng router để ToastProvider (ở root layout) không bị unmount.
              await signOut({ redirect: false });
              showToast("Đã đăng xuất. Hẹn gặp lại!", "info");
              router.push("/");
              router.refresh();
            }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="size-4" aria-hidden />
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}
