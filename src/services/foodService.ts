import { MOCK_FOODS } from "@/data/foods";
import type { Food, HungerLevel } from "@/types/food";

/**
 * Lớp duy nhất "biết" data món ăn đến từ đâu (hiện tại là mock, sau này là API).
 * Component không được import `data/foods.ts` trực tiếp.
 */

export function getAllFoods(): Food[] {
  return MOCK_FOODS;
}

export function getFoodById(id: string): Food | undefined {
  return MOCK_FOODS.find((food) => food.id === id);
}

export function getFoodsByHungerLevel(level: HungerLevel): Food[] {
  return MOCK_FOODS.filter((food) => food.hungerLevel === level);
}

export function getFoodsByIds(ids: string[]): Food[] {
  const idSet = new Set(ids);
  return MOCK_FOODS.filter((food) => idSet.has(food.id));
}
