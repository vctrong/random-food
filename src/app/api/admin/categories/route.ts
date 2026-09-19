import { NextResponse } from "next/server";
import { apiNotFound } from "@/lib/http404";
import { requireAdminSession } from "@/lib/admin/session";
import { createCategory, getCategories, updateCategory } from "@/lib/admin/categories";

const ERROR_MESSAGES: Record<string, string> = {
  SLUG_TAKEN: "Đã tồn tại danh mục với tên/slug tương tự.",
  NOT_FOUND: "Không tìm thấy danh mục.",
};

export async function GET() {
  const admin = await requireAdminSession();
  if (!admin) return apiNotFound();

  const categories = await getCategories();
  return NextResponse.json(categories);
}

export async function POST(request: Request) {
  const admin = await requireAdminSession();
  if (!admin) return apiNotFound();

  const body = await request.json().catch(() => null);
  const name = body?.name;
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Thiếu tên danh mục." }, { status: 400 });
  }

  const result = await createCategory({
    adminId: admin.id,
    name,
    icon: typeof body?.icon === "string" ? body.icon : undefined,
    description: typeof body?.description === "string" ? body.description : undefined,
  });

  if (result.error) return NextResponse.json({ error: ERROR_MESSAGES[result.error] }, { status: 400 });
  return NextResponse.json({ ok: true, id: result.id });
}

export async function PATCH(request: Request) {
  const admin = await requireAdminSession();
  if (!admin) return apiNotFound();

  const body = await request.json().catch(() => null);
  const categoryId = body?.categoryId;
  if (typeof categoryId !== "string" || !categoryId) {
    return NextResponse.json({ error: "Thiếu categoryId." }, { status: 400 });
  }

  const result = await updateCategory({
    adminId: admin.id,
    categoryId,
    name: typeof body?.name === "string" ? body.name : undefined,
    icon: typeof body?.icon === "string" ? body.icon : undefined,
    description: typeof body?.description === "string" ? body.description : undefined,
    isActive: typeof body?.isActive === "boolean" ? body.isActive : undefined,
  });

  if (result.error) return NextResponse.json({ error: ERROR_MESSAGES[result.error] }, { status: 400 });
  return NextResponse.json({ ok: true });
}
