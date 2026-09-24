import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PlayBeat CRM — Communication Center",
  description: "One workspace. Every customer conversation. WhatsApp, phone dialer, lead management, and CRM in one platform.",
  keywords: ["PlayBeat", "CRM", "WhatsApp Business", "Phone Dialer", "Lead Management", "Communication Center"],
  authors: [{ name: "PlayBeat" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "PlayBeat CRM — Communication Center",
    description: "One workspace. Every customer conversation.",
    siteName: "PlayBeat CRM",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PlayBeat CRM — Communication Center",
    description: "One workspace. Every customer conversation.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
        <SonnerToaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
