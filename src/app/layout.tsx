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
  title: "LeadPulse — Lead Broadcasting & Communication Console",
  description: "Unified console for lead management, WhatsApp + email broadcasting, and Meta Conversions API tracking.",
  keywords: ["LeadPulse", "CRM", "WhatsApp Business", "Email Marketing", "Meta CAPI", "Lead Broadcasting"],
  authors: [{ name: "LeadPulse" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "LeadPulse — Lead Broadcasting Console",
    description: "Unified console for lead management, WhatsApp + email broadcasting, and Meta Conversions API tracking.",
    siteName: "LeadPulse",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LeadPulse — Lead Broadcasting Console",
    description: "Unified console for lead management, WhatsApp + email broadcasting, and Meta Conversions API tracking.",
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
