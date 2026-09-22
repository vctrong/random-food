import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/requireAuth";
import { connectDB } from "@/lib/mongodb";
import { Category } from "@/lib/models/Category";
import { CategoryProposal } from "@/lib/models/CategoryProposal";
import { slugify } from "@/lib/admin/categories";

const postSchema = z.object({ name: z.string().trim().min(2).max(40) }).strict();

/**
 * User đề xuất danh mục mới (Admin duyệt sau ở /admin/danh-muc, xem
 * lib/admin/categories.ts::decideCategoryProposal — phần duyệt đã có sẵn từ
 * trước, route này bổ sung phần user GỬI đề xuất mà hệ thống còn thiếu).
 */
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return NextResponse.json({ error: "Vui lòng đăng nhập để đề xuất danh mục." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Tên danh mục không hợp lệ (2-40 ký tự)." }, { status: 400 });
  }

  const name = parsed.data.name;
  const slug = slugify(name);
  if (!slug) {
    return NextResponse.json({ error: "Tên danh mục không hợp lệ." }, { status: 400 });
  }

  await connectDB();

  const existingCategory = await Category.findOne({ slug }).lean();
  if (existingCategory) {
    return NextResponse.json({ error: "Danh mục này đã có sẵn trong hệ thống." }, { status: 409 });
  }

  const existingPending = await CategoryProposal.findOne({
    status: "pending",
    name: { $regex: `^${name.trim()}$`, $options: "i" },
  }).lean();
  if (existingPending) {
    return NextResponse.json(
      { error: "Đã có người đề xuất danh mục này, đang chờ Admin duyệt." },
      { status: 409 },
    );
  }

  const proposal = await CategoryProposal.create({ name: name.trim(), proposedBy: auth.id });

  return NextResponse.json({ success: true, id: String(proposal._id) }, { status: 201 });
}
