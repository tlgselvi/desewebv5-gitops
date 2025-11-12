"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  readonly variant?: "elevated" | "outlined" | "ghost";
}

const variantClasses: Record<NonNullable<CardProps["variant"]>, string> = {
  elevated:
    "bg-white shadow-lg shadow-blue-100/40 border border-transparent dark:bg-slate-900 dark:shadow-blue-900/30",
  outlined: "bg-white border border-gray-200 shadow-sm dark:bg-slate-900 dark:border-slate-800",
  ghost: "bg-blue-50/60 border border-blue-100 dark:bg-slate-800 dark:border-slate-700",
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "outlined", ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-2xl p-6 transition-transform duration-200 ease-out hover:-translate-y-0.5",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  ),
);

Card.displayName = "Card";

