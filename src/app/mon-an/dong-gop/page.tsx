import { getServerSession } from "next-auth";
import { UtensilsCrossed } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Category } from "@/lib/models/Category";
import { RequireLoginState } from "@/components/auth/RequireLoginState";
import { ContributeFoodForm } from "@/components/food/ContributeFoodForm";

export const dynamic = "force-dynamic";

export default async function ContributeFoodPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return (
      <RequireLoginState
        icon={UtensilsCrossed}
        title="Đăng nhập để đóng góp món ăn"
        description="Chia sẻ món ngon bạn biết tới cộng đồng — đội kiểm duyệt sẽ xem xét trước khi công khai."
        callbackUrl="/mon-an/dong-gop"
      />
    );
  }

  await connectDB();
  const categories = await Category.find({ isActive: true }).sort({ name: 1 }).lean();

  return (
    <div className="w-full max-w-3xl mx-auto px-4 md:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <span className="text-xs uppercase tracking-widest text-primary-blue font-bold">
          Đóng góp cho cộng đồng
        </span>
        <h1 className="text-3xl font-bold text-text-primary mt-1">Thêm món ăn mới</h1>
        <p className="text-text-secondary mt-1">
          Điền thông tin món ăn và quán bán — món của bạn sẽ hiển thị công khai sau khi được duyệt.
        </p>
      </div>

      <ContributeFoodForm
        categories={categories.map((category) => ({ id: String(category._id), name: category.name }))}
      />
    </div>
  );
}
