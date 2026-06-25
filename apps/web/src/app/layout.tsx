import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#fe8e17",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Preppie - Meal Planning",
  description:
    "Plan, shop, and cook with confidence through a personalized AI sous chef.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Preppie",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      {
        url: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={plusJakartaSans.variable}
      suppressHydrationWarning
    >
      <body>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
