"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Dice5, History, Soup } from "lucide-react";
import { FilterBar, type FilterOption } from "@/components/filters/FilterBar";

interface HeroRandomSectionProps {
  categories: { id: string; name: string }[];
}

export function HeroRandomSection({ categories }: HeroRandomSectionProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categoryOptions: FilterOption[] = useMemo(
    () => categories.map((category) => ({ id: category.id, label: category.name, icon: Soup })),
    [categories],
  );

  const randomHref = useMemo(() => {
    return activeCategory ? `/random?category=${activeCategory}` : "/random";
  }, [activeCategory]);

  return (
    <div className="flex flex-col items-center">
      <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-md">
        <Link
          href={randomHref}
          className="group flex-1 min-w-[180px] h-12 inline-flex items-center justify-center gap-2 rounded-full bg-primary-blue text-white font-semibold shadow-md hover:shadow-xl hover:bg-[#4a8ddb] transition-all active:scale-95"
        >
          <Dice5 className="size-5 group-hover:rotate-180 transition-transform duration-500" aria-hidden />
          <span>Random ngay</span>
        </Link>
        <Link
          href="/lich-su"
          className="h-12 inline-flex items-center justify-center gap-2 px-6 rounded-full bg-white hover:bg-soft-blue text-text-primary font-semibold shadow-sm transition-all active:scale-95"
        >
          <History className="size-4.5 text-text-secondary" aria-hidden />
          <span>Xem lịch sử</span>
        </Link>
      </div>

      {categoryOptions.length > 0 && (
        <FilterBar
          options={categoryOptions}
          value={activeCategory}
          onChange={setActiveCategory}
          className="justify-center pt-8"
        />
      )}
    </div>
  );
}
