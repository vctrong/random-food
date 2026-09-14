import {
  Cookie,
  Utensils,
  Flame,
  Users,
  Zap,
  Salad,
  Soup,
  Wheat,
} from "lucide-react";
import type { FoodCategory, HungerLevel, MealTime, SpiceLevel } from "@/types/food";

export interface HungerLevelConfig {
  id: HungerLevel;
  label: string;
  tagline: string;
  description: string;
  badge: string;
  kcalRange: string;
  icon: typeof Cookie;
  imageSeed: string;
}

export const HUNGER_LEVELS: HungerLevelConfig[] = [
  {
    id: "an-vat",
    label: "Ăn vặt",
    tagline: "Nhẹ bụng, vui miệng.",
    description:
      "Bánh tráng trộn, chè, trà sữa, ốc luộc, nem chua rán... nhâm nhi lúc xế chiều.",
    badge: "30+ món lề đường",
    kcalRange: "~150-350 kcal",
    icon: Cookie,
    imageSeed: "an-vat-can-tho",
  },
  {
    id: "an-binh-thuong",
    label: "Ăn bình thường",
    tagline: "Bữa ăn quen thuộc, vừa đủ.",
    description:
      "Cơm tấm sườn, phở bò, bún chả, bánh mì... bữa chính gọn gàng, hợp túi tiền.",
    badge: "Phổ biến nhất",
    kcalRange: "~450-650 kcal",
    icon: Utensils,
    imageSeed: "com-tam-can-tho",
  },
  {
    id: "an-vua-vua",
    label: "Ăn vừa vừa",
    tagline: "Khi muốn ngon và no hơn chút.",
    description:
      "Bún đậu mắm tôm, cơm gà xối mỡ, mì cay, hủ tiếu đặc biệt... no lâu, đậm đà.",
    badge: "No lâu & đậm đà",
    kcalRange: "~700-900 kcal",
    icon: Flame,
    imageSeed: "bun-dau-can-tho",
  },
  {
    id: "an-lon",
    label: "Ăn lớn",
    tagline: "Khi hôm nay thực sự rất đói.",
    description:
      "Lẩu, buffet nướng, sườn cay, hải sản... hợp cho hôm ăn nhóm hoặc tự thưởng.",
    badge: "Tiệc tùng & no nê",
    kcalRange: ">1000 kcal",
    icon: Users,
    imageSeed: "lau-can-tho",
  },
];

const HUNGER_LEVEL_IDS = new Set(HUNGER_LEVELS.map((level) => level.id));

export function isHungerLevel(value: string): value is HungerLevel {
  return HUNGER_LEVEL_IDS.has(value as HungerLevel);
}

export interface QuickFilterConfig {
  id: string;
  label: string;
  icon: typeof Cookie;
}

export const CATEGORY_LABELS: Record<FoodCategory, string> = {
  com: "Cơm",
  "bun-pho-hu-tieu": "Bún / Phở / Hủ tiếu",
  "an-vat": "Ăn vặt",
  "mon-nuoc": "Món nước",
  chay: "Chay",
  "banh-mi": "Bánh mì",
  "do-uong": "Đồ uống",
};

export const SPICE_LABELS: Record<SpiceLevel, string> = {
  "khong-cay": "Không cay",
  "cay-nhe": "Cay nhẹ",
  "cay-vua": "Cay vừa",
  "sieu-cay": "Siêu cay",
};

export const MEAL_TIME_LABELS: Record<MealTime, string> = {
  sang: "Sáng",
  trua: "Trưa",
  xe: "Xế",
  toi: "Tối",
};

export const QUICK_FILTERS: QuickFilterConfig[] = [
  { id: "quyet-dinh-3-giay", label: "Quyết định 3 giây", icon: Zap },
  { id: "lanh-manh", label: "Lành mạnh", icon: Salad },
  { id: "an-cay", label: "Ăn cay", icon: Flame },
  { id: "mon-nuoc", label: "Món nước", icon: Soup },
  { id: "mon-com", label: "Món cơm", icon: Wheat },
];
