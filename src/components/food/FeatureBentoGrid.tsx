"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  ArrowRight,
  Bookmark,
  Dices,
  Heart,
  History,
  LogIn,
  MapPinned,
  PlusCircle,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Food } from "@/types/food";
import { useLandingRandom } from "@/features/random-food/LandingRandomProvider";
import { getAllHistory } from "@/services/historyService";
import { getSavedFoodRecords } from "@/services/savedFoodService";
import { cn, formatRelativeTime } from "@/lib/utils";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";

const PREVIEW_COUNT = 3;

interface PersonalPreview {
  history: { id: string; food: Food; timestamp: string }[];
  saved: Food[];
}

function TileIcon({ icon: Icon, className }: { icon: LucideIcon; className: string }) {
  return (
    <span className={cn("flex size-11 items-center justify-center rounded-2xl border-2 border-secondary shadow-chunky-sm", className)}>
      <Icon className="size-5" aria-hidden />
    </span>
  );
}

function TileLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-1 text-sm font-bold text-primary hover:text-secondary-strong dark:hover:text-text-primary transition-colors"
    >
      {children}
      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}

function LoginPrompt({ text }: { text: string }) {
  return (
    <Link
      href="/dang-nhap"
      className="flex items-center gap-3 rounded-xl border-2 border-dashed border-border bg-surface/70 p-3 text-sm text-text-secondary transition-colors hover:border-primary"
    >
      <LogIn className="size-4 shrink-0 text-primary" aria-hidden />
      <span>
        {text} <span className="font-bold text-primary">Đăng nhập</span>
      </span>
    </Link>
  );
}

interface FeatureBentoGridProps {
  restaurantCount: number;
}

