import { getServerSession } from "next-auth";
import { User as UserIcon } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { UserProfile } from "@/lib/models/UserProfile";
import { Category } from "@/lib/models/Category";
import { RequireLoginState } from "@/components/auth/RequireLoginState";
import { ProfilePageContent } from "@/components/profile/ProfilePageContent";
import { formatDate } from "@/lib/utils";
import { getEmailVerificationService } from "@/lib/emailVerificationStore";

interface UserProfileLean {
  displayName?: string;
  avatarUrl?: string;
  preferences?: {
    favoriteCategoryIds?: unknown[];
    priceRange?: { min: number; max?: number };
    favoriteFoodNames?: string[];
    dislikedIngredients?: string[];
    spicePreference?: "khong-cay" | "cay-nhe" | "cay-vua" | "sieu-cay";
    vegetarianMode?: boolean;
    allowRepeatWithin24h?: boolean;
  };
}

interface UserLean {
  email: string;
  role: string;
  passwordHash?: string | null;
  isVerified?: boolean;
  createdAt?: Date;
}

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return (
      <RequireLoginState
        icon={UserIcon}
        title="Đăng nhập để xem Hồ sơ & Sở thích"
        description="Lưu ảnh đại diện, tên hiển thị, khẩu vị cá nhân hoá và quản lý bảo mật cho tài khoản của bạn."
        callbackUrl="/ho-so"
      />
    );
  }

  await connectDB();
  const userId = (session.user as { id: string }).id;
  const [user, profile, categories] = await Promise.all([
    User.findById(userId).select("email role passwordHash isVerified createdAt").lean() as Promise<UserLean | null>,
    UserProfile.findOne({ userId }).lean() as Promise<UserProfileLean | null>,
    Category.find({ isActive: true }).sort({ name: 1 }).lean(),
  ]);

  const isEmailVerified = user?.isVerified === true;
  // Chỉ gửi xuống client dạng boolean — không bao giờ truyền hash mật khẩu ra ngoài server.
  const hasPassword = Boolean(user?.passwordHash);
  // Chưa xác thực: lấy mã đang còn hạn (nếu có) để reload trang vẫn nhập tiếp được.
  const verificationStatus = isEmailVerified ? null : await getEmailVerificationService().getStatus(userId);

  return (
    <ProfilePageContent
      email={user?.email ?? session.user.email ?? "—"}
      role={user?.role ?? "user"}
      joinedAtLabel={user?.createdAt ? formatDate(user.createdAt.toISOString()) : "—"}
      hasPassword={hasPassword}
      isEmailVerified={isEmailVerified}
      emailVerificationPending={verificationStatus?.pending ?? null}
      serverTime={verificationStatus?.serverTime ?? 0}
      initialDisplayName={profile?.displayName ?? session.user.name ?? ""}
      initialAvatarUrl={profile?.avatarUrl ?? session.user.image ?? null}
      initialPriceRange={profile?.preferences?.priceRange ?? null}
      initialFavoriteCategoryIds={(profile?.preferences?.favoriteCategoryIds ?? []).map(String)}
      categories={categories.map((category) => ({ id: String(category._id), name: category.name }))}
      initialFavoriteFoodNames={profile?.preferences?.favoriteFoodNames ?? []}
      initialDislikedIngredients={profile?.preferences?.dislikedIngredients ?? []}
      initialSpicePreference={profile?.preferences?.spicePreference ?? null}
      initialVegetarianMode={profile?.preferences?.vegetarianMode ?? false}
      initialAllowRepeatWithin24h={profile?.preferences?.allowRepeatWithin24h ?? true}
    />
  );
}
