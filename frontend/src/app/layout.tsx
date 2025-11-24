import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import ClientLayout from "./client-layout";

export const metadata: Metadata = { 
  title: "Dese EA Plan v6.8.1",
  description: "CPT Optimization Domain için Kubernetes + GitOps + AIOps uyumlu kurumsal planlama sistemi"
};

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr" className={`h-full ${inter.variable}`} suppressHydrationWarning>
      <body
        className="h-full bg-white font-sans text-gray-900 antialiased"
        suppressHydrationWarning
      >
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
