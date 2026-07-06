import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppNav from "@/components/AppNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pont AI -- Social Care Referral Matching",
  description:
    "AI-assisted social-care referral matching for dementia patients in Cardiff.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      // A browser extension (e.g. Weava) injects attributes onto <html> before
      // React hydrates, causing a benign hydration mismatch. Suppressing the
      // warning here is the documented fix for extension-injected attributes.
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <AppNav />
        <div className="min-h-[calc(100vh-4rem)] bg-gray-50">{children}</div>
      </body>
    </html>
  );
}
