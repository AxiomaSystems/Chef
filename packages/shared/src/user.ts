export type UserRole = "admin" | "user";

export type SavedAddress = {
  id: string;
  label: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  isDefault: boolean;
};

export type PaymentCard = {
  id: string;
  cardType: "Visa" | "Mastercard" | "Amex" | "Discover";
  lastFour: string;
  expiry: string;
  name: string;
  isDefault: boolean;
};

export type CheckoutProfile = {
  saved_addresses: SavedAddress[];
  payment_cards: PaymentCard[];
};

export type DietaryPreferences = {
  preferred_tag_ids: string[];
};

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
    kind: "general" | "dietary_badge";
    created_at: string;
    updated_at: string;
  }>;
  shopping_location?: {
    zip_code?: string;
    label?: string;
    latitude?: number;
    longitude?: number;
    kroger_location_id?: string;
  };
  household_size?: string;
  kids_profile?: string;
  dietary_preferences?: DietaryPreferences;
  favorite_proteins?: string[];
  favorite_flavors?: string[];
  spice_level?: string;
  disliked_ingredients?: string[];
  disliked_textures?: string[];
  cooking_skill_level?: string;
  available_appliances?: string[];
  preferred_cooking_time?: string;
  typical_meal_times?: string[];
  goal_priorities?: string[];
  calorie_tracking_mode?: string;
  weekly_budget?: string;
  preferred_stores?: string[];
  shopping_mode?: string;
  recipe_discovery_sources?: string[];
  biggest_cooking_frustration?: string;
};

export type UserStats = {
  owned_recipe_count: number;
  cart_draft_count: number;
  cart_count: number;
  shopping_cart_count: number;
  preferred_cuisine_count: number;
  preferred_tag_count: number;
};
