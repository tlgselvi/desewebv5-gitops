"use client";

import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  readonly variant?: "default" | "chip";
}

const variantClasses: Record<NonNullable<SkeletonProps["variant"]>, string> = {
  default: "h-4 w-full rounded-md",
  chip: "h-6 w-24 rounded-full",
};

export function Skeleton({
  className,
  variant = "default",
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse bg-slate-200 dark:bg-slate-700",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}

