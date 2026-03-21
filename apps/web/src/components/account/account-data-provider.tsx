"use client";

import type {
  Cuisine,
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
        cuisines: props.cuisines,
        systemTags: props.systemTags,
      }}
    >
      {props.children}
    </AccountDataContext.Provider>
  );
}
