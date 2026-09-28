import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { Food } from "@/lib/models/Food";
import { Restaurant } from "@/lib/models/Restaurant";
import { requireReviewerSession } from "@/lib/reviewerData";
import { editFood, editRestaurant, type ContentEditError } from "@/lib/contentEdits";

const bodySchema = z.discriminatedUnion("targetType", [
  z.object({
    targetType: z.literal("food"),
    targetId: z.string(),
    note: z.string().max(500).optional(),
    food: z.object({ priceMin: z.number().int().min(0), priceMax: z.number().int().min(0) }).strict(),
  }),
  z.object({
    targetType: z.literal("restaurant"),
    targetId: z.string(),
    note: z.string().max(500).optional(),
    restaurant: z
      .object({
        address: z.string().optional(),
        location: z.object({ lat: z.number(), lng: z.number() }).nullable().optional(),
        openingHours: z.string().optional(),
      })
      .strict(),
  }),
]);

const ERRORS: Record<ContentEditError | "NOT_PENDING" | "SELF_SUBMITTED", { message: string; status: number }> = {
  NOT_FOUND: { message: "Không tìm thấy nội dung.", status: 404 },
  NOT_PENDING: { message: "Chỉ sửa được nội dung đang chờ duyệt.", status: 409 },
  SELF_SUBMITTED: { message: "Không thể tự sửa đóng góp của chính bạn (BR-F02).", status: 403 },
  FORBIDDEN_FIELD: {
    message: "FoodReviewer chỉ sửa được giá, địa chỉ, vị trí và giờ mở cửa — mục khác hãy yêu cầu người gửi chỉnh sửa.",
    status: 403,
  },
  INVALID_VALUE: { message: "Giá trị chưa hợp lệ.", status: 400 },
  NOTHING_CHANGED: { message: "Chưa có thay đổi nào.", status: 400 },
};

/**
 * FoodReviewer/Admin sửa DỮ KIỆN THỰC TẾ của đóng góp đang chờ duyệt (ngoại lệ BR-F08):
 * giá món; địa chỉ, toạ độ, giờ mở cửa của quán. Mục khác phải dùng "Yêu cầu sửa".
 * Admin dùng route này cũng bị giới hạn như reviewer — toàn quyền sửa chỉ có ở luồng xử lý báo cáo.
 */
export async function POST(request: Request) {
  const reviewer = await requireReviewerSession();
  if (!reviewer.ok) {
    const message = reviewer.status === 401 ? "Vui lòng đăng nhập." : "Bạn không có quyền truy cập khu vực thẩm định.";
    return NextResponse.json({ error: message }, { status: reviewer.status });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !isValidObjectId(parsed.data.targetId)) {
    return NextResponse.json({ error: ERRORS.FORBIDDEN_FIELD.message }, { status: 400 });
  }
  const body = parsed.data;
  const fail = (key: keyof typeof ERRORS) => NextResponse.json({ error: ERRORS[key].message }, { status: ERRORS[key].status });

  await connectDB();
  const Model = body.targetType === "food" ? Food : Restaurant;
  const item = (await Model.findById(body.targetId).select("moderationStatus createdBy").lean()) as {
    moderationStatus?: string;
    createdBy?: unknown;
  } | null;
  if (!item) return fail("NOT_FOUND");
  if (item.moderationStatus !== "pending") return fail("NOT_PENDING");
  if (String(item.createdBy) === reviewer.id) return fail("SELF_SUBMITTED");

  const result =
    body.targetType === "food"
      ? await editFood({ actorId: reviewer.id, scope: "reviewer", foodId: body.targetId, edit: body.food, reason: body.note, context: "contribution_review" })
      : await editRestaurant({
          actorId: reviewer.id,
          scope: "reviewer",
          restaurantId: body.targetId,
          edit: body.restaurant,
          reason: body.note,
          context: "contribution_review",
        });
  if (result.error) return fail(result.error);
  return NextResponse.json({ ok: true });
}
