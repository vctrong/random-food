import { Award, Compass, Crown, MapPin, Sprout, Utensils } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface ContributorLevel {
  level: number;
  title: string;
  description: string;
  /** Số món đã được duyệt tối thiểu để đạt cấp này. */
  minApproved: number;
  icon: LucideIcon;
}

/**
 * Cấp độ đóng góp — tính động từ số món `approved`, không lưu DB (không cần
 * migration, đổi ngưỡng ở đây là áp dụng ngay cho mọi user).
 */
export const CONTRIBUTOR_LEVELS: ContributorLevel[] = [
  { level: 1, title: "Thực Khách Mới", description: "Bắt đầu hành trình chia sẻ món ngon.", minApproved: 0, icon: Sprout },
  { level: 2, title: "Người Tinh Ý", description: "Món đầu tiên đã được cộng đồng đón nhận.", minApproved: 1, icon: Compass },
  { level: 3, title: "Thổ Địa Xóm Ăn", description: "Biết những quán ngon người ta chưa biết.", minApproved: 3, icon: MapPin },
  { level: 4, title: "Thực Khách Sành Ăn", description: "Gu ăn uống được kiểm chứng nhiều lần.", minApproved: 6, icon: Utensils },
  { level: 5, title: "Chuyên Gia Khám Phá", description: "Nguồn gợi ý đáng tin của cả cộng đồng.", minApproved: 10, icon: Award },
  { level: 6, title: "Đại Sứ Ẩm Thực", description: "Cấp cao nhất — bản đồ ẩm thực Cần Thơ có dấu ấn của bạn.", minApproved: 20, icon: Crown },
];

export type AchievementId = "first_approved" | "new_restaurant" | "many_categories" | "loved_by_many" | "steady_contributor";

export interface AchievementDefinition {
  id: AchievementId;
  title: string;
  description: string;
  icon: LucideIcon;
}

/** Thành tựu — mỗi cái được mở khoá bằng điều kiện tính được từ dữ liệu thật (xem contributionLogic.ts). */
export const ACHIEVEMENTS: AchievementDefinition[] = [
  { id: "first_approved", title: "Món đầu tay", description: "Có 1 món được duyệt và lên thực đơn.", icon: Utensils },
  { id: "new_restaurant", title: "Người mở lối", description: "Đưa 1 quán mới vào hệ thống và quán được duyệt.", icon: MapPin },
  { id: "many_categories", title: "Đa vị", description: "Các món được duyệt trải rộng từ 3 danh mục trở lên.", icon: Compass },
  { id: "loved_by_many", title: "Được yêu thích", description: "Các món của bạn được lưu tổng cộng từ 10 lần.", icon: Award },
  { id: "steady_contributor", title: "Chăm chỉ", description: "Đã gửi từ 5 món để cộng đồng xem xét.", icon: Sprout },
];

export const ACHIEVEMENT_THRESHOLDS = {
  manyCategories: 3,
  lovedBySaves: 10,
  steadySubmissions: 5,
} as const;
