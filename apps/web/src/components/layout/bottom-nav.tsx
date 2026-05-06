"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", icon: "home", label: "Home" },
  { href: "/recipes", icon: "receipt_long", label: "Recipes" },
  { href: "/import", icon: "add_link", label: "Import" },
  { href: "/meal-plan", icon: "calendar_month", label: "Meal Plan" },
  { href: "/shopping", icon: "shopping_cart", label: "Shopping" },
  { href: "/inventory", icon: "inventory_2", label: "Inventory" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-surface-bright border-t border-outline-variant/30 grid grid-cols-6 items-center px-1 py-2 z-50">
      {navItems.map(({ href, icon, label }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={`flex min-w-0 flex-col items-center gap-0.5 px-1 transition-colors ${
              active ? "text-primary-fixed-dim" : "text-outline"
            }`}
          >
            <span className={`material-symbols-outlined text-[22px] ${active ? "icon-filled" : ""}`}>
              {icon}
            </span>
            <span className="w-full truncate text-center text-[10px] font-medium leading-tight">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
