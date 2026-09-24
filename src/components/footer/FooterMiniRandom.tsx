"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Dices, Loader2, MapPin, Sailboat, Sparkles } from "lucide-react";
import type { Food } from "@/types/food";
import { getAllFoodsFromClient } from "@/services/foodService";
import { pickRandomFood } from "@/features/random-food/randomLogic";
import { FoodImage } from "@/components/food/FoodImage";
import { formatPriceShort, getGoogleMapsUrl } from "@/lib/utils";

type Status = "idle" | "loading" | "empty";

/** "Thả một chiếc ghe" — random nhanh 1 món thật (tải danh sách món lần đầu bấm, dùng lại cho các lần sau). */
export function FooterMiniRandom() {
  const foodsRef = useRef<Food[] | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [food, setFood] = useState<Food | null>(null);

  async function dropBoat() {
    if (status === "loading") return;
    if (!foodsRef.current) {
      setStatus("loading");
      foodsRef.current = await getAllFoodsFromClient();
    }
    const picked = pickRandomFood(foodsRef.current, food?.id);
    setFood(picked);
    setStatus(picked ? "idle" : "empty");
  }

  return (
    <div className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl border-2 border-accent/60 bg-surface/90 p-6 text-center shadow-xl backdrop-blur-md sm:p-8">
      <Sparkles aria-hidden className="absolute right-6 bottom-4 size-5 text-warning animate-twinkle" />
      <div className="mx-auto max-w-md">
        <span className="inline-block rounded-full border border-accent/60 bg-accent-soft px-3.5 py-1 text-xs font-bold text-accent-ink">
          Vẫn chưa quyết định được?
        </span>
        <h2 className="text-h2 mt-3 text-text-primary">Vẫn chưa biết ăn gì?</h2>
        <p className="mt-2 text-sm text-text-secondary">
          Thả một chiếc ghe, để nó chở ngẫu nhiên một món ngon trôi đến giải cứu chiếc bụng đói của bạn.
        </p>
        <button
          type="button"
          onClick={dropBoat}
          disabled={status === "loading"}
          className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary-strong px-7 font-heading text-base text-white shadow-[0_4px_0_0_var(--color-primary-strong-hover)] transition-transform hover:-translate-y-0.5 active:translate-y-1 active:shadow-none disabled:opacity-70"
        >
          {status === "loading" ? (
            <Loader2 className="size-5 animate-spin" aria-hidden />
          ) : (
            <Sailboat className="size-5" aria-hidden />
          )}
          {food ? "Thả chiếc ghe khác" : "Thả một chiếc ghe"}
        </button>
      </div>

      <div aria-live="polite">
        <AnimatePresence mode="wait">
          {food && (
            <motion.div
              key={food.id}
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              className="mx-auto mt-5 flex max-w-lg items-center gap-4 rounded-2xl border-2 border-primary/50 bg-surface p-3.5 text-left shadow-lg"
            >
              <div className="relative size-20 shrink-0 overflow-hidden rounded-xl">
                <FoodImage src={food.images[0]} alt={food.name} sizes="80px" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p className="font-heading text-base text-text-primary">{food.name}</p>
                  <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success">Trúng món rồi!</span>
                </div>
                <p className="mt-0.5 truncate text-xs text-text-secondary">
                  {[food.restaurant?.name, formatPriceShort(food.priceMin, food.priceMax)].filter(Boolean).join(" • ")}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Link
                    href={`/mon-an/${food.id}`}
                    className="inline-flex min-h-9 items-center gap-1 rounded-full bg-primary-strong px-3 text-xs font-bold text-white"
                  >
                    <Dices className="size-3.5" aria-hidden />
                    Xem món này
                  </Link>
                  {food.restaurant && (
                    <a
                      href={getGoogleMapsUrl(food.restaurant.location, food.restaurant.address)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-9 items-center gap-1 rounded-full bg-accent-soft px-3 text-xs font-bold text-accent-ink"
                    >
                      <MapPin className="size-3.5" aria-hidden />
                      Chỉ đường
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {status === "empty" && (
          <p className="mt-4 text-sm text-text-secondary">Hiện chưa có món nào để thả ghe — quay lại sau nhé!</p>
        )}
      </div>
    </div>
  );
}
