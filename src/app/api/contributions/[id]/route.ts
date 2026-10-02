import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";
import { LOCATION_SOURCES } from "@/lib/models/Restaurant";
import type { LocationSource } from "@/types/restaurant";
import type { SubmissionField } from "@/features/contributions/submissionRules";
import { WORKFLOW_ERRORS, describeBlockedFields, editSubmission, type SubmissionEditInput } from "@/lib/submissionWorkflow";

/** Key form → field nghiệp vụ, để báo đúng field bị chặn theo trạng thái. */
const FORM_FIELDS: Record<string, SubmissionField> = {
  name: "name",
  description: "description",
  priceMin: "price",
  priceMax: "price",
  categoryIds: "categories",
  eatingLevels: "eatingLevels",
  keepImages: "images",
  images: "images",
  restaurantName: "restaurant",
  restaurantAddress: "restaurant",
  restaurantLat: "restaurant",
  restaurantLng: "restaurant",
  restaurantLocationSource: "restaurant",
  restaurantId: "restaurant",
};

/**
 * UC-U12: chủ đề xuất sửa — `pending` (tối đa 3 lần, cả 2 nhóm field: đổi quán `restaurantId`, hoặc sửa
 * quán mới `restaurantName/Address/Lat/Lng`) hoặc `needs_revision` (nhóm nhẹ, lưu là gửi lại → pending).
 * Quyền theo trạng thái kiểm ở lib/submissionWorkflow.ts.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (!auth.ok) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

  const { id } = await params;
  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "Dữ liệu gửi lên không hợp lệ." }, { status: 400 });

  const requestedFields = [...new Set([...formData.keys()].map((key) => FORM_FIELDS[key]).filter(Boolean))];
  const input: SubmissionEditInput = { requestedFields };

  // Nhóm nhẹ gửi cả khối (form luôn gửi đủ) — thiếu field nào thì validate phía service báo lỗi.
  if (requestedFields.some((field) => field !== "restaurant")) {
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

  if (formData.has("restaurantId")) {
    input.restaurantSwitch = { restaurantId: String(formData.get("restaurantId") ?? "") };
  }

  if (formData.has("restaurantName")) {
    const hasLocation = formData.has("restaurantLat") && formData.has("restaurantLng");
    const source = String(formData.get("restaurantLocationSource") ?? "pin_confirmed");
    input.restaurant = {
      name: String(formData.get("restaurantName") ?? ""),
      address: String(formData.get("restaurantAddress") ?? ""),
      location: hasLocation
        ? { lat: Number(formData.get("restaurantLat")), lng: Number(formData.get("restaurantLng")) }
        : null,
      locationSource: (LOCATION_SOURCES as readonly string[]).includes(source) ? (source as LocationSource) : "pin_confirmed",
    };
  }

  const result = await editSubmission(auth.id, id, input);
  if (result.error) {
    const { message, status } = WORKFLOW_ERRORS[result.error];
    const blockedFields = "blockedFields" in result ? result.blockedFields : undefined;
    return NextResponse.json(
      { error: blockedFields ? describeBlockedFields(blockedFields) : message, ...(blockedFields && { blockedFields }) },
      { status },
    );
  }

  return NextResponse.json({ success: true, status: result.status, remainingEdits: result.remainingEdits });
}
