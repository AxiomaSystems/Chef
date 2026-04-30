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
  two_people: "Me + 1 person",
  three_to_four_people: "3-4 people",
  five_plus_people: "5+ people",
};

export const KIDS_PROFILE_LABELS: Record<KidsProfile, string> = {
  no_kids: "No kids",
  toddlers: "Toddlers under 5",
  kids_5_to_12: "Kids 5-12",
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
  legumes: "Lentils / Beans",
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
  none: "No heat",
  mild: "A little kick",
  medium: "Medium heat",
  hot: "Hot",
  very_hot: "Very hot",
};

export const DISLIKED_INGREDIENT_LABELS: Record<DislikedIngredient, string> = {
  mushrooms: "Mushrooms",
  olives: "Olives",
  cilantro: "Cilantro",
  anchovies: "Anchovies",
  blue_cheese: "Blue cheese",
  liver_offal: "Liver / Offal",
  eggplant: "Eggplant",
  beets: "Beets",
  brussels_sprouts: "Brussels sprouts",
  capers: "Capers",
  fennel: "Fennel",
  tofu: "Tofu",
  tempeh: "Tempeh",
  kimchi: "Kimchi",
  fish_sauce: "Fish sauce",
  lamb: "Lamb",
  goat: "Goat",
  pork: "Pork",
  coconut: "Coconut",
  raw_onion: "Raw onion",
  sour_cream: "Sour cream",
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
  air_fryer: "Air fryer",
  pressure_cooker: "Instant Pot / Pressure cooker",
  slow_cooker: "Slow cooker",
  blender: "Blender",
  food_processor: "Food processor",
  grill: "Grill / BBQ",
  wok: "Wok",
  rice_cooker: "Rice cooker",
  toaster_oven: "Toaster oven",
  microwave: "Microwave",
};

export const PREFERRED_COOKING_TIME_LABELS: Record<
  PreferredCookingTime,
  string
> = {
  under_15_min: "Under 15 min",
  "15_to_30_min": "15-30 min",
  "30_to_45_min": "30-45 min",
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
  build_muscle: "Build muscle / eat more protein",
  reduce_food_waste: "Reduce food waste",
  try_new_cuisines: "Try new cuisines",
  cook_faster: "Cook faster on weeknights",
  eat_more_plant_based: "Eat more plant-based",
};

export const CALORIE_TRACKING_MODE_LABELS: Record<
  CalorieTrackingMode,
  string
> = {
  none: "No, not for me",
  casual: "Casually",
  calories: "Track calories",
  full_macros: "Track full macros",
};

export const WEEKLY_BUDGET_LABELS: Record<WeeklyBudget, string> = {
  under_50: "Under $50",
  "50_to_100": "$50-$100",
  "100_to_150": "$100-$150",
  "150_to_200": "$150-$200",
  no_budget_limit: "No real budget limit",
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
  mixed: "It depends",
};

export const RECIPE_DISCOVERY_SOURCE_LABELS: Record<
  RecipeDiscoverySource,
  string
> = {
  social_media: "Social media",
  youtube: "YouTube",
  pinterest: "Pinterest",
  food_blogs: "Food blogs",
  friends_family: "Friends or family",
  cookbooks: "Cookbooks",
  restaurant_recreation: "Restaurant dishes",
};

export const BIGGEST_COOKING_FRUSTRATION_LABELS: Record<
  BiggestCookingFrustration,
  string
> = {
  save_recipes_but_do_not_cook: "I save recipes but never cook them",
  dont_know_what_to_make: "I never know what to make",
  grocery_runs_are_stressful: "Grocery runs are stressful",
  spend_too_much_on_food: "I spend too much on food",
  make_mid_cook_mistakes: "I get stuck mid-cook",
  same_meals_on_repeat: "I keep repeating the same meals",
};
