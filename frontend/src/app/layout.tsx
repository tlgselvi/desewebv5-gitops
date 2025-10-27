import Providers from "./providers";
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = { 
  title: "Dese Web v5.6",
  description: "Dese Web Application"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className="bg-gray-50 text-gray-900">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
