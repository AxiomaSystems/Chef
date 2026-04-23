import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ example: 404 })
  statusCode!: number;

  @ApiProperty({ example: 'Recipe recipe-1 not found' })
  message!: string;

  @ApiProperty({ example: 'Not Found' })
  error!: string;
}

export class RecipeStepResponseDto {
  @ApiProperty({ example: 1 })
  step!: number;

  @ApiProperty({ example: 'Cook the rice until tender.' })
  what_to_do!: string;
}

export class DishIngredientResponseDto {
  @ApiProperty({ example: 'rice' })
  canonical_ingredient!: string;

  @ApiProperty({ example: 2 })
  amount!: number;

  @ApiProperty({ example: 'cup' })
  unit!: string;

  @ApiPropertyOptional({ example: '2 cups white rice' })
  display_ingredient?: string;

  @ApiPropertyOptional({ example: 'rinsed' })
  preparation?: string;

  @ApiPropertyOptional({ example: false })
  optional?: boolean;

  @ApiPropertyOptional({ example: 'base' })
  group?: string;
}

export class CuisineResponseDto {
  @ApiProperty({ example: 'cuisine-peruvian' })
  id!: string;

  @ApiProperty({ example: 'peruvian' })
  slug!: string;

  @ApiProperty({ example: 'Peruvian' })
  label!: string;

  @ApiProperty({ example: 'national' })
  kind!: 'national' | 'regional' | 'cultural' | 'style' | 'other';

  @ApiProperty({ example: '2026-03-19T03:12:00.000Z' })
  created_at!: string;

  @ApiProperty({ example: '2026-03-19T03:12:00.000Z' })
  updated_at!: string;
}

export class RecipeNutritionDataResponseDto {
  @ApiPropertyOptional({ example: 640 })
  calories?: number;

  @ApiPropertyOptional({ example: 42 })
  protein_g?: number;

  @ApiPropertyOptional({ example: 36 })
  carbs_g?: number;

  @ApiPropertyOptional({ example: 28 })
  fat_g?: number;

  @ApiPropertyOptional({ example: 4 })
  fiber_g?: number;

  @ApiPropertyOptional({ example: 6 })
  sugar_g?: number;

  @ApiPropertyOptional({ example: 780 })
  sodium_mg?: number;
}

export class BaseRecipeResponseDto {
  @ApiProperty({ example: 'recipe-1' })
  id!: string;

  @ApiPropertyOptional({ example: 'user-1' })
  owner_user_id?: string;

  @ApiPropertyOptional({ example: 'recipe-system-1' })
  forked_from_recipe_id?: string;

  @ApiProperty({ example: false })
  is_system_recipe!: boolean;

  @ApiProperty({ example: 'Arroz con pollo casero' })
  name!: string;

  @ApiProperty({ example: 'cuisine-peruvian' })
  cuisine_id!: string;

  @ApiProperty({ type: () => CuisineResponseDto })
  cuisine!: CuisineResponseDto;

  @ApiPropertyOptional({ example: 'Comforting chicken and rice dish.' })
  description?: string;

  @ApiPropertyOptional({
    example: 'https://images.example.com/recipes/arroz-con-pollo.jpg',
  })
  cover_image_url?: string;

  @ApiPropertyOptional({ type: () => RecipeNutritionDataResponseDto })
  nutrition_data?: RecipeNutritionDataResponseDto;

  @ApiProperty({ example: 4 })
  servings!: number;

  @ApiProperty({ type: () => [DishIngredientResponseDto] })
  ingredients!: DishIngredientResponseDto[];

  @ApiProperty({ type: () => [RecipeStepResponseDto] })
  steps!: RecipeStepResponseDto[];

  @ApiProperty({ example: ['tag-system-dinner', 'tag-user-comfort-food'] })
  tag_ids!: string[];

  @ApiProperty({ type: () => [TagResponseDto] })
  tags!: TagResponseDto[];

  @ApiProperty({ example: '2026-03-19T03:12:00.000Z' })
  created_at!: string;

  @ApiProperty({ example: '2026-03-19T03:12:00.000Z' })
  updated_at!: string;
}

export class TagResponseDto {
  @ApiProperty({ example: 'tag-1' })
  id!: string;

  @ApiPropertyOptional({ example: 'user-1' })
  owner_user_id?: string;

  @ApiProperty({ example: 'Weeknight' })
  name!: string;

  @ApiProperty({ example: 'weeknight' })
  slug!: string;

  @ApiProperty({ example: 'system' })
  scope!: 'system' | 'user';

  @ApiProperty({ example: 'general' })
  kind!: 'general' | 'dietary_badge';

