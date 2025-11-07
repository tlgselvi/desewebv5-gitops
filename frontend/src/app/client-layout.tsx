"use client";

import type { ReactNode } from "react";
import Providers from "./providers";

interface ClientLayoutProps {
  readonly children: ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  return <Providers>{children}</Providers>;
}

