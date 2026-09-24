import { Bookmark, Dices, History, Home, Info, Newspaper, User, UtensilsCrossed } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Link chính trên navbar desktop + menu trượt mobile (thứ tự giữ như cũ). */
export const MAIN_NAV_LINKS: NavLink[] = [
  { href: "/", label: "Trang chủ", icon: Home },
  { href: "/mon-an", label: "Món ăn", icon: UtensilsCrossed },
  { href: "/random", label: "Random", icon: Dices },
  { href: "/ve-chung-toi", label: "Về chúng tôi", icon: Info },
  { href: "/tin-tuc", label: "Tin tức", icon: Newspaper },
];

/** Dock dưới cùng trên mobile — nút Random nổi ở giữa render riêng. */
export const MOBILE_DOCK_LINKS: { left: NavLink[]; right: NavLink[] } = {
  left: [
    { href: "/", label: "Trang chủ", icon: Home },
    { href: "/da-luu", label: "Đã lưu", icon: Bookmark },
  ],
  right: [
    { href: "/lich-su", label: "Lịch sử", icon: History },
    { href: "/ho-so", label: "Tài khoản", icon: User },
  ],
};

/** Các route thuộc nhóm "Tài khoản" — để tô active cho mục Tài khoản trên dock. */
export const ACCOUNT_ROUTES = ["/ho-so", "/cai-dat", "/dang-nhap", "/dang-ky"];

export const FOOTER_COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Khám phá",
    links: [
      { href: "/", label: "Trang chủ" },
      { href: "/random", label: "Random món" },
      { href: "/mon-an", label: "Danh sách món ăn" },
      { href: "/tin-tuc", label: "Tin tức" },
    ],
  },
  {
    title: "Tiện ích",
    links: [
      { href: "/lich-su", label: "Lịch sử ăn uống" },
      { href: "/da-luu", label: "Món đã lưu" },
      { href: "/cai-dat", label: "Cài đặt" },
      { href: "/dong-gop", label: "Đóng góp quán mới" },
    ],
  },
  {
    title: "Về chúng tôi",
    links: [
      { href: "/ve-chung-toi", label: "Câu chuyện Nay Ăn Gì?" },
      { href: "/ung-tuyen-reviewer", label: "Ứng tuyển FoodReviewer" },
      { href: "/dang-nhap", label: "Đăng nhập" },
      { href: "/dang-ky", label: "Đăng ký" },
    ],
  },
];

export function isActiveRoute(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
