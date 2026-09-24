"use client";

import { useState } from "react";
import Image from "next/image";
import { UtensilsCrossed } from "lucide-react";
import { cn, isAllowedImageHost } from "@/lib/utils";

interface FoodImageProps {
  src: string | null | undefined;
  alt: string;
  sizes: string;
  priority?: boolean;
  /** Class cho <Image> (vd hiệu ứng hover scale). Khung ngoài do nơi gọi quyết định (relative + kích thước). */
  imageClassName?: string;
  fallbackIconClassName?: string;
}

/**
 * Ảnh món từ Cloudinary qua next/image, lấp đầy khung cha (khung cha cần `relative`).
 * Có skeleton trong lúc tải và icon thay thế khi món chưa có ảnh / host không được phép.
 */
export function FoodImage({ src, alt, sizes, priority, imageClassName, fallbackIconClassName }: FoodImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  if (!src || !isAllowedImageHost(src)) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-primary-soft text-primary">
        <UtensilsCrossed className={cn("size-8", fallbackIconClassName)} aria-hidden />
      </div>
    );
  }

  return (
    <>
      {!isLoaded && <div className="absolute inset-0 animate-pulse bg-primary-soft" aria-hidden />}
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        onLoad={() => setIsLoaded(true)}
        className={cn(
          "object-cover transition-[opacity,transform] duration-500",
          isLoaded ? "opacity-100" : "opacity-0",
          imageClassName,
        )}
      />
    </>
  );
}
