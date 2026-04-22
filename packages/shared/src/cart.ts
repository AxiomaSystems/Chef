import type { AggregatedIngredient } from "./aggregation";
import type {
  MatchedIngredientProduct,
  Retailer,
} from "./product";
import type { Dish } from "./recipe";

export type CartSelectionAdaptationRequest = {
  halal?: boolean;
  vegan?: boolean;
  calorie_range?: {
    min?: number;
    max?: number;
  };
  cheaper?: boolean;
  custom_notes?: string;
};

export type CartSelection = {
  recipe_id: string;
  recipe_type: "base" | "variant";
  quantity: number;
  servings_override?: number;
  adaptation_request?: CartSelectionAdaptationRequest;
};

export type CreateCartRequest = {
  name?: string;
  retailer: Retailer;
  selections: CartSelection[];
};

export type Cart = {
  id?: string;
  user_id?: string;
  name?: string;
  retailer: Retailer;
  selections: CartSelection[];
  dishes: Dish[];
  overview: AggregatedIngredient[];
  created_at?: string;
  updated_at?: string;
};

export type CreateShoppingCartRequest = {
  retailer: Retailer;
};

export type ShoppingCart = {
  id?: string;
  user_id?: string;
  cart_id: string;
  overview: AggregatedIngredient[];
  matched_items: MatchedIngredientProduct[];
  estimated_subtotal: number;
  estimated_total?: number;
  retailer: Retailer;
  external_url?: string;
  external_reference_id?: string;
  created_at?: string;
  updated_at?: string;
};

export type ShoppingCartHistorySummary = {
  id: string;
  user_id: string;
  cart_id: string;
  retailer: Retailer;
  estimated_subtotal: number;
  external_url?: string;
  external_reference_id?: string;
  overview_count: number;
  matched_item_count: number;
  created_at: string;
  updated_at: string;
};

// Legacy aliases kept temporarily while the API refactor lands.
export type GenerateCartSelectionAdaptationRequest =
  CartSelectionAdaptationRequest;
export type GenerateCartRequestSelection = CartSelection;
export type GenerateCartRequest = CreateCartRequest & {
  retailer: Retailer;
};
export type GenerateCartResponse = {
  cart_draft_id?: string;
  dishes: Dish[];
  overview: AggregatedIngredient[];
  matched_items: MatchedIngredientProduct[];
  estimated_subtotal: number;
  retailer: Retailer;
};
export type GeneratedCart = ShoppingCart;
