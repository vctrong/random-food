import { Moon, Sparkle } from "lucide-react";
import { cn } from "@/lib/utils";

const LANTERNS = [
  { string: "h-6", tone: "fill-accent", duration: "3.2s", delay: "0s" },
  { string: "h-10", tone: "fill-primary", duration: "2.8s", delay: "-0.4s" },
  { string: "h-7", tone: "fill-warning", duration: "3.5s", delay: "-0.9s" },
  { string: "h-11", tone: "fill-accent", duration: "3s", delay: "-0.2s" },
  { string: "h-8", tone: "fill-primary", duration: "3.4s", delay: "-0.7s" },
];

const STARS = [
  { position: "top-10 left-[12%]", size: "size-3.5", delay: "0s" },
  { position: "top-20 left-[30%]", size: "size-2.5", delay: "-0.6s" },
  { position: "top-8 left-[47%]", size: "size-3", delay: "-1.2s" },
  { position: "top-24 right-[34%]", size: "size-2.5", delay: "-0.8s" },
  { position: "top-12 right-[18%]", size: "size-4", delay: "-1.5s" },
  { position: "top-28 right-[7%]", size: "size-2.5", delay: "-0.3s" },
];

function Lantern({ tone }: { tone: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 34" className="w-6 drop-shadow-[0_0_8px_color-mix(in_oklab,var(--color-accent)_70%,transparent)]">
      <rect x="8" y="0" width="8" height="4" rx="1.5" className="fill-secondary" />
      <rect x="2" y="4" width="20" height="24" rx="10" className={tone} />
      <path d="M12 5 V27 M7 7 Q4 16 7 26 M17 7 Q20 16 17 26" className="stroke-secondary/40" strokeWidth="1" fill="none" />
      <rect x="8" y="28" width="8" height="3" rx="1.5" className="fill-secondary" />
      <path d="M12 31 V34" className="stroke-warning" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** Trang trí bầu trời chạng vạng: đèn lồng đung đưa, sao lấp lánh, trăng (chỉ dark). */
export function FooterSky() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {STARS.map((star) => (
        <Sparkle
          key={star.position}
          className={cn("absolute fill-warning text-warning animate-twinkle", star.position, star.size)}
          style={{ animationDelay: star.delay }}
        />
      ))}

      <div className="absolute top-6 right-10 hidden flex-col items-center dark:flex">
        <Moon className="size-9 fill-warning text-warning drop-shadow-[0_0_14px_color-mix(in_oklab,var(--color-warning)_60%,transparent)]" />
        <span className="mt-1 font-heading text-[10px] text-warning">Trăng sông Hậu</span>
      </div>

      <div className="flex justify-between px-8 lg:px-24">
        {LANTERNS.map((lantern, index) => (
          <div
            key={index}
            className={cn("flex flex-col items-center animate-lantern-sway", index % 2 === 1 && "hidden sm:flex")}
            style={{ animationDuration: lantern.duration, animationDelay: lantern.delay }}
          >
            <span className={cn("w-0.5 bg-secondary/40", lantern.string)} />
            <Lantern tone={lantern.tone} />
          </div>
        ))}
      </div>
    </div>
  );
}
