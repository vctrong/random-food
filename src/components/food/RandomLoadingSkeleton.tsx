import { Dice5 } from "lucide-react";

/** Hiệu ứng "xóc đĩa" ngắn khi đang chọn món, thay cho crossfade đột ngột. */
export function RandomLoadingSkeleton() {
  return (
    <div className="animate-fade-slide-up">
      <div className="relative w-full h-72 sm:h-96 md:h-[420px] rounded-xl overflow-hidden mb-6 bg-primary-soft animate-pulse flex items-center justify-center">
        <Dice5 className="size-12 text-primary/50 animate-spin" style={{ animationDuration: "900ms" }} aria-hidden />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-20 rounded-xl bg-primary-soft animate-pulse" />
        ))}
      </div>
      <div className="h-16 rounded-xl bg-primary-soft animate-pulse" />
    </div>
  );
}
