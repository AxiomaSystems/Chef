"use client";

import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

export const PAGE_MEMORY_RESET_EVENT = "chef:page-memory-reset";

type PageMemoryResetDetail = {
  href: string;
};

type PageMemoryOptions<T extends object> = {
  onReset?: () => void;
  restoreScrollKey?: keyof T;
  routeHref?: string;
};

export function routeMemoryKey(href: string) {
  return `chef:page-memory:${href}`;
}

export function routeLastLocationKey(href: string) {
  return `chef:page-memory:last-location:${href}`;
}

export function clearRoutePageMemory(href: string) {
  clearPageMemory(routeMemoryKey(href));
}

export function readRouteLastLocation(
  href: string,
  fallback: string,
  routeBases: string[] = [href],
) {
  if (typeof window === "undefined") return fallback;

  try {
    const saved = window.sessionStorage.getItem(routeLastLocationKey(href));
    if (!saved) return fallback;
    return isPathInRouteGroup(saved, routeBases) ? saved : fallback;
  } catch {
    return fallback;
  }
}

export function writeRouteLastLocation(href: string, location: string) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(routeLastLocationKey(href), location);
  } catch {
    // Session storage may be unavailable in restricted browser modes.
  }
}

export function clearRouteLastLocation(href: string) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(routeLastLocationKey(href));
  } catch {
    // Session storage may be unavailable in restricted browser modes.
  }
}

export function isPathInRouteGroup(path: string, routeBases: string[]) {
  const pathname = path.split(/[?#]/, 1)[0] || "/";
  return routeBases.some(
    (base) => pathname === base || pathname.startsWith(`${base}/`),
  );
}

export function dispatchPageMemoryReset(href: string) {
  window.dispatchEvent(
    new CustomEvent<PageMemoryResetDetail>(PAGE_MEMORY_RESET_EVENT, {
      detail: { href },
    }),
  );
}

export function readPageMemory<T extends object>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<T>;
    return { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}

export function writePageMemory<T extends object>(key: string, value: T) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Session storage may be unavailable in restricted browser modes.
  }
}

export function clearPageMemory(key: string) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // Session storage may be unavailable in restricted browser modes.
  }
}

export function usePageMemory<T extends object>(
  key: string,
  initialState: T,
  options: PageMemoryOptions<T> = {},
): [T, Dispatch<SetStateAction<T>>, () => void] {
  const [state, setState] = useState<T>(initialState);
  const hydratedRef = useRef(false);
  const initialStateRef = useRef(initialState);
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    const restored = readPageMemory(key, initialStateRef.current);
    hydratedRef.current = true;
    setState(restored);

    const scrollKey = optionsRef.current.restoreScrollKey;
    const scrollY = scrollKey ? restored[scrollKey] : null;
    if (typeof scrollY === "number" && scrollY > 0) {
      window.setTimeout(() => {
        window.scrollTo({ top: scrollY });
      }, 0);
    }
  }, [key]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    writePageMemory(key, state);
  }, [key, state]);

  useEffect(() => {
    const scrollKey = options.restoreScrollKey;
    if (!scrollKey) return;

    let timeout: number | null = null;
    function handleScroll() {
      if (timeout !== null) return;
      timeout = window.setTimeout(() => {
        timeout = null;
        const scrollStateKey = String(scrollKey);
        setState(
          (current) =>
            ({
              ...current,
              [scrollStateKey]: window.scrollY,
            }) as T,
        );
      }, 200);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      if (timeout !== null) {
        window.clearTimeout(timeout);
      }
      window.removeEventListener("scroll", handleScroll);
    };
  }, [options.restoreScrollKey]);

  function reset() {
    clearPageMemory(key);
    setState(initialStateRef.current);
    optionsRef.current.onReset?.();
  }

  useEffect(() => {
    function handleReset(event: Event) {
      const detail = (event as CustomEvent<PageMemoryResetDetail>).detail;
      if (detail?.href !== optionsRef.current.routeHref) return;
      reset();
    }

    window.addEventListener(PAGE_MEMORY_RESET_EVENT, handleReset);
    return () => {
      window.removeEventListener(PAGE_MEMORY_RESET_EVENT, handleReset);
    };
  });

  return [state, setState, reset];
}
