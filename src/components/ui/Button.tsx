"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "dark";
type Size = "sm" | "md" | "lg";

interface BaseProps {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
  className?: string;
  children: ReactNode;
}

type ButtonAsButton = BaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseProps> & {
    href?: undefined;
  };

type ButtonAsLink = BaseProps & {
  href: string;
};

type ButtonProps = ButtonAsButton | ButtonAsLink;

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-primary-strong text-white shadow-[0_4px_12px_color-mix(in_oklab,var(--color-primary)_28%,transparent)] hover:bg-primary-strong-hover hover:shadow-lg",
  secondary:
    "bg-surface text-text-primary shadow-sm hover:bg-primary-soft border border-border",
  outline:
    "bg-transparent text-text-primary border border-border hover:bg-primary-soft",
  dark: "bg-text-primary text-white hover:bg-[#374151]",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "h-9 px-4 text-sm gap-1.5",
  md: "h-11 px-5 text-[15px] gap-2",
  lg: "h-12 px-6 text-base gap-2",
};

export function Button(props: ButtonProps) {
  const {
    variant = "primary",
    size = "md",
    isLoading = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    className,
    children,
    href: _href,
    ...rest
  } = props as BaseProps & { href?: string } & Omit<
      ButtonHTMLAttributes<HTMLButtonElement>,
      keyof BaseProps
    >;

  const classes = cn(
    "inline-flex items-center justify-center rounded-full font-semibold transition-all duration-200 active:scale-95 disabled:opacity-60 disabled:pointer-events-none",
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    fullWidth && "w-full",
    className,
  );

  const content = (
    <>
      {isLoading ? (
        <Loader2 className="size-[1.1em] animate-spin" aria-hidden />
      ) : (
        leftIcon
      )}
      <span>{children}</span>
      {!isLoading && rightIcon}
    </>
  );

  if ("href" in props && props.href) {
    return (
      <Link href={props.href} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <button
      {...rest}
      disabled={rest.disabled || isLoading}
      className={classes}
    >
      {content}
    </button>
  );
}
