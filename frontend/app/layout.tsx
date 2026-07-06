import type { Metadata } from "next";
import { Outfit, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import AppNav from "@/components/AppNav";

// Typefaces from the Figma design: Outfit for headings, Inter for body,
// JetBrains Mono for references/codes.
const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
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
      className={`${outfit.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <AppNav />
        <div className="min-h-[calc(100vh-4rem)] bg-background">{children}</div>
      </body>
    </html>
  );
}
