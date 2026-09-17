import { getServerSession } from "next-auth";
import { User } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { UserProfile } from "@/lib/models/UserProfile";
import { Category } from "@/lib/models/Category";
import { RequireLoginState } from "@/components/auth/RequireLoginState";
import { ProfileForm } from "@/components/profile/ProfileForm";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return (
      <RequireLoginState
        icon={User}
        title="Đăng nhập để xem Hồ sơ & Sở thích"
        description="Lưu ảnh đại diện, tên hiển thị và khẩu vị cá nhân hoá cho tài khoản của bạn."
        callbackUrl="/ho-so"
      />
    );
  }

  await connectDB();
  const userId = (session.user as { id: string }).id;
  const [profile, categories] = await Promise.all([
    UserProfile.findOne({ userId }).lean() as Promise<{
      displayName?: string;
      avatarUrl?: string;
      preferences?: { favoriteCategoryIds?: unknown[]; priceRange?: { min: number; max: number } };
    } | null>,
    Category.find({ isActive: true }).sort({ name: 1 }).lean(),
  ]);

  return (
    <div className="w-full max-w-3xl mx-auto px-4 md:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <span className="text-xs uppercase tracking-widest text-primary-blue font-bold">
          Tài khoản của bạn
        </span>
        <h1 className="text-3xl font-bold text-text-primary mt-1">Hồ sơ &amp; Sở thích</h1>
        <p className="text-text-secondary mt-1">
          Cá nhân hoá ảnh đại diện, tên hiển thị, khoảng giá và danh mục món ăn yêu thích.
        </p>
      </div>

      <ProfileForm
        initialDisplayName={profile?.displayName ?? session.user.name ?? ""}
        initialAvatarUrl={profile?.avatarUrl ?? session.user.image ?? null}
        initialPriceRange={profile?.preferences?.priceRange ?? null}
        initialFavoriteCategoryIds={(profile?.preferences?.favoriteCategoryIds ?? []).map(String)}
        categories={categories.map((category) => ({
          id: String(category._id),
          name: category.name,
        }))}
      />
    </div>
  );
}
