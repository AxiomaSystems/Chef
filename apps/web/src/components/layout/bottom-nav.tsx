"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type MouseEvent } from "react";
import { AppNavLink } from "./app-nav-link";

const navItems = [
  { href: "/dashboard", icon: "home", label: "Home" },
  { href: "/recipes", icon: "receipt_long", label: "Recipes" },
  { href: "/meal-plan", icon: "calendar_month", label: "Plan" },
  { href: "/inventory", icon: "inventory_2", label: "Inventory" },
  {
    href: "/carts",
    icon: "shopping_cart",
    label: "Cart",
    activePaths: ["/carts", "/shopping"],
  },
];

export function BottomNav({
  hideCreateButton = false,
}: {
  hideCreateButton?: boolean;
}) {
  const pathname = usePathname();
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);

  function handleImportRecipeClick(event: MouseEvent<HTMLAnchorElement>) {
    setIsCreateMenuOpen(false);

    if (pathname === "/recipes") {
      event.preventDefault();
      window.dispatchEvent(new Event("chef:open-recipe-import"));
    }
  }

  return (
    <>
      {isCreateMenuOpen && !hideCreateButton ? (
        <button
          type="button"
          aria-label="Close create menu"
          className="fixed inset-0 z-[55] cursor-default bg-transparent lg:hidden"
          onClick={() => setIsCreateMenuOpen(false)}
        />
      ) : null}

      <nav className="fixed bottom-0 left-0 right-0 z-50 grid grid-cols-5 items-center border-t border-outline-variant/30 bg-surface-bright/95 px-2 py-2 shadow-[0_-10px_30px_rgba(60,154,158,0.08)] backdrop-blur-md lg:hidden">
        {navItems.map(({ href, icon, label, activePaths }) => {
          const paths = activePaths ?? [href];
          const active = paths.some(
            (path) => pathname === path || pathname.startsWith(path + "/"),
          );
          return (
            <AppNavLink
              key={href}
              href={href}
              activePaths={paths}
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
            </AppNavLink>
          );
        })}
      </nav>
      {!hideCreateButton ? (
        <div className="fixed bottom-20 right-5 z-[60] flex flex-col items-end gap-3 lg:hidden">
          {isCreateMenuOpen ? (
            <div className="w-[min(18rem,calc(100vw-2.5rem))] overflow-hidden rounded-2xl border border-outline-variant/30 bg-white py-2 shadow-[0_18px_50px_rgba(31,24,15,0.18)]">
              <Link
                href="/recipes?import=1"
                onClick={handleImportRecipeClick}
                className="flex min-h-12 items-center gap-3 px-4 py-2 text-left text-body-md font-medium text-on-surface transition-colors hover:bg-surface-container-low"
              >
                <span className="material-symbols-outlined text-[22px] text-outline">
                  link
                </span>
                <span>Add recipe from URL</span>
              </Link>
              <Link
                href="/recipes/new"
                onClick={() => setIsCreateMenuOpen(false)}
                className="flex min-h-12 items-center gap-3 px-4 py-2 text-left text-body-md font-medium text-on-surface transition-colors hover:bg-surface-container-low"
              >
                <span className="material-symbols-outlined text-[22px] text-outline">
                  add_circle
                </span>
                <span>Create new recipe</span>
              </Link>
              <button
                type="button"
                onClick={() => setIsCreateMenuOpen(false)}
                className="flex min-h-12 w-full items-center gap-3 px-4 py-2 text-left text-body-md font-medium text-on-surface-variant transition-colors hover:bg-surface-container-low"
              >
                <span className="material-symbols-outlined text-[22px] text-outline">
                  close
                </span>
                <span>Cancel</span>
              </button>
            </div>
          ) : null}

          <button
            type="button"
            aria-label={
              isCreateMenuOpen ? "Close create menu" : "Open create menu"
            }
            aria-expanded={isCreateMenuOpen}
            className="grid h-14 w-14 place-items-center rounded-full bg-primary-fixed-dim text-on-primary-fixed shadow-[0_14px_30px_rgba(244,121,13,0.36)] transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            onClick={() => setIsCreateMenuOpen((open) => !open)}
          >
            <span
              className={`material-symbols-outlined text-[30px] leading-none transition-transform ${
                isCreateMenuOpen ? "rotate-45" : ""
              }`}
            >
              add
            </span>
          </button>
        </div>
      ) : null}
    </>
  );
}
