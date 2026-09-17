import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Category } from "@/lib/models/Category";

export async function GET() {
  await connectDB();
  const categories = await Category.find({ isActive: true }).sort({ name: 1 }).lean();

  return NextResponse.json(
    categories.map((category) => ({
      id: String(category._id),
      name: category.name,
      slug: category.slug,
      icon: category.icon ?? null,
    })),
  );
}
