"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", icon: "home", label: "Home" },
  { href: "/recipes", icon: "receipt_long", label: "Recipes" },
  { href: "/meal-plan", icon: "calendar_month", label: "Plan" },
  { href: "/inventory", icon: "inventory_2", label: "Inventory" },
  { href: "/shopping", icon: "shopping_cart", label: "Shopping" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 grid grid-cols-5 items-center border-t border-outline-variant/30 bg-surface-bright/95 px-2 py-2 shadow-[0_-10px_30px_rgba(60,154,158,0.08)] backdrop-blur-md lg:hidden">
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
              <span
                className={`material-symbols-outlined text-[22px] ${
                  active ? "icon-filled" : ""
                }`}
              >
                {icon}
              </span>
              <span className="w-full truncate text-center text-[10px] font-medium leading-tight">
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
      <Link
        href="/create"
        aria-label="Create"
        className="fixed bottom-20 right-5 z-[60] grid h-14 w-14 place-items-center rounded-full bg-primary-fixed-dim text-on-primary-fixed shadow-[0_14px_30px_rgba(244,121,13,0.36)] transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:hidden"
      >
        <span className="material-symbols-outlined text-[30px] leading-none">
          add
        </span>
      </Link>
    </>
  );
}
