import { ClipboardCheck, History, MapPinned } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const REVIEWER_APPLICATION_LIMITS = {
  fullNameMax: 100,
  motivationMin: 30,
  motivationMax: 1000,
  expertiseMin: 2,
  expertiseMax: 4,
  areasMax: 5,
  areaMaxLength: 60,
  portfolioMin: 2,
  portfolioMax: 6,
  portfolioImageMaxBytes: 5 * 1024 * 1024,
  scenarioMinWords: 150,
  scenarioMaxWords: 400,
  /** Sau khi bị từ chối phải chờ đủ số ngày này mới được nộp đơn mới. */
  reapplyCooldownDays: 30,
} as const;

/** Đổi phiên bản khi sửa nội dung cam kết — `commitmentVersion` lưu kèm đơn để biết user đã đồng ý bản nào. */
export const COMMITMENT_VERSION = "2026-09-v1";

export interface Commitment {
  id: string;
  title: string;
  text: string;
}

export const COMMITMENTS: Commitment[] = [
  {
    id: "integrity",
    title: "Tuyệt đối không nhận hối lộ hoặc PR tẩy trắng",
    text: "Tôi cam kết không nhận phong bì, quà tặng riêng tư từ chủ cơ sở kinh doanh để tâng bốc sai lệch chất lượng món ăn.",
  },
  {
    id: "transparency",
    title: "Minh bạch trải nghiệm",
    text: "Mọi trải nghiệm có tài trợ (Invited / Hosted) bắt buộc phải được gắn nhãn minh bạch theo quy định ứng dụng.",
  },
  {
    id: "originality",
    title: "Bản quyền nội dung & trách nhiệm phát ngôn",
    text: "Cam kết các hình ảnh, tư liệu đánh giá hoàn toàn do cá nhân tôi thực hiện và chịu trách nhiệm pháp lý.",
  },
];

/**
 * TODO(Ttong): thay bằng nội dung tình huống xác minh thực địa chính thức.
 * Đây là placeholder — cố ý chưa tự soạn nội dung nghiệp vụ (CLAUDE.md mục 0).
 */
export const VERIFICATION_SCENARIO =
  "[Nội dung tình huống xác minh thực địa đang chờ cập nhật — Ttong sẽ cung cấp văn bản chính thức.]";

export const APPLICATION_BENEFITS: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: ClipboardCheck,
    title: "Duyệt nội dung cộng đồng",
    text: "Xem hàng chờ và thẩm định món ăn, quán ăn do người dùng đóng góp trước khi công khai.",
  },
  {
    icon: History,
    title: "Nhật ký thẩm định cá nhân",
    text: "Mọi quyết định duyệt, từ chối, yêu cầu sửa của bạn đều được lưu minh bạch.",
  },
  {
    icon: MapPinned,
    title: "Giữ bản đồ ẩm thực đáng tin",
    text: "Đảm bảo món và quán trên app có thật, đúng địa chỉ, đúng thông tin.",
  },
];

/** Tiêu chí ưu tiên khi Admin xem đơn — bám BR-F05: xác minh tính có thật/đúng thông tin, không chấm ngon/dở. */
export const APPLICATION_CRITERIA = [
  "Trung thực, chịu khó đối chiếu thông tin món và quán ngoài thực tế.",
  "Hình ảnh chụp tự nhiên, không lạm dụng filter.",
  "Tôn trọng nguồn cội văn hoá ẩm thực địa phương.",
];

export const SOCIAL_PLATFORMS = [
  { id: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@ten-kenh" },
  { id: "instagram", label: "Instagram / Threads", placeholder: "https://instagram.com/ten-tai-khoan" },
] as const;

export type SocialPlatformId = (typeof SOCIAL_PLATFORMS)[number]["id"];

export const REVIEWER_APPLICATION_DRAFT_KEY = "nayangi:reviewer-application-draft";
