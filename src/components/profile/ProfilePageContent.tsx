"use client";

import { AlertTriangle, ShieldCheck, User, Utensils } from "lucide-react";
import { SectionSidebar, type SectionNavItem } from "@/components/ui/SectionSidebar";
import { ProfileForm } from "./ProfileForm";
import { SecuritySection } from "./SecuritySection";
import { DangerZoneSection } from "./DangerZoneSection";
import { EmailVerificationCard } from "./EmailVerificationCard";
import type { OtpState } from "@/services/passwordResetService";

const NAV_ITEMS: SectionNavItem[] = [
  { id: "tai-khoan", label: "Thông tin tài khoản", icon: User },
  { id: "so-thich", label: "Sở thích ăn uống", icon: Utensils },
  { id: "bao-mat", label: "Bảo mật", icon: ShieldCheck },
  { id: "nguy-hiem", label: "Vùng nguy hiểm", icon: AlertTriangle },
];

interface ProfilePageContentProps {
  email: string;
  role: string;
  joinedAtLabel: string;
  /** Tài khoản đã có mật khẩu chưa (tài khoản chỉ có Google thì chưa). */
  hasPassword: boolean;
  isEmailVerified: boolean;
  emailVerificationPending: OtpState | null;
  /** Date.now() lúc server render — bù lệch đồng hồ cho bộ đếm ngược của mã xác thực. */
  serverTime: number;
  initialDisplayName: string;
  initialAvatarUrl: string | null;
  initialPriceRange: { min: number; max?: number } | null;
  initialFavoriteCategoryIds: string[];
  categories: { id: string; name: string }[];
  initialFavoriteFoodNames: string[];
  initialDislikedIngredients: string[];
  initialSpicePreference: "khong-cay" | "cay-nhe" | "cay-vua" | "sieu-cay" | null;
  initialVegetarianMode: boolean;
  initialAllowRepeatWithin24h: boolean;
}

export function ProfilePageContent(props: ProfilePageContentProps) {
  return (
    <div className="w-full max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-10">
      <div className="mb-6 pb-6 border-b border-border">
        <span className="text-xs uppercase tracking-widest text-primary font-bold">Tài khoản của bạn</span>
        <h1 className="text-3xl font-bold text-text-primary mt-1">Hồ sơ & Sở thích</h1>
        <p className="text-text-secondary mt-1">
          Cá nhân hoá thông tin, khẩu vị và quản lý bảo mật tài khoản.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <SectionSidebar items={NAV_ITEMS} />

        <div className="lg:col-span-9 space-y-4">
          <EmailVerificationCard
            email={props.email}
            isVerified={props.isEmailVerified}
            hasPassword={props.hasPassword}
            initialPending={props.emailVerificationPending}
            serverTime={props.serverTime}
          />
          <ProfileForm
            email={props.email}
            isEmailVerified={props.isEmailVerified}
            role={props.role}
            joinedAtLabel={props.joinedAtLabel}
            initialDisplayName={props.initialDisplayName}
            initialAvatarUrl={props.initialAvatarUrl}
            initialPriceRange={props.initialPriceRange}
            initialFavoriteCategoryIds={props.initialFavoriteCategoryIds}
            categories={props.categories}
            initialFavoriteFoodNames={props.initialFavoriteFoodNames}
            initialDislikedIngredients={props.initialDislikedIngredients}
            initialSpicePreference={props.initialSpicePreference}
            initialVegetarianMode={props.initialVegetarianMode}
            initialAllowRepeatWithin24h={props.initialAllowRepeatWithin24h}
          />
          <SecuritySection hasPassword={props.hasPassword} isEmailVerified={props.isEmailVerified} />
          <DangerZoneSection email={props.email} />
        </div>
      </div>
    </div>
  );
}
