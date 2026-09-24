"use client";

import { useMemo, useState } from "react";
import type { EatingLevel, Food } from "@/types/food";

interface UseFoodListArgs {
  initialFoods: Food[];
  initialEatingLevel?: EatingLevel;
}

function normalize(text: string): string {
  return text.toLowerCase().trim();
}

export function useFoodList({ initialFoods, initialEatingLevel }: UseFoodListArgs) {
  const [search, setSearch] = useState("");
  const [eatingLevel, setEatingLevel] = useState<EatingLevel | "all">(initialEatingLevel ?? "all");
  const [categoryId, setCategoryId] = useState<string | "all">("all");

  const categoryOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    for (const food of initialFoods) {
      for (const category of food.categories) {
        const entry = map.get(category.id);
        if (entry) entry.count += 1;
        else map.set(category.id, { id: category.id, name: category.name, count: 1 });
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "vi"));
  }, [initialFoods]);

  const eatingLevelCounts = useMemo(() => {
    const counts = new Map<EatingLevel, number>();
    for (const food of initialFoods) {
      for (const level of food.eatingLevels) {
        counts.set(level, (counts.get(level) ?? 0) + 1);
      }
    }
    return counts;
  }, [initialFoods]);

  const filteredFoods = useMemo(() => {
    const query = normalize(search);
    return initialFoods.filter((food) => {
      if (eatingLevel !== "all" && !food.eatingLevels.includes(eatingLevel)) return false;
      if (categoryId !== "all" && !food.categories.some((category) => category.id === categoryId)) {
        return false;
      }
      if (query.length === 0) return true;
      const haystack = normalize(
        `${food.name} ${food.description} ${food.restaurant?.name ?? ""}`,
      );
      return haystack.includes(query);
    });
  }, [initialFoods, search, eatingLevel, categoryId]);

  return {
    search,
    setSearch,
    eatingLevel,
    setEatingLevel,
    categoryId,
    setCategoryId,
    categoryOptions,
    eatingLevelCounts,
    filteredFoods,
    isSystemEmpty: initialFoods.length === 0,
    hasNoFilterMatch: initialFoods.length > 0 && filteredFoods.length === 0,
  };
}
