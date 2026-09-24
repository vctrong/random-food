import Image from "next/image";
import { BRAND } from "@/constants/brand";

interface PageLoadingProps {
  message?: string;
  cardCount?: number;
}

/** Trạng thái chờ khi chuyển trang: linh vật nhấp nhô + khung xương (skeleton) dạng lưới card. */
export function PageLoading({ message = "Đang tải...", cardCount = 6 }: PageLoadingProps) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-10" aria-busy="true">
      <div className="flex flex-col items-center gap-3 mb-10">
        <span className="relative size-16 animate-boat-bob">
          <Image src={BRAND.mascot} alt="" fill sizes="64px" priority className="object-contain" />
        </span>
        <p className="text-sm text-text-secondary">{message}</p>
      </div>
      <div className="h-8 w-56 rounded-lg bg-primary-soft animate-pulse mb-6" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: cardCount }).map((_, index) => (
          <div key={index} className="rounded-2xl bg-surface border border-border overflow-hidden">
            <div className="h-44 bg-primary-soft animate-pulse" />
            <div className="p-4 space-y-3">
              <div className="h-4 w-3/4 rounded bg-primary-soft animate-pulse" />
              <div className="h-3 w-1/2 rounded bg-accent-soft animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
