"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", icon: "home", label: "Home" },
  { href: "/recipes", icon: "receipt_long", label: "Recipes" },
  { href: "/shopping", icon: "shopping_cart", label: "Shopping" },
  { href: "/account/settings/overview", icon: "account_circle", label: "Account" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-surface-bright border-t border-outline-variant/30 flex justify-around items-center py-3 px-4 z-50">
      {navItems.map(({ href, icon, label }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-1 transition-colors ${
              active ? "text-primary-fixed-dim" : "text-outline"
            }`}
          >
            <span className={`material-symbols-outlined ${active ? "icon-filled" : ""}`}>
              {icon}
            </span>
            <span className="text-label-sm">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
