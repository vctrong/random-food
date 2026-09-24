import Image from "next/image";
import Link from "next/link";
import type { EatingLevel } from "@/types/food";
import { EATING_LEVELS } from "@/constants/categories";
import { BRAND } from "@/constants/brand";
import { cn } from "@/lib/utils";

/**
 * Sóng tuần hoàn chu kỳ 720 trong viewBox 2880 (4 chu kỳ = 2 nửa giống hệt nhau) —
 * SVG rộng 200% trượt đúng -50% nên vòng lặp liền mạch, chỉ animate transform.
 */
const WAVE_PATH =
  "M0 40 C180 10 540 70 720 40 C900 10 1260 70 1440 40 C1620 10 1980 70 2160 40 C2340 10 2700 70 2880 40 V100 H0 Z";

function Wave({ className }: { className: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 2880 100"
      preserveAspectRatio="none"
      className={cn("absolute left-0 w-[200%] fill-current", className)}
    >
      <path d={WAVE_PATH} />
    </svg>
  );
}

function Hull({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 120 40" className={cn("block", className)}>
      <path d="M2 8 H118 L103 32 Q97 38 88 38 H32 Q23 38 17 32 Z" className="fill-secondary" />
      <path d="M10 15 H110" className="stroke-secondary-strong" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M2 8 H118" className="stroke-secondary-strong" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Ghe chở 1 mức ăn — bấm mở danh sách món đã lọc theo mức đó. */
function LevelBoat({ levelId, bobClass, delay, className }: { levelId: EatingLevel; bobClass: string; delay: string; className?: string }) {
  const level = EATING_LEVELS.find((item) => item.id === levelId);
  if (!level) return null;
  const Icon = level.icon;
  return (
    <div className={cn(bobClass, className)} style={{ animationDelay: delay }}>
      <Link
        href={`/mon-an?muc=${level.id}`}
        className="group flex flex-col items-center transition-transform duration-300 hover:-translate-y-1"
      >
        <span className="rounded-md border border-secondary/40 bg-surface px-2 py-0.5 font-heading text-[11px] text-secondary-strong shadow-sm whitespace-nowrap dark:text-text-primary">
          {level.label}
        </span>
        <span aria-hidden className="h-5 w-0.5 bg-secondary" />
        <span className="relative -mb-3 inline-flex size-9 items-center justify-center rounded-full border border-secondary/30 bg-surface text-secondary shadow-sm transition-transform duration-300 group-hover:rotate-12">
          <Icon className="size-4.5" aria-hidden />
        </span>
        <Hull className="w-24 sm:w-28" />
      </Link>
    </div>
  );
}

/** Cảnh chợ nổi: 2 lớp sóng + 5 chiếc ghe nhấp nhô (ghe giữa chở linh vật). */
export function RiverScene() {
  return (
    <div className="relative h-[200px] overflow-hidden sm:h-[240px]">
      <Wave className="bottom-14 h-20 text-primary/20 animate-wave-drift dark:text-primary/15" />

      <div className="absolute inset-x-0 bottom-9 z-10 flex items-end justify-around px-2 sm:px-8">
        <LevelBoat levelId="snack" bobClass="animate-boat-bob" delay="0s" />
        <LevelBoat levelId="normal" bobClass="animate-boat-bob-alt" delay="-1.2s" className="hidden sm:block" />

        <div className="animate-boat-bob" style={{ animationDelay: "-0.6s" }}>
          <Link href="/random" className="group flex flex-col items-center transition-transform duration-300 hover:-translate-y-1">
            <span className="rounded-full bg-primary-strong px-2.5 py-0.5 font-heading text-[11px] text-white shadow-md whitespace-nowrap">
              Chào bạn nha!
            </span>
            <span aria-hidden className="h-4 w-0.5 bg-secondary" />
            <span className="relative -mb-5 block size-14 transition-transform duration-300 group-hover:-rotate-6">
              <Image src={BRAND.mascot} alt="Linh vật Nay Ăn Gì? — bấm để random món" fill sizes="56px" className="object-contain" />
            </span>
            <Hull className="w-32 sm:w-36" />
          </Link>
        </div>

        <LevelBoat levelId="hearty" bobClass="animate-boat-bob-alt" delay="-2s" className="hidden sm:block" />
        <LevelBoat levelId="full" bobClass="animate-boat-bob" delay="-1.6s" />
      </div>

      <Wave className="bottom-0 z-20 h-16 text-primary/35 animate-wave-drift-fast dark:text-primary-soft" />
    </div>
  );
}
