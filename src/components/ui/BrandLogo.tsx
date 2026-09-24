import Image from "next/image";
import Link from "next/link";
import { BRAND } from "@/constants/brand";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  priority?: boolean;
  sizes?: string;
}

/** Logo đầy đủ (linh vật + chữ trên khối xanh) — footer, trang đăng nhập/đăng ký. Bấm về trang chủ. */
export function BrandLogo({ className, priority, sizes = "220px" }: BrandLogoProps) {
  return (
    <Link href="/" aria-label={`${BRAND.name} — về trang chủ`} className="inline-block w-fit">
      <Image
        src={BRAND.logoFull.src}
        alt={`Logo ${BRAND.name}`}
        width={BRAND.logoFull.width}
        height={BRAND.logoFull.height}
        sizes={sizes}
        priority={priority}
        className={cn("h-[72px] w-auto rounded-2xl shadow-sm", className)}
      />
    </Link>
  );
}
