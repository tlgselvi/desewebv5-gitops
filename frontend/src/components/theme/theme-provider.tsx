"use client";

import { type ComponentProps } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

type ThemeProviderProps = ComponentProps<typeof NextThemesProvider>;

export function ThemeProvider(props: ThemeProviderProps) {
  const { children, ...rest } = props;
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={true}
      disableTransitionOnChange
      {...rest}
    >
      {children}
    </NextThemesProvider>
  );
}