  @ApiProperty({ example: '2026-03-19T03:12:00.000Z' })
  created_at!: string;

  @ApiProperty({ example: '2026-03-19T03:12:00.000Z' })
  updated_at!: string;
}

export class UserPreferencesResponseDto {
  @ApiPropertyOptional({
    example: {
      zip_code: '60611',
      label: 'Chicago, IL',
      latitude: 41.8925,
      longitude: -87.6262,
    },
  })
  shopping_location?: {
    zip_code?: string;
    label?: string;
    latitude?: number;
    longitude?: number;
  };

  @ApiProperty({ example: ['cuisine-peruvian', 'cuisine-mediterranean'] })
  preferred_cuisine_ids!: string[];

  @ApiProperty({ type: () => [CuisineResponseDto] })
  preferred_cuisines!: CuisineResponseDto[];

  @ApiProperty({ example: ['tag-system-weeknight', 'tag-system-comfort-food'] })
  preferred_tag_ids!: string[];

  @ApiProperty({ type: () => [TagResponseDto] })
  preferred_tags!: TagResponseDto[];
}

export class SavedAddressResponseDto {
  @ApiProperty({ example: 'address-1' })
  id!: string;

  @ApiProperty({ example: 'Home' })
  label!: string;

  @ApiProperty({ example: '2 E South Street' })
  street!: string;

  @ApiProperty({ example: 'Galesburg' })
  city!: string;

  @ApiProperty({ example: 'IL' })
  state!: string;

  @ApiProperty({ example: '61401' })
  zip!: string;

  @ApiProperty({ example: true })
  isDefault!: boolean;
}

export class PaymentCardResponseDto {
  @ApiProperty({ example: 'card-1' })
  id!: string;

  @ApiProperty({ example: 'Visa' })
  cardType!: 'Visa' | 'Mastercard' | 'Amex' | 'Discover';

  @ApiProperty({ example: '2222' })
  lastFour!: string;

  @ApiProperty({ example: '07/28' })
  expiry!: string;

  @ApiProperty({ example: 'Tioluwani Enoch Olubunmi' })
  name!: string;

  @ApiProperty({ example: true })
  isDefault!: boolean;
}

export class CheckoutProfileResponseDto {
  @ApiProperty({ type: () => [SavedAddressResponseDto] })
  saved_addresses!: SavedAddressResponseDto[];

  @ApiProperty({ type: () => [PaymentCardResponseDto] })
  payment_cards!: PaymentCardResponseDto[];
}

export class UserStatsResponseDto {
  @ApiProperty({ example: 12 })
  owned_recipe_count!: number;

  @ApiProperty({ example: 3 })
  cart_draft_count!: number;

  @ApiProperty({ example: 9 })
  cart_count!: number;

  @ApiProperty({ example: 6 })
  shopping_cart_count!: number;

  @ApiProperty({ example: 2 })
  preferred_cuisine_count!: number;

  @ApiProperty({ example: 4 })
  preferred_tag_count!: number;
}

export class MeResponseDto {
  @ApiProperty({ example: 'user-1' })
  id!: string;

  @ApiProperty({ example: 'postigodev@cart-generator.local' })
  email!: string;

  @ApiProperty({ example: 'Postigo Dev' })
  name!: string;

  @ApiProperty({ example: 'user' })
  role!: 'admin' | 'user';

  @ApiProperty({ example: ['password'] })
  auth_providers!: Array<'google' | 'password'>;

  @ApiPropertyOptional({ example: '2026-03-20T18:45:00.000Z' })
  onboarding_completed_at?: string;

  @ApiProperty({ example: '2026-03-19T03:12:00.000Z' })
  created_at!: string;

  @ApiProperty({ example: '2026-03-20T18:45:00.000Z' })
  updated_at!: string;
}

export class DishResponseDto {
  @ApiPropertyOptional({ example: 'recipe-1' })
  id?: string;

  @ApiProperty({ example: 'Arroz con pollo casero' })
  name!: string;

  @ApiPropertyOptional({ example: 'Peruvian' })
  cuisine?: string;

  @ApiPropertyOptional({ example: 4 })
  servings?: number;

  @ApiProperty({ type: () => [DishIngredientResponseDto] })
  ingredients!: DishIngredientResponseDto[];

  @ApiProperty({ type: () => [RecipeStepResponseDto] })
  steps!: RecipeStepResponseDto[];

  @ApiPropertyOptional({ example: ['dinner'] })
  tags?: string[];
}

export class AggregatedIngredientSourceResponseDto {
  @ApiProperty({ example: 'Arroz con pollo casero' })
  dish_name!: string;

  @ApiProperty({ example: 2 })
  amount!: number;

