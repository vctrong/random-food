import { Dices, MapPin, Navigation, Plus, Send, SlidersHorizontal } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/** "Đóng" — ẩn trong phiên (tab) hiện tại. */
export const ONBOARDING_SESSION_DISMISS_KEY = "nayangi:onboarding:dismissed";
/** "Ẩn trong 24 giờ" — mốc thời gian (ms, Date.now()) lúc bấm. */
export const ONBOARDING_SNOOZE_KEY = "nayangi:onboarding:snoozedAt";
export const ONBOARDING_SNOOZE_DURATION_MS = 24 * 60 * 60 * 1000;

/** Chờ trang vẽ xong rồi mới mở modal — tránh modal chen ngang lúc layout đang ổn định. */
export const ONBOARDING_OPEN_DELAY_MS = 450;

/**
 * Chỉ hiện hướng dẫn ở các trang public "bên ngoài" (trang chủ + trang khám phá món).
 * Trang tài khoản (đăng nhập, quên mật khẩu, hồ sơ, lịch sử…), form đóng góp và
 * dashboard Admin/FoodReviewer đều KHÔNG hiện. Dùng exact-match.
 */
export const ONBOARDING_ALLOWED_PATHS: ReadonlySet<string> = new Set(["/", "/random", "/mon-an", "/tin-tuc", "/ve-chung-toi"]);

/** Trang chi tiết món /mon-an/[id] cũng hiện; path tĩnh dưới /mon-an/ (form đóng góp) thì không. */
export const ONBOARDING_FOOD_DETAIL_PREFIX = "/mon-an/";
export const ONBOARDING_FOOD_STATIC_SUBPATHS: ReadonlySet<string> = new Set(["dong-gop"]);

export const ONBOARDING_HEADER = {
  title: "Làm quen với Nay Ăn Gì?",
  subtitle: "Hai việc chính bạn làm được ở đây — xem nhanh nhé.",
} as const;

export interface OnboardingStep {
  icon: LucideIcon;
  /** 3–5 chữ. */
  title: string;
  /** Tối đa 1 dòng. */
  text: string;
}

/** Emoji món ăn trôi quanh minh hoạ — vị trí theo % khung, cỡ theo rem (desktop). */
export interface OnboardingSticker {
  emoji: string;
  x: number;
  y: number;
  size: number;
  rotate: number;
  duration: number;
  delay: number;
}

export interface OnboardingSlide {
  id: "random" | "contribute";
  title: string;
  description: string;
  steps: OnboardingStep[];
  stickers: OnboardingSticker[];
}

/**
 * Nội dung bám đúng nhãn nút đang có trong app: HeroSection/FoodSlotMachine/
 * HeroResultCard (random) và FoodListPageContent/FoodQuickActionsBubble/
 * ContributeFoodForm (đóng góp). Đổi nhãn nút ở các component đó thì phải sửa lại đây.
 */
export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    id: "random",
    title: "Random món ăn",
    description: "Không cần đăng nhập — vài giây là có món để đi ăn.",
    steps: [
      { icon: SlidersHorizontal, title: "Chọn gu ăn", text: "Từ Ăn vặt tới Ăn lớn, thêm “Dưới 30k” nếu muốn tiết kiệm." },
      { icon: Dices, title: "Quay máy random", text: "Bấm “Quay ngay!” hoặc nhấn phím Space." },
      { icon: Navigation, title: "Chốt món, đi ăn", text: "“Chỉ đường” tới quán, chưa ưng thì “Đổi món”." },
    ],
    stickers: [
      { emoji: "🍜", x: 18, y: 24, size: 2.4, rotate: -10, duration: 5.2, delay: -0.4 },
      { emoji: "🥞", x: 82, y: 22, size: 2.2, rotate: 8, duration: 5.8, delay: -1.8 },
      { emoji: "🍚", x: 14, y: 74, size: 2, rotate: 6, duration: 6.1, delay: -2.6 },
      { emoji: "🧋", x: 85, y: 72, size: 2.3, rotate: -6, duration: 4.9, delay: -1.1 },
      { emoji: "🍧", x: 50, y: 10, size: 1.6, rotate: 0, duration: 6.4, delay: -3.2 },
    ],
  },
  {
    id: "contribute",
    title: "Đóng góp món ăn",
    description: "Biết quán ngon? Chia sẻ cho cả cộng đồng — cần đăng nhập để gửi.",
    steps: [
      { icon: Plus, title: "Mở form đóng góp", text: "“Đóng góp món mới” ở trang Món ăn, hoặc nút + nổi." },
      { icon: MapPin, title: "Điền món, ghim quán", text: "Ảnh, tên, giá, danh mục và vị trí quán trên bản đồ." },
      { icon: Send, title: "Gửi để duyệt", text: "Theo dõi trạng thái ở trang “Món đã đóng góp”." },
    ],
    stickers: [
      { emoji: "🥢", x: 16, y: 22, size: 2.1, rotate: -14, duration: 5.4, delay: -0.9 },
      { emoji: "🍲", x: 84, y: 20, size: 2.3, rotate: 6, duration: 6, delay: -2.2 },
      { emoji: "🥖", x: 13, y: 76, size: 2.2, rotate: 10, duration: 5.1, delay: -1.5 },
      { emoji: "🌶️", x: 86, y: 76, size: 1.9, rotate: -12, duration: 4.7, delay: -0.3 },
      { emoji: "🍡", x: 50, y: 90, size: 1.6, rotate: 4, duration: 6.3, delay: -2.9 },
    ],
  },
];
