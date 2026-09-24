import Image from "next/image";
import type { AboutImage } from "@/constants/about";
import { cn } from "@/lib/utils";

interface AboutPhotoProps {
  image: AboutImage;
  sizes: string;
  className?: string;
  imageClassName?: string;
  /** Vd. chừa lề phải khi có ảnh khác chồng lên góc dưới. */
  captionClassName?: string;
  priority?: boolean;
}

/** Khung ảnh bo góc của trang Về chúng tôi — zoom nhẹ khi hover, chú thích trên lớp phủ tối. */
export function AboutPhoto({
  image,
  sizes,
  className,
  imageClassName,
  captionClassName,
  priority = false,
}: AboutPhotoProps) {
  return (
    <figure className={cn("group relative overflow-hidden rounded-3xl border border-border bg-surface", className)}>
      <Image
        src={image.src}
        alt={image.alt}
        fill
        sizes={sizes}
        priority={priority}
        className={cn(
          "object-cover transition-transform duration-700 ease-out group-hover:scale-105",
          imageClassName,
        )}
      />
      {(image.caption || image.credit) && (
        <figcaption
          className={cn(
            "absolute inset-x-0 bottom-0 flex flex-col gap-0.5 bg-gradient-to-t from-black/65 to-transparent px-4 pt-12 pb-3.5 text-white",
            captionClassName,
          )}
        >
          {image.caption && <span className="text-sm font-bold leading-snug">{image.caption}</span>}
          {image.credit && <span className="text-[11px] text-white/80">Ảnh: {image.credit}</span>}
        </figcaption>
      )}
    </figure>
  );
}