  @ApiProperty({ example: 'cup' })
  unit!: string;
}

export class AggregatedIngredientResponseDto {
  @ApiProperty({ example: 'rice' })
  canonical_ingredient!: string;

  @ApiProperty({ example: 4 })
  total_amount!: number;

  @ApiProperty({ example: 'cup' })
  unit!: string;

  @ApiProperty({ type: () => [AggregatedIngredientSourceResponseDto] })
  source_dishes!: AggregatedIngredientSourceResponseDto[];

  @ApiPropertyOptional({ example: 'cup' })
  purchase_unit_hint?: string;

  @ApiPropertyOptional({ example: 'ingredient-rice' })
  ingredient_id?: string;

  @ApiPropertyOptional({ example: true })
  in_kitchen?: boolean;
}

export class ProductCandidateResponseDto {
  @ApiProperty({ example: 'walmart-rice-1' })
  product_id!: string;

  @ApiProperty({ example: 'Long Grain White Rice' })
  title!: string;

  @ApiPropertyOptional({ example: 'Mahatma' })
  brand?: string;

  @ApiProperty({ example: 3.98 })
  price!: number;

  @ApiPropertyOptional({ example: 5 })
  size_value?: number;

  @ApiPropertyOptional({ example: 'cup' })
  size_unit?: string;

  @ApiPropertyOptional({ example: '5 cups bag' })
  quantity_text?: string;

  @ApiPropertyOptional({ example: 0.92 })
  estimated_match_score?: number;

  @ApiPropertyOptional()
  url?: string;

  @ApiPropertyOptional()
  image_url?: string;
}

export class MatchedIngredientProductResponseDto {
  @ApiPropertyOptional({ example: 'ingredient_match' })
  kind?: 'ingredient_match' | 'manual_item';

  @ApiProperty({ example: 'rice' })
  canonical_ingredient!: string;

  @ApiPropertyOptional({ example: 'Paper towels' })
  manual_label?: string;

  @ApiProperty({ example: 4 })
  needed_amount!: number;

  @ApiProperty({ example: 'cup' })
  needed_unit!: string;

  @ApiPropertyOptional({ example: 5 })
  matched_amount?: number;

  @ApiPropertyOptional({ example: 'cup' })
  matched_unit?: string;

  @ApiPropertyOptional({ example: 'cup' })
  purchase_unit_hint?: string;

  @ApiProperty({ example: 'rice' })
  walmart_search_query!: string;

  @ApiPropertyOptional({ type: () => ProductCandidateResponseDto, nullable: true })
  selected_product!: ProductCandidateResponseDto | null;

  @ApiPropertyOptional({ example: 1 })
  selected_quantity?: number;

  @ApiPropertyOptional({ example: 3.98 })
  estimated_line_total?: number;

  @ApiPropertyOptional({ example: false })
  fallback_used?: boolean;

  @ApiPropertyOptional({ example: 'Matched using converted tbsp package size' })
  notes?: string;
}

export class RetailerProductSearchResponseDto {
  @ApiProperty({ example: 'walmart' })
  retailer!: string;

  @ApiProperty({ example: 'cilantro' })
  query!: string;

  @ApiProperty({ type: () => [ProductCandidateResponseDto] })
  candidates!: ProductCandidateResponseDto[];
}

export class RetailerCapabilityResponseDto {
  @ApiProperty({ example: 'instacart' })
  retailer!: string;

  @ApiProperty({ example: 'Instacart' })
  label!: string;

  @ApiProperty({ example: false })
  supports_product_search!: boolean;

  @ApiProperty({ example: false })
  supports_location_lookup!: boolean;

  @ApiProperty({ example: true })
  supports_cart_handoff!: boolean;

  @ApiProperty({ example: false })
  supports_native_checkout!: boolean;

  @ApiProperty({ example: false })
  requires_location!: boolean;

  @ApiProperty({ example: true })
  requires_api_key!: boolean;

  @ApiProperty({
    enum: ['configured', 'disabled', 'partner_required'],
    example: 'configured',
  })
  status!: string;

  @ApiProperty({ example: 1 })
  demo_priority!: number;

  @ApiPropertyOptional({
    example:
      'Preferred demo handoff path. Generates a hosted Instacart shopping-list URL when configured.',
  })
  notes?: string;
}

export class PersistedCartDraftResponseDto {
  @ApiProperty({ example: 'draft-1' })
  id!: string;

  @ApiProperty({ example: 'user-1' })
  user_id!: string;

  @ApiPropertyOptional({ example: 'Weekly dinner plan' })
  name?: string;

