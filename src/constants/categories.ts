import { Cookie, Utensils, Flame, Users } from "lucide-react";
import type { EatingLevel } from "@/types/food";

export interface EatingLevelConfig {
  id: EatingLevel;
  label: string;
  tagline: string;
  description: string;
  badge: string;
  kcalRange: string;
  icon: typeof Cookie;
  imageUrl: string;
}

/**
 * 4 mức độ ăn chính thức của app (docs/BR_UC.md mục 2.1 — không phải role,
 * không thay thế Category). Nhãn/mô tả lấy nguyên văn từ tài liệu nghiệp vụ,
 * không tự bịa thêm nội dung marketing.
 */
export const EATING_LEVELS: EatingLevelConfig[] = [
  {
    id: "snack",
    label: "Ăn vặt",
    tagline: "Nhẹ bụng, vui miệng.",
    description:
      "Bánh tráng trộn, chè, trà sữa, ốc luộc, nem chua rán... nhâm nhi lúc xế chiều.",
    badge: "Ăn vặt nhẹ nhàng",
    kcalRange: "~150-350 kcal",
    icon: Cookie,
    imageUrl: "/image/eating-levels/an-vat.png",
  },
  {
    id: "normal",
    label: "Ăn bình thường",
    tagline: "Bữa ăn quen thuộc, vừa đủ.",
    description:
      "Cơm tấm sườn, phở bò, bún chả, bánh mì... bữa chính gọn gàng, hợp túi tiền.",
    badge: "Phổ biến nhất",
    kcalRange: "~450-650 kcal",
    icon: Utensils,
    imageUrl: "/image/eating-levels/an-binh-thuong.png",
  },
  {
    id: "hearty",
    label: "Ăn vừa vừa",
    tagline: "Khi muốn ngon và no hơn chút.",
    description:
      "Bún đậu mắm tôm, cơm gà xối mỡ, mì cay, hủ tiếu đặc biệt... no lâu, đậm đà.",
    badge: "No lâu & đậm đà",
    kcalRange: "~700-900 kcal",
    icon: Flame,
    imageUrl: "/image/eating-levels/an-vua.png",
  },
  {
    id: "full",
    label: "Ăn lớn",
    tagline: "Khi hôm nay thực sự rất đói.",
    description:
      "Lẩu, buffet nướng, sườn cay, hải sản... hợp cho hôm ăn nhóm hoặc tự thưởng.",
    badge: "Tiệc tùng & no nê",
    kcalRange: ">1000 kcal",
    icon: Users,
    imageUrl: "/image/eating-levels/an-lon.png",
  },
];

const EATING_LEVEL_IDS = new Set(EATING_LEVELS.map((level) => level.id));

export function isEatingLevel(value: string): value is EatingLevel {
  return EATING_LEVEL_IDS.has(value as EatingLevel);
}

export const EATING_LEVEL_LABELS: Record<EatingLevel, string> = Object.fromEntries(
  EATING_LEVELS.map((level) => [level.id, level.label]),
) as Record<EatingLevel, string>;

export const EATING_LEVEL_ICONS: Record<EatingLevel, typeof Cookie> = Object.fromEntries(
  EATING_LEVELS.map((level) => [level.id, level.icon]),
) as Record<EatingLevel, typeof Cookie>;

export const EATING_LEVEL_ORDER: EatingLevel[] = EATING_LEVELS.map((level) => level.id);
