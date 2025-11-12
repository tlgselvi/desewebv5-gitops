"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Tema modunu değiştir"
        className="relative"
        disabled
      >
        <Sun className="h-5 w-5 text-amber-500" />
        <span className="sr-only">Tema modunu değiştir</span>
      </Button>
    );
  }

  const currentTheme = (theme === "system" ? resolvedTheme : theme) ?? "light";
  const isDark = currentTheme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Tema modunu değiştir"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative"
    >
      <Sun
        className={cn(
          "h-5 w-5 text-amber-500 transition-transform duration-300",
          isDark && "scale-0",
          !mounted && "opacity-0",
        )}
      />
      <Moon
        className={cn(
          "absolute h-5 w-5 text-blue-400 transition-transform duration-300",
          isDark ? "scale-100" : "scale-0",
          !mounted && "opacity-0",
        )}
      />
      <span className="sr-only">Tema modunu değiştir</span>
    </Button>
  );
}

