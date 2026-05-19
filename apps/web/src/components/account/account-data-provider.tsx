"use client";

import type {
  Cuisine,
  AiLimitsStatus,
  Tag,
  User,
  UserPreferences,
  UserStats,
} from "@cart/shared";
import { AccountDataContext } from "./context";

export function AccountDataProvider(props: {
  user: User;
  stats: UserStats;
  preferences: UserPreferences;
  aiLimits: AiLimitsStatus | null;
  cuisines: Cuisine[];
  systemTags: Tag[];
  children: React.ReactNode;
}) {
  return (
    <AccountDataContext.Provider
      value={{
        user: props.user,
        stats: props.stats,
        preferences: props.preferences,
        aiLimits: props.aiLimits,
        cuisines: props.cuisines,
        systemTags: props.systemTags,
      }}
    >
      {props.children}
    </AccountDataContext.Provider>
  );
}
