export type UserRole = "admin" | "user";

export const HOUSEHOLD_SIZE_VALUES = [
  "just_me",
  "two_people",
  "three_to_four_people",
  "five_plus_people",
] as const;

export type HouseholdSize = (typeof HOUSEHOLD_SIZE_VALUES)[number];

export const KIDS_PROFILE_VALUES = [
  "no_kids",
  "toddlers",
  "kids_5_to_12",
  "teenagers",
] as const;

export type KidsProfile = (typeof KIDS_PROFILE_VALUES)[number];

export const FAVORITE_PROTEIN_VALUES = [
  "chicken",
  "beef",
  "pork",
  "salmon",
  "shrimp",
  "tuna",
  "lamb",
  "turkey",
  "tofu",
  "tempeh",
  "eggs",
  "legumes",
] as const;

export type FavoriteProtein = (typeof FAVORITE_PROTEIN_VALUES)[number];

export const FAVORITE_FLAVOR_VALUES = [
  "spicy",
  "savory_umami",
  "sweet",
  "tangy_citrusy",
  "smoky",
  "herby_fresh",
  "rich_creamy",
  "nutty",
  "garlicky",
] as const;

export type FavoriteFlavor = (typeof FAVORITE_FLAVOR_VALUES)[number];

export const SPICE_LEVEL_VALUES = [
  "none",
  "mild",
  "medium",
  "hot",
  "very_hot",
] as const;

export type SpiceLevel = (typeof SPICE_LEVEL_VALUES)[number];

export const DISLIKED_INGREDIENT_VALUES = [
  "mushrooms",
  "olives",
  "cilantro",
  "anchovies",
  "blue_cheese",
  "liver_offal",
  "eggplant",
  "beets",
  "brussels_sprouts",
  "capers",
  "fennel",
  "tofu",
  "tempeh",
  "kimchi",
  "fish_sauce",
  "lamb",
  "goat",
  "pork",
  "coconut",
  "raw_onion",
  "sour_cream",
  "mayonnaise",
  "avocado",
  "chickpeas",
  "lentils",
] as const;

export type DislikedIngredient = (typeof DISLIKED_INGREDIENT_VALUES)[number];

export const DISLIKED_TEXTURE_VALUES = [
  "chewy",
  "mushy",
  "slimy",
  "gritty",
  "sticky",
] as const;

export type DislikedTexture = (typeof DISLIKED_TEXTURE_VALUES)[number];

export const COOKING_SKILL_LEVEL_VALUES = [
  "beginner",
  "intermediate",
  "confident",
  "advanced",
] as const;

export type CookingSkillLevel = (typeof COOKING_SKILL_LEVEL_VALUES)[number];

export const AVAILABLE_APPLIANCE_VALUES = [
  "stovetop",
  "oven",
  "air_fryer",
  "pressure_cooker",
  "slow_cooker",
  "blender",
  "food_processor",
  "grill",
  "wok",
  "rice_cooker",
  "toaster_oven",
  "microwave",
] as const;

export type AvailableAppliance = (typeof AVAILABLE_APPLIANCE_VALUES)[number];

export const PREFERRED_COOKING_TIME_VALUES = [
  "under_15_min",
  "15_to_30_min",
  "30_to_45_min",
  "up_to_1_hour",
  "over_1_hour",
] as const;

export type PreferredCookingTime =
  (typeof PREFERRED_COOKING_TIME_VALUES)[number];

export const TYPICAL_MEAL_TIME_VALUES = [
  "breakfast",
  "lunch",
  "dinner",
  "snacks",
  "late_night",
  "meal_prep",
] as const;

export type TypicalMealTime = (typeof TYPICAL_MEAL_TIME_VALUES)[number];

export const GOAL_PRIORITY_VALUES = [
  "save_money",
  "eat_healthier",
  "lose_weight",
  "build_muscle",
  "reduce_food_waste",
  "try_new_cuisines",
  "cook_faster",
  "eat_more_plant_based",
] as const;

export type GoalPriority = (typeof GOAL_PRIORITY_VALUES)[number];

export const CALORIE_TRACKING_MODE_VALUES = [
  "none",
  "casual",
  "calories",
  "full_macros",
] as const;

export type CalorieTrackingMode = (typeof CALORIE_TRACKING_MODE_VALUES)[number];

export const WEEKLY_BUDGET_VALUES = [
  "under_50",
  "50_to_100",
  "100_to_150",
  "150_to_200",
  "no_budget_limit",
] as const;

export type WeeklyBudget = (typeof WEEKLY_BUDGET_VALUES)[number];

export const PREFERRED_STORE_VALUES = [
  "walmart",
  "kroger",
  "aldi",
  "whole_foods",
  "trader_joes",
  "target",
  "costco",
  "sams_club",
  "local_ethnic_grocery",
  "amazon_fresh",
  "instacart",
] as const;

export type PreferredStore = (typeof PREFERRED_STORE_VALUES)[number];

export const SHOPPING_MODE_VALUES = [
  "in_store",
  "pickup",
  "delivery",
  "mixed",
] as const;

export type ShoppingMode = (typeof SHOPPING_MODE_VALUES)[number];

export const RECIPE_DISCOVERY_SOURCE_VALUES = [
  "social_media",
  "youtube",
  "pinterest",
  "food_blogs",
  "friends_family",
  "cookbooks",
  "restaurant_recreation",
] as const;

export type RecipeDiscoverySource =
  (typeof RECIPE_DISCOVERY_SOURCE_VALUES)[number];

export const BIGGEST_COOKING_FRUSTRATION_VALUES = [
  "save_recipes_but_do_not_cook",
  "dont_know_what_to_make",
  "grocery_runs_are_stressful",
  "spend_too_much_on_food",
  "make_mid_cook_mistakes",
  "same_meals_on_repeat",
] as const;

export type BiggestCookingFrustration =
  (typeof BIGGEST_COOKING_FRUSTRATION_VALUES)[number];

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
  household_size?: HouseholdSize;
  kids_profile?: KidsProfile;
  favorite_proteins?: FavoriteProtein[];
  favorite_flavors?: FavoriteFlavor[];
  spice_level?: SpiceLevel;
  disliked_ingredients?: DislikedIngredient[];
  disliked_textures?: DislikedTexture[];
  cooking_skill_level?: CookingSkillLevel;
  available_appliances?: AvailableAppliance[];
  preferred_cooking_time?: PreferredCookingTime;
  typical_meal_times?: TypicalMealTime[];
  goal_priorities?: GoalPriority[];
  calorie_tracking_mode?: CalorieTrackingMode;
  weekly_budget?: WeeklyBudget;
  preferred_stores?: PreferredStore[];
  shopping_mode?: ShoppingMode;
  recipe_discovery_sources?: RecipeDiscoverySource[];
  biggest_cooking_frustration?: BiggestCookingFrustration;
};

export type UserStats = {
  owned_recipe_count: number;
  cart_draft_count: number;
  cart_count: number;
  shopping_cart_count: number;
  preferred_cuisine_count: number;
  preferred_tag_count: number;
};
