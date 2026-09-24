"use client";

import { AlertTriangle, ShieldCheck, User, Utensils } from "lucide-react";
import { SectionSidebar, type SectionNavItem } from "@/components/ui/SectionSidebar";
import { ProfileForm } from "./ProfileForm";
import { SecuritySection } from "./SecuritySection";
import { DangerZoneSection } from "./DangerZoneSection";

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
  authProvider: "local" | "google";
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
          <ProfileForm
            email={props.email}
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
          <SecuritySection authProvider={props.authProvider} />
          <DangerZoneSection email={props.email} />
        </div>
      </div>
    </div>
  );
}
