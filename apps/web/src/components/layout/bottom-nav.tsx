"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", icon: "home", label: "Home" },
  { href: "/meal-plan", icon: "calendar_month", label: "Plan" },
  { href: "/recipes?import=1", icon: "add", label: "Create" },
  { href: "/shopping", icon: "shopping_cart", label: "Shopping" },
  { href: "/inventory", icon: "inventory_2", label: "Inventory" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-surface-bright/95 border-t border-outline-variant/30 grid grid-cols-5 items-center px-2 py-2 z-50 shadow-[0_-10px_30px_rgba(60,154,158,0.08)] backdrop-blur-md">
      {navItems.map(({ href, icon, label }) => {
        const hrefPath = href.split("?")[0];
        const active =
          pathname === hrefPath || pathname.startsWith(hrefPath + "/");
        return (
          <Link
            key={href}
            href={href}
            className={`flex min-w-0 flex-col items-center gap-0.5 px-1 transition-colors ${
              active ? "text-primary-fixed-dim" : "text-outline"
            }`}
          >
            {label === "Create" ? (
              <span className="grid h-12 w-12 -translate-y-3 place-items-center rounded-full bg-primary-fixed-dim text-on-primary-fixed shadow-[0_10px_24px_rgba(244,121,13,0.34)]">
                <span className="material-symbols-outlined text-[28px] leading-none">
                  {icon}
                </span>
              </span>
            ) : (
              <span
                className={`material-symbols-outlined text-[22px] ${
                  active ? "icon-filled" : ""
                }`}
              >
                {icon}
              </span>
            )}
            <span
              className={`w-full truncate text-center text-[10px] font-medium leading-tight ${
                label === "Create" ? "sr-only" : ""
              }`}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
