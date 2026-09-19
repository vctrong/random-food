import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";
import { updateContribution, type UpdateContributionError, type UpdateContributionInput } from "@/lib/contributions";

const ERROR_MESSAGES: Record<UpdateContributionError, { message: string; status: number }> = {
  INVALID_ID: { message: "Mã món ăn không hợp lệ.", status: 400 },
  NOT_FOUND: { message: "Không tìm thấy món ăn đã đóng góp của bạn.", status: 404 },
  NOTHING_TO_UPDATE: { message: "Không có thay đổi nào để gửi.", status: 400 },
  NOT_EDITABLE: { message: "Chỉ chỉnh sửa được khi đội kiểm duyệt yêu cầu bổ sung.", status: 409 },
  INVALID_FOOD: { message: "Thiếu tên hoặc mô tả món ăn.", status: 400 },
  INVALID_PRICE: { message: "Giá tham khảo không hợp lệ.", status: 400 },
  INVALID_CATEGORY: { message: "Chọn ít nhất 1 danh mục hợp lệ.", status: 400 },
  INVALID_EATING_LEVEL: { message: "Chọn ít nhất 1 mức độ ăn hợp lệ.", status: 400 },
  INVALID_IMAGES: { message: "Cần 1–5 ảnh, mỗi ảnh là tệp hình dưới 5MB.", status: 400 },
  INVALID_RESTAURANT: { message: "Thiếu tên, địa chỉ hoặc vị trí quán ăn.", status: 400 },
};

/** UC-U12: sửa đóng góp `needs_revision` của chính mình và nộp lại (→ pending). */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (!auth.ok) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

  const { id } = await params;
  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "Dữ liệu gửi lên không hợp lệ." }, { status: 400 });

  const input: UpdateContributionInput = {};

  if (formData.has("name")) {
    input.food = {
      name: String(formData.get("name") ?? ""),
      description: String(formData.get("description") ?? ""),
      priceMin: Number(formData.get("priceMin")),
      priceMax: Number(formData.get("priceMax")),
      categoryIds: formData.getAll("categoryIds").map(String).filter(Boolean),
      eatingLevels: formData.getAll("eatingLevels").map(String).filter(Boolean),
      keepImages: formData.getAll("keepImages").map(String).filter(Boolean),
      newImages: formData.getAll("images").filter((item): item is File => item instanceof File && item.size > 0),
    };
  }

  if (formData.has("restaurantName")) {
    input.restaurant = {
      name: String(formData.get("restaurantName") ?? ""),
      address: String(formData.get("restaurantAddress") ?? ""),
      lat: Number(formData.get("restaurantLat")),
      lng: Number(formData.get("restaurantLng")),
    };
  }

  const result = await updateContribution(auth.id, id, input);
  if (result.error) {
    const { message, status } = ERROR_MESSAGES[result.error];
    return NextResponse.json({ error: message }, { status });
  }

  return NextResponse.json({ success: true });
}
