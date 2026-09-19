import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";
import { getMyApplicationOverview, submitApplication, type SubmitApplicationError } from "@/lib/reviewerApplications";
import { SOCIAL_PLATFORMS } from "@/constants/reviewerApplication";
import type { ReviewerApplicationSocialLink } from "@/types/reviewerApplication";

const ERROR_MESSAGES: Record<Exclude<SubmitApplicationError, "VALIDATION">, { message: string; status: number }> = {
  NOT_FOUND_USER: { message: "Không tìm thấy tài khoản.", status: 404 },
  BANNED: { message: "Tài khoản của bạn đang bị khoá.", status: 403 },
  NOT_ELIGIBLE: {
    message: "Bạn chưa thể nộp đơn lúc này (đã là FoodReviewer, đang có đơn chờ duyệt, hoặc đang trong thời gian chờ sau khi bị từ chối).",
    status: 409,
  },
  INVALID_CATEGORY: { message: "Có khẩu vị sở trường không hợp lệ.", status: 400 },
  INVALID_IMAGES: { message: "Ảnh tiêu biểu phải là tệp hình, mỗi ảnh dưới 5MB.", status: 400 },
};

/** UC-U20: xem trạng thái đơn ứng tuyển của chính mình. */
export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

  return NextResponse.json(await getMyApplicationOverview(auth.id));
}

/** UC-U19: nộp đơn ứng tuyển FoodReviewer (multipart vì có ảnh portfolio). */
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return NextResponse.json({ error: "Vui lòng đăng nhập để ứng tuyển." }, { status: 401 });

  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "Dữ liệu gửi lên không hợp lệ." }, { status: 400 });

  const validPlatforms = new Set<string>(SOCIAL_PLATFORMS.map((platform) => platform.id));
  const socialLinks = SOCIAL_PLATFORMS.flatMap((platform): ReviewerApplicationSocialLink[] => {
    const url = String(formData.get(`social_${platform.id}`) ?? "").trim();
    return url && validPlatforms.has(platform.id) ? [{ platform: platform.id, url }] : [];
  });

  const result = await submitApplication(auth.id, {
    fields: {
      fullName: String(formData.get("fullName") ?? ""),
      motivation: String(formData.get("motivation") ?? ""),
      expertiseCategoryIds: formData.getAll("expertiseCategoryIds").map(String).filter(Boolean),
      activeAreas: formData.getAll("activeAreas").map(String).filter(Boolean),
      socialLinks,
      scenarioAnswer: String(formData.get("scenarioAnswer") ?? ""),
      acceptedCommitmentIds: formData.getAll("acceptedCommitmentIds").map(String).filter(Boolean),
    },
    portfolioFiles: formData.getAll("portfolio").filter((item): item is File => item instanceof File && item.size > 0),
  });

  if (result.error === "VALIDATION") return NextResponse.json({ error: result.message }, { status: 400 });
  if (result.error) {
    const { message, status } = ERROR_MESSAGES[result.error];
    return NextResponse.json({ error: message }, { status });
  }

  return NextResponse.json({ success: true, id: result.id }, { status: 201 });
}
