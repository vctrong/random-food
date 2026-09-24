"use client";

import Link from "next/link";
import { Dice5 } from "lucide-react";
import { cn } from "@/lib/utils";

interface RandomButtonProps {
  href?: string;
  size?: "md" | "lg";
  className?: string;
  children?: string;
}

const SIZE_CLASSES = {
  md: "h-11 px-5 text-[15px] gap-2",
  lg: "h-12 px-6 text-base gap-2",
};

export function RandomButton({
  href = "/random",
  size = "lg",
  className,
  children = "Random ngay",
}: RandomButtonProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center justify-center rounded-full font-semibold bg-primary-strong text-white shadow-md hover:shadow-xl hover:bg-primary-strong-hover transition-all active:scale-95",
        SIZE_CLASSES[size],
        className,
      )}
    >
      <Dice5
        className="size-5 group-hover:rotate-180 transition-transform duration-500"
        aria-hidden
      />
      <span>{children}</span>
    </Link>
  );
}
