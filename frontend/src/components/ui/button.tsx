"use client";

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        primary:
          "bg-blue-600 text-white shadow-sm hover:bg-blue-500 focus-visible:ring-blue-600 dark:bg-blue-500 dark:hover:bg-blue-400",
        secondary:
          "bg-white text-gray-900 border border-gray-200 hover:bg-gray-100 focus-visible:ring-gray-300 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 dark:hover:bg-slate-800",
        subtle:
          "bg-blue-50 text-blue-700 border border-transparent hover:bg-blue-100 focus-visible:ring-blue-200 dark:bg-slate-800 dark:text-blue-200 dark:hover:bg-slate-700",
        ghost:
          "bg-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus-visible:ring-gray-200 dark:text-slate-300 dark:hover:text-slate-100 dark:hover:bg-slate-800",
        destructive:
          "bg-red-600 text-white hover:bg-red-500 focus-visible:ring-red-600 dark:bg-red-500 dark:hover:bg-red-400",
      },
      size: {
        sm: "h-8 px-3",
        md: "h-10 px-4",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  readonly asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";

export { Button, buttonVariants };

