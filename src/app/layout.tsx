import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode, JSX } from "react";
import { cn } from "@/lib/utils";
import { Inter as FontSans } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "CRAWL",
  description: "ARNNVV",
};

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>): JSX.Element {
  return (
    <html lang="en">
      <body
              className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable,
        )}
      >
        {children}
	<Toaster richColors={true} />
      </body>
    </html>
  );
}