export function FeatureBentoGrid({ restaurantCount }: FeatureBentoGridProps) {
  const { allFoods, scrollToMachineAndSpin } = useLandingRandom();
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated" && Boolean(session?.user);
  const [preview, setPreview] = useState<PersonalPreview | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    Promise.all([getAllHistory(allFoods), getSavedFoodRecords()]).then(([history, savedRecords]) => {
      if (cancelled) return;
      const foodsById = new Map(allFoods.map((food) => [food.id, food]));
      setPreview({
        history: [...history]
          .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
          .flatMap((entry) => {
            const food = foodsById.get(entry.foodId);
            return food ? [{ id: entry.id, food, timestamp: entry.timestamp }] : [];
          })
          .slice(0, PREVIEW_COUNT),
        saved: [...savedRecords]
          .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
          .flatMap((record) => {
            const food = foodsById.get(record.foodId);
            return food ? [food] : [];
          })
          .slice(0, PREVIEW_COUNT),
      });
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, allFoods]);

  const isLoadingPreview = isAuthenticated && preview === null;

  return (
    <section aria-labelledby="bento-title" className="border-t border-border bg-surface/60 py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
        <SectionHeading
          id="bento-title"
          align="center"
          tone="pink"
          eyebrow="Hệ sinh thái ăn uống"
          title="Không chỉ random — đồng hành cả hành trình ăn uống"
        />

        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
          {/* Lịch sử ăn uống */}
          <Reveal className="md:col-span-2">
            <div className="flex h-full flex-col justify-between gap-6 rounded-3xl border border-border bg-primary-soft p-6 sm:p-8">
              <div>
                <TileIcon icon={History} className="bg-primary-strong text-white" />
                <h3 className="mt-4 text-xl sm:text-2xl font-semibold text-text-primary">Lịch sử ăn uống</h3>
                <p className="mt-1 max-w-xl text-sm text-text-secondary">
                  Check-in mỗi lần ghé quán để app nhớ giúp bạn đã ăn gì — đỡ ăn trùng món hôm qua.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {isAuthenticated ? (
                  <>
                    {isLoadingPreview &&
                      Array.from({ length: 2 }, (_, index) => (
                        <div key={index} className="h-18 animate-pulse rounded-xl bg-surface/70" aria-hidden />
                      ))}
                    {preview?.history.map((entry) => (
                      <Link
                        key={entry.id}
                        href={`/mon-an/${entry.food.id}`}
                        className="rounded-xl border border-border bg-surface p-3 text-xs transition-colors hover:border-primary"
                      >
                        <span className="font-semibold text-text-secondary">{formatRelativeTime(entry.timestamp)}</span>
                        <p className="mt-0.5 truncate font-heading text-sm font-semibold text-text-primary">
                          {entry.food.name}
                        </p>
                        <span className="mt-1 inline-block font-bold text-success">Đã ăn</span>
                      </Link>
                    ))}
                    {preview && preview.history.length === 0 && (
                      <p className="rounded-xl border border-border bg-surface p-3 text-sm text-text-secondary sm:col-span-2">
                        Chưa có bữa nào được ghi lại. Random một món, ghé quán rồi đánh dấu “Đã ăn” nhé.
                      </p>
                    )}
                  </>
                ) : (
                  <div className="sm:col-span-2">
                    <LoginPrompt text="Lịch sử chỉ lưu cho tài khoản." />
                  </div>
                )}
                <button
                  type="button"
                  onClick={scrollToMachineAndSpin}
                  className="flex flex-col items-start rounded-xl border-2 border-dashed border-primary/50 bg-surface/60 p-3 text-left text-xs transition-colors hover:border-primary"
                >
                  <span className="font-semibold text-text-secondary">Bữa tiếp theo</span>
                  <span className="mt-0.5 font-heading text-sm font-semibold text-primary">Sẵn sàng gạt cần!</span>
                  <span className="mt-1 inline-flex items-center gap-1 font-bold text-text-primary">
                    <Dices className="size-3.5" aria-hidden />
                    Random ngay
                  </span>
                </button>
              </div>
            </div>
          </Reveal>

          {/* Món đã lưu */}
          <Reveal delay={0.08}>
            <div className="flex h-full flex-col justify-between gap-6 rounded-3xl border border-border bg-accent-soft p-6 sm:p-8">
              <div>
                <TileIcon icon={Bookmark} className="bg-accent text-secondary-strong" />
                <h3 className="mt-4 text-xl sm:text-2xl font-semibold text-text-primary">Món đã lưu</h3>
                <p className="mt-1 text-sm text-text-secondary">Kho “quán chân ái” bạn tích góp sau những lần quay trúng.</p>
              </div>
              <div className="space-y-2">
                {isAuthenticated ? (
                  <>
                    {isLoadingPreview && <div className="h-10 animate-pulse rounded-xl bg-surface/70" aria-hidden />}
                    {preview?.saved.map((food) => (
                      <Link
                        key={food.id}
                        href={`/mon-an/${food.id}`}
                        className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm font-semibold text-text-primary transition-colors hover:border-accent"
                      >
                        <span className="truncate">{food.name}</span>
                        <Heart className="size-4 shrink-0 fill-accent text-accent-ink" aria-hidden />
                      </Link>
                    ))}
                    {preview && preview.saved.length === 0 && (
                      <p className="rounded-xl border border-border bg-surface p-3 text-sm text-text-secondary">
                        Chưa lưu món nào — bấm “Lưu món” ở thẻ kết quả random.
                      </p>
                    )}
                    <TileLink href="/da-luu">Xem tất cả món đã lưu</TileLink>
                  </>
                ) : (
                  <LoginPrompt text="Lưu món cần có tài khoản." />
                )}
              </div>
            </div>
          </Reveal>

          {/* Bản đồ */}
          <Reveal delay={0.12}>
            <div className="flex h-full flex-col justify-between gap-6 rounded-3xl border border-border bg-surface p-6 sm:p-8">
              <div>
                <TileIcon icon={MapPinned} className="bg-warning text-secondary-strong" />
                <h3 className="mt-4 text-xl sm:text-2xl font-semibold text-text-primary">Bản đồ ẩm thực Tây Đô</h3>
                <p className="mt-1 text-sm text-text-secondary">
                  Mỗi món đều gắn với vị trí quán thật — chỉ đường bằng Google Maps chỉ với 1 chạm.
                </p>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-warning/60 bg-warning/15 p-4 text-sm">
                <span className="font-bold text-text-primary">{restaurantCount} quán đã có vị trí</span>
                <TileLink href="/mon-an">Xem món</TileLink>
              </div>
            </div>
          </Reveal>

          {/* Cộng đồng */}
          <Reveal delay={0.16} className="md:col-span-2">
            <div className="flex h-full flex-col justify-between gap-6 rounded-3xl border border-border bg-success/10 p-6 sm:p-8">
              <div>
                <TileIcon icon={Users} className="bg-success text-secondary-strong" />
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-xl sm:text-2xl font-semibold text-text-primary">Cộng đồng thổ địa Cần Thơ</h3>
                  <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-success/40 bg-surface px-3 py-1 text-xs font-bold text-success">
                    <ShieldCheck className="size-3.5" aria-hidden />
                    Được reviewer kiểm duyệt
                  </span>
                </div>
                <p className="mt-1 max-w-xl text-sm text-text-secondary">
                  Món và quán do chính người dùng đóng góp, FoodReviewer kiểm duyệt trước khi xuất hiện trong random.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/mon-an/dong-gop"
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-secondary bg-surface px-4 py-2.5 text-sm font-bold text-text-primary shadow-chunky-sm transition-transform hover:-translate-y-0.5 active:translate-y-0.5"
                >
                  <PlusCircle className="size-4 text-success" aria-hidden />
                  Đóng góp quán mới
                </Link>
                <TileLink href="/ung-tuyen-reviewer">Ứng tuyển làm reviewer</TileLink>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
