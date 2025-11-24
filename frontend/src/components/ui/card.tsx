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

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 -m-6 mb-0 p-6 pb-4", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-2xl font-semibold leading-none tracking-tight", className)} {...props} />
  ),
);
CardTitle.displayName = "CardTitle";

export const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-slate-500 dark:text-slate-400", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("-mx-6 -mb-6 px-6 pb-6", className)} {...props} />
  ),
);
CardContent.displayName = "CardContent";

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center -mx-6 -mb-6 px-6 pb-6", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

