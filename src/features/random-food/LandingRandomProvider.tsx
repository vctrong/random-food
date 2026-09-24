"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import type { EatingLevel, Food } from "@/types/food";
import { useRandomFood } from "@/features/random-food/useRandomFood";
import {
  REEL_KEYS,
  buildIdleStrip,
  buildReelStrip,
  getReelLabels,
  IDLE_REEL_LABEL,
  type ReelKey,
  type ReelLabels,
} from "@/features/random-food/slotReel";

/** id của khung máy random — các section bên dưới cuộn về đây trước khi quay. */
export const SLOT_MACHINE_ANCHOR_ID = "may-random";

const SPIN_SETTLE_MS = 1900;
const SPIN_SETTLE_REDUCED_MS = 200;
const REEL_FILLER_COUNT = 14;

const IDLE_LABELS: ReelLabels = { dish: IDLE_REEL_LABEL, place: IDLE_REEL_LABEL, price: IDLE_REEL_LABEL };

interface ReelState {
  spinKey: number;
  strips: Record<ReelKey, string[]>;
}

type LandingRandomValue = ReturnType<typeof useRandomFood> & {
  allFoods: Food[];
  reelState: ReelState;
  prefersReducedMotion: boolean;
  spin: () => void;
  /** Cuộn về máy random rồi quay — cho nút ở các section bên dưới hero. */
  scrollToMachineAndSpin: () => void;
  /** Đặt bộ lọc mức độ ăn rồi cuộn về máy (không tự quay — để người dùng tự gạt). */
  chooseEatingLevel: (level: EatingLevel) => void;
  /** Đặt mức độ ăn, cuộn về máy và quay luôn (vòng quay may mắn). */
  spinWithEatingLevel: (level: EatingLevel) => void;
  resetFilters: () => void;
};

const LandingRandomContext = createContext<LandingRandomValue | null>(null);

/**
 * State random DÙNG CHUNG cho cả landing: máy ở hero, card mức độ ăn, vòng quay
 * may mắn và CTA cuối trang đều điều khiển cùng 1 máy (cùng bộ lọc, cùng kết quả).
 */
export function LandingRandomProvider({ allFoods, children }: { allFoods: Food[]; children: ReactNode }) {
  const prefersReducedMotion = Boolean(useReducedMotion());
  const random = useRandomFood({
    allFoods,
    initialEatingLevel: null,
    initialCategoryId: null,
    initialFood: null,
    randomizeDurationMs: prefersReducedMotion ? SPIN_SETTLE_REDUCED_MS : SPIN_SETTLE_MS,
  });
  const { currentFood, randomize, randomizeWithLevel, setEatingLevel, setMaxPrice } = random;

  // Nhãn lấp cho cuộn lấy từ TOÀN BỘ món thật (không chỉ pool đang lọc) để cuộn
  // luôn đủ phong phú kể cả khi bộ lọc chỉ còn vài món.
  const sourceLabels = useMemo(() => {
    const labels = allFoods.map(getReelLabels);
    return {
      dish: labels.map((item) => item.dish),
      place: labels.map((item) => item.place),
      price: labels.map((item) => item.price),
    } satisfies Record<ReelKey, string[]>;
  }, [allFoods]);

  const [reelState, setReelState] = useState<ReelState>(() => ({
    spinKey: 0,
    strips: {
      dish: buildIdleStrip(sourceLabels.dish),
      place: buildIdleStrip(sourceLabels.place),
      price: buildIdleStrip(sourceLabels.price),
    },
  }));

  const startSpin = useCallback(
    (pickNextFood: () => Food | null | undefined) => {
      const fromLabels = currentFood ? getReelLabels(currentFood) : IDLE_LABELS;
      const nextFood = pickNextFood();
      if (!nextFood) return;
      const targetLabels = getReelLabels(nextFood);
      setReelState((prev) => ({
        spinKey: prev.spinKey + 1,
        strips: Object.fromEntries(
          REEL_KEYS.map((key) => [
            key,
            buildReelStrip(sourceLabels[key], fromLabels[key], targetLabels[key], REEL_FILLER_COUNT),
          ]),
        ) as Record<ReelKey, string[]>,
      }));
    },
    [currentFood, sourceLabels],
  );

  const spin = useCallback(() => startSpin(randomize), [startSpin, randomize]);

  const scrollToMachine = useCallback(() => {
    document.getElementById(SLOT_MACHINE_ANCHOR_ID)?.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "center",
    });
  }, [prefersReducedMotion]);

  const scrollToMachineAndSpin = useCallback(() => {
    scrollToMachine();
    spin();
  }, [scrollToMachine, spin]);

  const chooseEatingLevel = useCallback(
    (level: EatingLevel) => {
      setEatingLevel(level);
      scrollToMachine();
    },
    [setEatingLevel, scrollToMachine],
  );

  const spinWithEatingLevel = useCallback(
    (level: EatingLevel) => {
      scrollToMachine();
      startSpin(() => randomizeWithLevel(level));
    },
    [scrollToMachine, startSpin, randomizeWithLevel],
  );

  const resetFilters = useCallback(() => {
    setEatingLevel(null);
    setMaxPrice(null);
  }, [setEatingLevel, setMaxPrice]);

  const value: LandingRandomValue = {
    ...random,
    allFoods,
    reelState,
    prefersReducedMotion,
    spin,
    scrollToMachineAndSpin,
    chooseEatingLevel,
    spinWithEatingLevel,
    resetFilters,
  };

  return <LandingRandomContext.Provider value={value}>{children}</LandingRandomContext.Provider>;
}

export function useLandingRandom(): LandingRandomValue {
  const context = useContext(LandingRandomContext);
  if (!context) throw new Error("useLandingRandom phải dùng bên trong <LandingRandomProvider>.");
  return context;
}
