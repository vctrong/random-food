import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Favorite } from "@/lib/models/Favorite";

/**
 * Danh sách món yêu thích thật của user (join với `foods`). Hiện tại collection
 * `foods` chưa có dữ liệu thật (Random feature vẫn chạy trên mock data —
 * xem CLAUDE.md mục 1 + docs/database.md mục 7.3, chưa có toạ độ thật cho
 * Restaurant nên chưa seed được). Route này sẵn sàng trả dữ liệu thật ngay khi
 * `foods` có nội dung được duyệt qua luồng đóng góp (BR-C07).
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  await connectDB();
  const userId = (session.user as { id: string }).id;
  const favorites = await Favorite.find({ userId })
    .sort({ createdAt: -1 })
    .populate("foodId")
    .lean();

  return NextResponse.json(
    favorites.map((favorite) => ({
      id: String(favorite._id),
      foodId: String(favorite.foodId),
      createdAt: favorite.createdAt.toISOString(),
    })),
  );
}
