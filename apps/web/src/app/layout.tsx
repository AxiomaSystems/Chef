import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cart Generator Control Room",
  description:
    "Internal dashboard for recipes, meal-plan carts, and retailer-facing shopping carts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
