import Image from "next/image";
import { cn, isAllowedImageHost } from "@/lib/utils";

/**
 * Ảnh mặc định khi quán chưa có ảnh — DB không bao giờ lưu URL này (`images` để
 * mảng rỗng). Muốn đổi ảnh mặc định chỉ cần thay file ở public/image.
 */
export const DEFAULT_RESTAURANT_IMAGE = "/image/default-restaurant.svg";

/** Ảnh hiển thị của quán: ảnh đầu tiên hợp lệ, không có thì ảnh mặc định. */
export function resolveRestaurantImage(images: readonly string[] | string | null | undefined): string {
  const first = Array.isArray(images) ? images[0] : images;
  return first && isAllowedImageHost(first) ? first : DEFAULT_RESTAURANT_IMAGE;
}

interface RestaurantImageProps {
  images: readonly string[] | string | null | undefined;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
}

/** Nơi DUY NHẤT xử lý fallback ảnh quán — dùng ở mọi chỗ hiển thị ảnh quán. Cha cần `relative` + kích thước. */
export function RestaurantImage({ images, alt, sizes, className, priority }: RestaurantImageProps) {
  const src = resolveRestaurantImage(images);
  const isDefault = src === DEFAULT_RESTAURANT_IMAGE;
  return (
    <Image
      src={src}
      alt={isDefault ? "" : alt}
      fill
      sizes={sizes}
      priority={priority}
      unoptimized={isDefault}
      className={cn("object-cover", className)}
    />
  );
}
