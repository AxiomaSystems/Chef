"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ComponentProps, type MouseEvent } from "react";
import {
  clearRouteLastLocation,
  clearRoutePageMemory,
  dispatchPageMemoryReset,
  isPathInRouteGroup,
  readRouteLastLocation,
  writeRouteLastLocation,
} from "@/lib/page-memory";

type AppNavLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  activePaths?: string[];
  href: string;
  memoryHref?: string;
  rememberLocation?: boolean;
};

export function AppNavLink({
  activePaths,
  href,
  memoryHref,
  rememberLocation = true,
  onClick,
  children,
  ...props
}: AppNavLinkProps) {
  const pathname = usePathname();
  const router = useRouter();
  const routeBases = activePaths ?? [href];
  const routeBasesKey = routeBases.join("|");
  const routeMemoryHref = memoryHref ?? href;
  const active = isPathInRouteGroup(pathname, routeBases);

  useEffect(() => {
    if (!rememberLocation || !active) return;

    const currentLocation = `${window.location.pathname}${window.location.search}`;
    writeRouteLastLocation(routeMemoryHref, currentLocation);
  }, [active, href, rememberLocation, routeBasesKey, routeMemoryHref]);

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented) return;

    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    if (!active) {
      if (!rememberLocation) return;

      const rememberedHref = readRouteLastLocation(
        routeMemoryHref,
        href,
        routeBases,
      );

      if (rememberedHref === href) return;

      event.preventDefault();
      router.push(rememberedHref);
      return;
    }

    event.preventDefault();
    clearRoutePageMemory(routeMemoryHref);
    clearRouteLastLocation(routeMemoryHref);
    dispatchPageMemoryReset(routeMemoryHref);
    window.scrollTo({ top: 0, behavior: "smooth" });

    if (pathname === href) {
      router.refresh();
      return;
    }

    router.push(href);
  }

  return (
    <Link href={href} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
}
