import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SessionProvider } from "@/components/providers/SessionProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// SF Pro font (system font)
const sfPro = {
  variable: "--font-sf-pro",
};

export const metadata: Metadata = {
  title: "Assit Me - AI-Powered Prompt Optimization",
  description: "Optimize your AI prompts with automated testing, benchmarking, and GitHub integration",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${sfPro.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
