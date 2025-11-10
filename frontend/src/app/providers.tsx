"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { ReactNode, useState } from "react";
import { ThemeProvider } from "@/components/theme/theme-provider";

interface ProvidersProps {
  readonly children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster position="top-right" richColors theme="system" />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
