"use client";

import { usePathname } from "next/navigation";
import { AppNavLink } from "@/components/layout/app-nav-link";

const NAV = [
  { href: "/carts", label: "Cart", icon: "shopping_cart" },
  { href: "/shopping", label: "Shopping cart", icon: "shopping_bag" },
];

export function CartSubNav() {
  const pathname = usePathname();

  return (
    <div className="-mx-4 bg-[#fff2e3] px-4 py-3 sm:mx-0 sm:rounded-[1.4rem]">
      <div className="no-scrollbar flex w-fit max-w-full gap-1 overflow-x-auto rounded-full bg-white p-1.5 shadow-[0_4px_14px_rgba(19,35,38,0.12)]">
        {NAV.map(({ href, label, icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <AppNavLink
              key={href}
              href={href}
              className={`flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-label-sm font-black transition-all ${
                active
                  ? "bg-[#f4790d] text-white shadow-sm"
                  : "text-[#2f6f73] hover:bg-[#fff8ef] hover:text-[#132326]"
              }`}
            >
              <span
                className={`material-symbols-outlined text-[17px] ${
                  active ? "icon-filled" : ""
                }`}
              >
                {icon}
              </span>
              {label}
            </AppNavLink>
          );
        })}
      </div>
    </div>
  );
}
