"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", icon: "home", label: "Home" },
  { href: "/recipes", icon: "receipt_long", label: "Recipes" },
  { href: "/shopping", icon: "shopping_cart", label: "Shopping" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-screen w-64 bg-[#FFFAF7] border-r border-[#d7c2b9]/40 z-50 p-4">
      {/* Brand */}
      <div className="px-4 py-6 mb-2">
        <h1 className="text-2xl font-black text-[#ffb38e]">Chef</h1>
        <p className="text-[#85736c] text-xs mt-0.5">Meal Execution Platform</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1">
        {navItems.map(({ href, icon, label }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-full text-label-lg transition-all duration-200 ${
                active
                  ? "bg-[#FFF5F0] text-[#ffb38e]"
                  : "text-[#52443d] hover:bg-[#FFF5F0]/60"
              }`}
            >
              <span className={`material-symbols-outlined ${active ? "icon-filled" : ""}`}>
                {icon}
              </span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Account */}
      <Link
        href="/account/settings/overview"
        className="mt-auto px-4 py-4 border-t border-[#d7c2b9]/30 flex items-center gap-3 hover:bg-[#FFF5F0]/60 rounded-xl transition-colors"
      >
        <div className="w-9 h-9 rounded-full bg-[#ffb38e] flex items-center justify-center">
          <span className="material-symbols-outlined text-white text-[20px]">person</span>
        </div>
        <div className="flex flex-col">
          <span className="text-label-lg text-[#1a1c1a]">Account</span>
          <span className="text-[10px] text-[#85736c]">Settings & preferences</span>
        </div>
      </Link>
    </aside>
  );
}
