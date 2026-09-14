import { AlertTriangle, Leaf, History, Utensils } from "lucide-react";
import type { UserSettings } from "@/types/settings";
import { PRICE_RANGE_OPTIONS, SPICE_OPTIONS } from "@/features/settings/settingsLogic";
import { Toggle } from "@/components/ui/Toggle";
import { TagInput } from "./TagInput";

interface PreferencesSectionProps {
  settings: UserSettings;
  onAddFavorite: (value: string) => void;
  onRemoveFavorite: (value: string) => void;
  onAddDisliked: (value: string) => void;
  onRemoveDisliked: (value: string) => void;
  onChangePriceRange: (value: UserSettings["priceRange"]) => void;
  onChangeSpice: (value: UserSettings["spicePreference"]) => void;
  onToggleVegetarian: () => void;
  onToggleAllowRepeat: () => void;
}

export function PreferencesSection({
  settings,
  onAddFavorite,
  onRemoveFavorite,
  onAddDisliked,
  onRemoveDisliked,
  onChangePriceRange,
  onChangeSpice,
  onToggleVegetarian,
  onToggleAllowRepeat,
}: PreferencesSectionProps) {
  return (
    <section id="so-thich" className="bg-white rounded-2xl p-6 shadow-sm space-y-6 scroll-mt-24">
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-3">
          <span className="inline-flex p-2 rounded-xl bg-soft-blue text-primary-blue">
            <Utensils className="size-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">1. Sở thích ăn uống</h2>
            <p className="text-sm text-text-secondary">
              Thiết lập khẩu vị giúp bạn dễ nhận diện gợi ý phù hợp hơn.
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-soft-blue text-primary-blue shrink-0">
          Quan trọng
        </span>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between flex-wrap gap-1">
          <label className="font-semibold text-text-primary">Món yêu thích ưu tiên</label>
          <span className="text-sm text-text-secondary">Ưu tiên xuất hiện khi random</span>
        </div>
        <TagInput
          tags={settings.favoriteFoodNames}
          onAdd={onAddFavorite}
          onRemove={onRemoveFavorite}
          placeholder="+ Thêm món yêu thích"
          tone="blue"
        />
      </div>

      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between flex-wrap gap-1">
          <label className="font-semibold text-red-600 flex items-center gap-1.5">
            <AlertTriangle className="size-4" aria-hidden />
            <span>Món không thích / Dị ứng thực phẩm</span>
          </label>
          <span className="text-sm text-red-500">Sẽ bị loại bỏ khi random</span>
        </div>
        <TagInput
          tags={settings.dislikedIngredients}
          onAdd={onAddDisliked}
          onRemove={onRemoveDisliked}
          placeholder="+ Thêm chất dị ứng"
          tone="red"
        />
      </div>

      <div className="space-y-1.5 pt-1">
        <label className="font-semibold text-text-primary">Mức giá mong muốn cho một bữa ăn</label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-1.5 rounded-2xl bg-soft-blue/40">
          {PRICE_RANGE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onChangePriceRange(option.id)}
              className={`text-center py-2.5 px-2 rounded-xl text-sm font-semibold transition-all ${
                settings.priceRange === option.id
                  ? "bg-white text-primary-blue shadow-sm"
                  : "text-text-secondary"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5 pt-1">
        <label className="font-semibold text-text-primary">Độ cay ưa thích</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {SPICE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onChangeSpice(option.id)}
              className={`p-3.5 rounded-xl transition-all flex flex-col items-center justify-center text-center ${
                settings.spicePreference === option.id
                  ? "bg-soft-blue text-primary-blue shadow-sm"
                  : "bg-soft-blue/30 text-text-secondary"
              }`}
            >
              <span className="font-semibold text-text-primary">{option.label}</span>
              <span className="text-xs text-text-secondary">{option.hint}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="pt-1 space-y-3">
        <div className="flex items-center justify-between p-4 rounded-xl bg-soft-blue/30">
          <div className="space-y-0.5 pr-4">
            <div className="font-semibold text-text-primary flex items-center gap-2">
              <Leaf className="size-4 text-success" aria-hidden />
              <span>Chế độ ăn chay (Vegetarian)</span>
            </div>
            <p className="text-sm text-text-secondary">Chỉ gợi ý các món chay khi random</p>
          </div>
          <Toggle
            checked={settings.vegetarianMode}
            onChange={onToggleVegetarian}
            label="Chế độ ăn chay"
          />
        </div>
        <div className="flex items-center justify-between p-4 rounded-xl bg-soft-blue/30">
          <div className="space-y-0.5 pr-4">
            <div className="font-semibold text-text-primary flex items-center gap-2">
              <History className="size-4 text-primary-blue" aria-hidden />
              <span>Cho phép trùng lặp món trong 24 giờ</span>
            </div>
            <p className="text-sm text-text-secondary">
              Cho phép random ra món bạn đã ăn hoặc được gợi ý trong ngày hôm nay
            </p>
          </div>
          <Toggle
            checked={settings.allowRepeatWithin24h}
            onChange={onToggleAllowRepeat}
            label="Cho phép trùng lặp món trong 24 giờ"
          />
        </div>
      </div>
    </section>
  );
}
