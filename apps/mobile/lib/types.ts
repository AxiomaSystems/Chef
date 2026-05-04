export type User = {
  id: string;
  name: string;
  email?: string;
  onboarding_completed_at?: string | null;
};

export type Cuisine = {
  id: string;
  label: string;
  slug: string;
  kind?: string;
};

export type Tag = {
  id: string;
  name: string;
  slug?: string;
  kind?: string;
};

export type BaseRecipe = {
  id: string;
  user_id?: string;
  name: string;
  description?: string | null;
  cover_image_url?: string | null;
  servings: number;
  cuisine?: Cuisine;
  nutrition_data?: {
    calories?: number;
    protein_g?: number;
    carbs_g?: number;
    fat_g?: number;
  } | null;
  ingredients?: Array<{
    canonical_ingredient: string;
    display_ingredient?: string | null;
    amount: number;
    unit: string;
  }>;
  tags?: Tag[];
  is_saved?: boolean;
  is_owner?: boolean;
};

export type Cart = {
  id: string;
  name?: string | null;
  retailer?: string;
  selections?: Array<{
    recipe_id: string;
    recipe_type: "base" | "variant";
    quantity: number;
    servings_override?: number;
  }>;
  dishes?: Array<{
    id?: string;
    name: string;
    servings?: number;
  }>;
  overview?: Array<{
    canonical_ingredient: string;
    total_amount: number;
    unit: string;
  }>;
  created_at?: string;
};

export type ShoppingCart = {
  id: string;
  cart_id?: string;
  retailer: string;
  estimated_subtotal: number;
  estimated_total?: number;
  overview?: Array<{
    canonical_ingredient: string;
    total_amount: number;
    unit: string;
  }>;
  matched_items: unknown[];
  external_url?: string;
  created_at?: string;
};

export type UserPreferences = Record<string, unknown> | null;

export type MealPlanMealType = "breakfast" | "lunch" | "dinner";

export type MealPlanDay = Partial<Record<MealPlanMealType, string>>;

export type MealPlan = {
  id?: string;
  user_id?: string;
  week_start: string;
  days: MealPlanDay[];
  created_at?: string;
  updated_at?: string;
};

export type KitchenInventoryItem = {
  id: string;
  ingredient_id?: string;
  ingredient?: {
    id: string;
    canonical_name: string;
    category?: string;
    default_unit?: string;
  };
  label?: string;
  estimated_amount?: number;
  unit?: string;
  source?: string;
  confidence?: string;
  created_at?: string;
};
