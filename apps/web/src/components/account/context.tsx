"use client";

import { createContext } from "react";
import type {
  Cuisine,
  Tag,
  User,
  UserPreferences,
  UserStats,
} from "@cart/shared";

export type AccountData = {
  user: User;
  stats: UserStats;
  preferences: UserPreferences;
  cuisines: Cuisine[];
  systemTags: Tag[];
};

export const AccountDataContext = createContext<AccountData>({
  user: {
    id: "",
    email: "",
    name: "",
    role: "user",
    auth_providers: [],
    created_at: "",
    updated_at: "",
  },
  stats: {
    owned_recipe_count: 0,
    cart_draft_count: 0,
    cart_count: 0,
    shopping_cart_count: 0,
    preferred_cuisine_count: 0,
    preferred_tag_count: 0,
  },
  preferences: {
    preferred_cuisine_ids: [],
    preferred_cuisines: [],
    preferred_tag_ids: [],
    preferred_tags: [],
  },
  cuisines: [],
  systemTags: [],
});