  @ApiProperty({
    example: [
      {
        recipe_id: 'recipe-1',
        recipe_type: 'base',
        quantity: 2,
      },
    ],
  })
  selections!: Array<Record<string, unknown>>;

  @ApiProperty({ example: 'walmart' })
  retailer!: string;

  @ApiProperty({ example: '2026-03-19T03:12:00.000Z' })
  created_at!: string;

  @ApiProperty({ example: '2026-03-19T03:12:00.000Z' })
  updated_at!: string;
}

export class CartResponseDto {
  @ApiProperty({ example: 'cart-1' })
  id!: string;

  @ApiProperty({ example: 'user-1' })
  user_id!: string;

  @ApiPropertyOptional({ example: 'draft-1' })
  name?: string;

  @ApiProperty({ example: 'walmart' })
  retailer!: string;

  @ApiProperty({
    example: [
      {
        recipe_id: 'recipe-1',
        recipe_type: 'base',
        quantity: 2,
      },
    ],
  })
  selections!: Array<Record<string, unknown>>;

  @ApiProperty({ type: () => [DishResponseDto] })
  dishes!: DishResponseDto[];

  @ApiProperty({ type: () => [AggregatedIngredientResponseDto] })
  overview!: AggregatedIngredientResponseDto[];

  @ApiProperty({ example: '2026-03-19T03:12:00.000Z' })
  created_at!: string;

  @ApiProperty({ example: '2026-03-19T03:12:00.000Z' })
  updated_at!: string;
}

export class ShoppingCartHistorySummaryResponseDto {
  @ApiProperty({ example: 'shopping-cart-1' })
  id!: string;

  @ApiProperty({ example: 'user-1' })
  user_id!: string;

  @ApiProperty({ example: 'cart-1' })
  cart_id!: string;

  @ApiProperty({ example: 'walmart' })
  retailer!: string;

  @ApiProperty({ example: 19.9 })
  estimated_subtotal!: number;

  @ApiPropertyOptional({
    example:
      'https://www.instacart.com/store/products/products_link/example',
  })
  external_url?: string;

  @ApiPropertyOptional({ example: 'cart-1' })
  external_reference_id?: string;

  @ApiProperty({ example: 5 })
  overview_count!: number;

  @ApiProperty({ example: 5 })
  matched_item_count!: number;

  @ApiProperty({ example: '2026-03-19T03:12:00.000Z' })
  created_at!: string;

  @ApiProperty({ example: '2026-03-19T03:12:00.000Z' })
  updated_at!: string;
}

export class ShoppingCartResponseDto {
  @ApiProperty({ example: 'shopping-cart-1' })
  id!: string;

  @ApiProperty({ example: 'user-1' })
  user_id!: string;

  @ApiProperty({ example: 'cart-1' })
  cart_id!: string;

  @ApiProperty({ type: () => [AggregatedIngredientResponseDto] })
  overview!: AggregatedIngredientResponseDto[];

  @ApiProperty({ type: () => [MatchedIngredientProductResponseDto] })
  matched_items!: MatchedIngredientProductResponseDto[];

  @ApiProperty({ example: 19.9 })
  estimated_subtotal!: number;

  @ApiPropertyOptional({ example: 21.5 })
  estimated_total?: number;

  @ApiProperty({ example: 'walmart' })
  retailer!: string;

  @ApiPropertyOptional({
    example:
      'https://www.instacart.com/store/products/products_link/example',
  })
  external_url?: string;

  @ApiPropertyOptional({ example: 'cart-1' })
  external_reference_id?: string;

  @ApiProperty({ example: '2026-03-19T03:12:00.000Z' })
  created_at!: string;

  @ApiProperty({ example: '2026-03-19T03:12:00.000Z' })
  updated_at!: string;
}

export class MealPlanDayResponseDto {
  @ApiPropertyOptional({ example: 'recipe-1' })
  breakfast?: string;

  @ApiPropertyOptional({ example: 'recipe-2' })
  lunch?: string;

  @ApiPropertyOptional({ example: 'recipe-3' })
  dinner?: string;
}

export class MealPlanResponseDto {
  @ApiPropertyOptional({ example: 'meal-plan-1' })
  id?: string;

  @ApiPropertyOptional({ example: 'user-1' })
  user_id?: string;

  @ApiProperty({ example: '2026-04-20' })
  week_start!: string;

  @ApiProperty({ type: () => [MealPlanDayResponseDto] })
  days!: MealPlanDayResponseDto[];

  @ApiPropertyOptional({ example: '2026-04-22T12:00:00.000Z' })
  created_at?: string;

  @ApiPropertyOptional({ example: '2026-04-22T12:10:00.000Z' })
  updated_at?: string;
}
