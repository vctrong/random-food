import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Experience } from "@/lib/models/Experience";

/**
 * Lịch sử check-in thật của user. Xem ghi chú trong src/app/api/favorites/route.ts
 * — chưa có Restaurant/Food thật nên collection này còn trống, route sẵn sàng
 * cho khi có dữ liệu thật.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  await connectDB();
  const userId = (session.user as { id: string }).id;
  const experiences = await Experience.find({ userId }).sort({ createdAt: -1 }).lean();

  return NextResponse.json(
    experiences.map((experience) => ({
      id: String(experience._id),
      restaurantId: String(experience.restaurantId),
      foodId: experience.foodId ? String(experience.foodId) : null,
      createdAt: experience.createdAt.toISOString(),
    })),
  );
}
