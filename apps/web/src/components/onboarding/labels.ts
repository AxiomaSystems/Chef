import type {
  AvailableAppliance,
  BiggestCookingFrustration,
  CalorieTrackingMode,
  CookingSkillLevel,
  DislikedIngredient,
  DislikedTexture,
  FavoriteFlavor,
  FavoriteProtein,
  GoalPriority,
  HouseholdSize,
  KidsProfile,
  PreferredCookingTime,
  PreferredStore,
  RecipeDiscoverySource,
  ShoppingMode,
  SpiceLevel,
  TypicalMealTime,
  WeeklyBudget,
} from "@cart/shared";

export const HOUSEHOLD_SIZE_LABELS: Record<HouseholdSize, string> = {
  just_me: "Just me",
  two_people: "Two people",
  three_to_four_people: "3–4 people",
  five_plus_people: "5+ people",
};

export const KIDS_PROFILE_LABELS: Record<KidsProfile, string> = {
  no_kids: "No kids",
  toddlers: "Toddlers",
  kids_5_to_12: "Kids 5–12",
  teenagers: "Teenagers",
};

export const FAVORITE_PROTEIN_LABELS: Record<FavoriteProtein, string> = {
  chicken: "Chicken",
  beef: "Beef",
  pork: "Pork",
  salmon: "Salmon",
  shrimp: "Shrimp",
  tuna: "Tuna",
  lamb: "Lamb",
  turkey: "Turkey",
  tofu: "Tofu",
  tempeh: "Tempeh",
  eggs: "Eggs",
  legumes: "Legumes",
};

export const FAVORITE_FLAVOR_LABELS: Record<FavoriteFlavor, string> = {
  spicy: "Spicy",
  savory_umami: "Savory / Umami",
  sweet: "Sweet",
  tangy_citrusy: "Tangy / Citrusy",
  smoky: "Smoky",
  herby_fresh: "Herby / Fresh",
  rich_creamy: "Rich / Creamy",
  nutty: "Nutty",
  garlicky: "Garlicky",
};

export const SPICE_LEVEL_LABELS: Record<SpiceLevel, string> = {
  none: "None",
  mild: "Mild",
  medium: "Medium",
  hot: "Hot",
  very_hot: "Very Hot",
};

export const DISLIKED_INGREDIENT_LABELS: Record<DislikedIngredient, string> = {
  mushrooms: "Mushrooms",
  olives: "Olives",
  cilantro: "Cilantro",
  anchovies: "Anchovies",
  blue_cheese: "Blue Cheese",
  liver_offal: "Liver & Offal",
  eggplant: "Eggplant",
  beets: "Beets",
  brussels_sprouts: "Brussels Sprouts",
  capers: "Capers",
  fennel: "Fennel",
  tofu: "Tofu",
  tempeh: "Tempeh",
  kimchi: "Kimchi",
  fish_sauce: "Fish Sauce",
  lamb: "Lamb",
  goat: "Goat",
  pork: "Pork",
  coconut: "Coconut",
  raw_onion: "Raw Onion",
  sour_cream: "Sour Cream",
  mayonnaise: "Mayonnaise",
  avocado: "Avocado",
  chickpeas: "Chickpeas",
  lentils: "Lentils",
};

export const DISLIKED_TEXTURE_LABELS: Record<DislikedTexture, string> = {
  chewy: "Chewy",
  mushy: "Mushy",
  slimy: "Slimy",
  gritty: "Gritty",
  sticky: "Sticky",
};

export const COOKING_SKILL_LEVEL_LABELS: Record<CookingSkillLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  confident: "Confident",
  advanced: "Advanced",
};

export const AVAILABLE_APPLIANCE_LABELS: Record<AvailableAppliance, string> = {
  stovetop: "Stovetop",
  oven: "Oven",
  air_fryer: "Air Fryer",
  pressure_cooker: "Pressure Cooker",
  slow_cooker: "Slow Cooker",
  blender: "Blender",
  food_processor: "Food Processor",
  grill: "Grill",
  wok: "Wok",
  rice_cooker: "Rice Cooker",
  toaster_oven: "Toaster Oven",
  microwave: "Microwave",
};

export const PREFERRED_COOKING_TIME_LABELS: Record<
  PreferredCookingTime,
  string
> = {
  under_15_min: "Under 15 min",
  "15_to_30_min": "15 – 30 min",
  "30_to_45_min": "30 – 45 min",
  up_to_1_hour: "Up to 1 hour",
  over_1_hour: "Over 1 hour",
};

export const TYPICAL_MEAL_TIME_LABELS: Record<TypicalMealTime, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snacks: "Snacks",
  late_night: "Late night",
  meal_prep: "Meal prep",
};

export const GOAL_PRIORITY_LABELS: Record<GoalPriority, string> = {
  save_money: "Save money",
  eat_healthier: "Eat healthier",
  lose_weight: "Lose weight",
  build_muscle: "Build muscle",
  reduce_food_waste: "Reduce food waste",
  try_new_cuisines: "Try new cuisines",
  cook_faster: "Cook faster",
  eat_more_plant_based: "Eat more plant-based",
};

export const CALORIE_TRACKING_MODE_LABELS: Record<
  CalorieTrackingMode,
  string
> = {
  none: "Not interested",
  casual: "Casual awareness",
  calories: "Track calories",
  full_macros: "Full macros",
};

export const WEEKLY_BUDGET_LABELS: Record<WeeklyBudget, string> = {
  under_50: "Under $50",
  "50_to_100": "$50 – $100",
  "100_to_150": "$100 – $150",
  "150_to_200": "$150 – $200",
  no_budget_limit: "No limit",
};

export const PREFERRED_STORE_LABELS: Record<PreferredStore, string> = {
  walmart: "Walmart",
  kroger: "Kroger",
  aldi: "Aldi",
  whole_foods: "Whole Foods",
  trader_joes: "Trader Joe's",
  target: "Target",
  costco: "Costco",
  sams_club: "Sam's Club",
  local_ethnic_grocery: "Local / Ethnic grocery",
  amazon_fresh: "Amazon Fresh",
  instacart: "Instacart",
};

export const SHOPPING_MODE_LABELS: Record<ShoppingMode, string> = {
  in_store: "In store",
  pickup: "Pickup",
  delivery: "Delivery",
  mixed: "Mixed",
};

export const RECIPE_DISCOVERY_SOURCE_LABELS: Record<
  RecipeDiscoverySource,
  string
> = {
  social_media: "Social media",
  youtube: "YouTube",
  pinterest: "Pinterest",
  food_blogs: "Food blogs",
  friends_family: "Friends & family",
  cookbooks: "Cookbooks",
  restaurant_recreation: "Restaurant recreation",
};

export const BIGGEST_COOKING_FRUSTRATION_LABELS: Record<
  BiggestCookingFrustration,
  string
> = {
  save_recipes_but_do_not_cook: "I save recipes but never actually cook them",
  dont_know_what_to_make: "I don't know what to make",
  grocery_runs_are_stressful: "Grocery runs are stressful",
  spend_too_much_on_food: "I spend too much on food",
  make_mid_cook_mistakes: "I make mistakes mid-cook",
  same_meals_on_repeat: "I cook the same meals on repeat",
};
