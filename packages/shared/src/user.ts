export type UserRole = "admin" | "user";

export type User = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  auth_providers?: Array<"google" | "password">;
  onboarding_completed_at?: string;
  created_at: string;
  updated_at: string;
};

export type UserPreferences = {
  preferred_cuisine_ids: string[];
  preferred_cuisines: Array<{
    id: string;
    slug: string;
    label: string;
    kind: "national" | "regional" | "cultural" | "style" | "other";
    created_at: string;
    updated_at: string;
  }>;
  preferred_tag_ids: string[];
  preferred_tags: Array<{
    id: string;
    owner_user_id?: string;
    name: string;
    slug: string;
    scope: "system" | "user";
    created_at: string;
    updated_at: string;
  }>;
};

export type UserStats = {
  owned_recipe_count: number;
  cart_draft_count: number;
  cart_count: number;
  shopping_cart_count: number;
  preferred_cuisine_count: number;
  preferred_tag_count: number;
};
