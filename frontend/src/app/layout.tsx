import Providers from "./providers";
import "./globals.css";
import type { Metadata } from "next";
import ClientLayout from "./client-layout";

export const metadata: Metadata = { 
  title: "Dese EA Plan v6.7.0",
  description: "CPT Optimization Domain için Kubernetes + GitOps + AIOps uyumlu kurumsal planlama sistemi"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className="h-full">
      <body className="h-full bg-gray-50 text-gray-900 antialiased" suppressHydrationWarning>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
