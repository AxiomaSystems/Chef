import type { UserStats } from "@cart/shared";

// Stats are now rendered inline in account-shell.tsx
export function StatsStrip(props: { stats: UserStats }) {
  void props.stats;
  return null;
}
