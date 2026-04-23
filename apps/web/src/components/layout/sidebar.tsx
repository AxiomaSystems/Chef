"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", icon: "home", label: "Home" },
  { href: "/recipes", icon: "receipt_long", label: "Recipes" },
  { href: "/meal-plan", icon: "calendar_month", label: "Meal Plan" },
  { href: "/shopping", icon: "shopping_cart", label: "Shopping" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-screen w-64 bg-white border-r border-outline-variant/40 z-50">
      {/* Brand */}
      <div className="px-6 pt-7 pb-5">
        <Link href="/" className="text-xl font-black text-primary-fixed-dim">
          Chef
        </Link>
        <p className="text-outline text-xs mt-0.5">Meal Execution Platform</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        {navItems.map(({ href, icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-md text-label-lg transition-all duration-150 ${
                active
                  ? "bg-primary-surface text-primary font-semibold border-r-4 border-primary-fixed-dim"
                  : "text-on-surface-variant hover:bg-primary-surface/50"
              }`}
            >
              <span className={`material-symbols-outlined text-[22px] ${active ? "icon-filled" : ""}`}>
                {icon}
              </span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* New Recipe CTA */}
      <div className="px-4 pb-4">
        <Link
          href="/recipes"
          className="flex items-center justify-center gap-2 w-full py-3 bg-primary-fixed-dim text-on-primary-fixed font-bold text-label-lg rounded-full hover:bg-primary-fixed transition-colors shadow-sm"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Recipe
        </Link>
      </div>

      {/* User profile */}
      <div className="px-3 pb-5 border-t border-outline-variant/30 pt-3">
        <Link
          href="/account/settings/overview"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-primary-surface/50 transition-colors"
        >
          <div className="w-9 h-9 rounded-full bg-primary-fixed-dim flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-white text-[20px]">person</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-label-lg text-on-surface font-semibold truncate">Account</span>
            <span className="text-[10px] text-outline truncate">Settings & preferences</span>
          </div>
        </Link>
      </div>
    </aside>
  );
}
