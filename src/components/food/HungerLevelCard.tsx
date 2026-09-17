import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Heart } from "lucide-react";
import type { EatingLevelConfig } from "@/constants/categories";
import { cn } from "@/lib/utils";

interface HungerLevelCardProps {
  config: EatingLevelConfig;
  highlighted?: boolean;
  priority?: boolean;
}

export function HungerLevelCard({ config, highlighted = false, priority = false }: HungerLevelCardProps) {
  const Icon = config.icon;

  return (
    <article
      className={cn(
        "group relative flex flex-col justify-between rounded-2xl bg-white shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden hover:-translate-y-1",
        highlighted && "ring-2 ring-primary-blue shadow-md",
      )}
    >
      <div>
        <div className="relative h-44 w-full overflow-hidden bg-soft-blue">
          <Image
            src={`https://picsum.photos/seed/${config.imageSeed}/480/360`}
            alt={`Ảnh minh hoạ nhóm món ${config.label.toLowerCase()}`}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            priority={priority}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
          <span
            className={cn(
              "absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold shadow-sm",
              highlighted
                ? "bg-primary-blue text-white"
                : "bg-white/90 backdrop-blur-md text-primary-pink",
            )}
          >
            {config.badge}
          </span>
          <button
            type="button"
            aria-label="Lưu nhóm món này"
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-primary-pink hover:scale-110 transition-transform shadow-sm"
          >
            <Heart className="size-4" aria-hidden />
          </button>
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs font-semibold">
            <span className="flex items-center gap-1">
              <Icon className="size-3.5" aria-hidden />
              {config.tagline}
            </span>
            <span className="bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full">
              {config.kcalRange}
            </span>
          </div>
        </div>

        <div className="p-5">
          <h3 className="text-lg font-semibold text-text-primary group-hover:text-primary-blue transition-colors">
            {config.label}
          </h3>
          <p className="text-sm font-medium text-primary-blue mt-0.5">{config.tagline}</p>
          <p className="text-sm text-text-secondary mt-2 line-clamp-2">{config.description}</p>
        </div>
      </div>

      <div className="px-5 pb-5 pt-1">
        <Link
          href={`/random?muc-do=${config.id}`}
          className={cn(
            "w-full h-11 inline-flex items-center justify-center gap-1 rounded-full text-sm font-semibold transition-all active:scale-95",
            highlighted
              ? "bg-primary-blue text-white shadow-[0_4px_12px_rgba(91,158,235,0.28)] hover:bg-[#4a8ddb]"
              : "bg-soft-blue text-text-primary hover:bg-primary-blue hover:text-white",
          )}
        >
          <span>Chọn {config.label}</span>
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
        </Link>
      </div>
    </article>
  );
}
