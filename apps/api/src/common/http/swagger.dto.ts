import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ example: 404 })
  statusCode!: number;

  @ApiProperty({ example: 'Recipe recipe-1 not found' })
  message!: string;

  @ApiProperty({ example: 'Not Found' })
  error!: string;
}

export class VisionClassDefinitionResponseDto {
  @ApiProperty({ example: 'olive_oil_bottle' })
  id!: string;

  @ApiProperty({ example: 'olive oil bottle' })
  label!: string;

  @ApiProperty({ example: 'container' })
  category!:
    | 'produce'
    | 'container'
    | 'packaged_food'
    | 'prepared_food'
    | 'kitchenware'
    | 'unknown';

  @ApiProperty({ example: 'exact' })
  granularity!: 'exact' | 'generic';

  @ApiProperty({ example: 'track' })
  inventory_policy!: 'track' | 'review' | 'ignore';

  @ApiProperty({ example: true })
  stage_1_enabled!: boolean;
}

export class VisionBoundingBoxResponseDto {
  @ApiProperty({ example: 0.18 })
  x!: number;

  @ApiProperty({ example: 0.12 })
  y!: number;

  @ApiProperty({ example: 0.24 })
  width!: number;

  @ApiProperty({ example: 0.46 })
  height!: number;
}

export class VisionDetectionResponseDto {
  @ApiProperty({ example: 'obs_1_1_ab12cd34' })
  observation_id!: string;

  @ApiProperty({ example: 'olive_oil_bottle' })
  class_id!: string;

  @ApiProperty({ example: 'olive oil bottle' })
  label!: string;

  @ApiProperty({ example: 'container' })
  category!:
    | 'produce'
    | 'container'
    | 'packaged_food'
    | 'prepared_food'
    | 'kitchenware'
    | 'unknown';

  @ApiProperty({ example: 'exact' })
  granularity!: 'exact' | 'generic';

  @ApiProperty({ example: 'track' })
  inventory_policy!: 'track' | 'review' | 'ignore';

  @ApiProperty({ type: () => VisionBoundingBoxResponseDto })
  bbox!: VisionBoundingBoxResponseDto;

  @ApiProperty({ example: 0.94 })
  confidence!: number;
}

export class VisionFrameResultResponseDto {
  @ApiProperty({ example: 1 })
  frame_id!: number;

  @ApiPropertyOptional({
    example: 'closet_left_top olive oil bottle spice bottle plate',
  })
  frame_ref?: string;

  @ApiPropertyOptional({ example: 'closet_left_top' })
  zone_id?: string;

  @ApiPropertyOptional({ example: 1333 })
  timestamp_ms?: number;

  @ApiProperty({ type: () => [VisionDetectionResponseDto] })
  detections!: VisionDetectionResponseDto[];
}

export class VisionScanSummaryResponseDto {
  @ApiProperty({ example: 2 })
  frame_count!: number;

  @ApiProperty({ example: 4 })
  detection_count!: number;

  @ApiProperty({ example: 3 })
  track_candidate_count!: number;

  @ApiProperty({ example: 1 })
  review_candidate_count!: number;

  @ApiProperty({ example: 0 })
  ignored_detection_count!: number;

  @ApiProperty({ example: ['egg carton', 'milk carton', 'olive oil bottle'] })
  detected_labels!: string[];
}

export class VisionPipelineConfigResponseDto {
  @ApiProperty({ example: 'mock-stage1-detector' })
  provider!: string;

  @ApiProperty({ example: 'detection_only' })
  stage!: 'detection_only';

  @ApiProperty({ example: false })
  tracking_enabled!: boolean;

  @ApiProperty({ example: false })
  embeddings_enabled!: boolean;

  @ApiProperty({ example: false })
  open_vocabulary_enabled!: boolean;

  @ApiProperty({ example: false })
  packaged_food_enrichment_enabled!: boolean;

  @ApiProperty({ example: false })
  segmentation_enabled!: boolean;

  @ApiProperty({ type: () => [VisionClassDefinitionResponseDto] })
  supported_classes!: VisionClassDefinitionResponseDto[];

  @ApiProperty({
    example: [
      'Stage 1 is closed-set detection only. Tracking, embeddings, OCR, and DINO-style fallback are intentionally off.',
    ],
  })
  notes!: string[];
}

export class VisionScanResponseDto {
  @ApiProperty({ example: 'scan_demo_001' })
  scan_session_id!: string;

  @ApiProperty({ type: () => VisionPipelineConfigResponseDto })
  pipeline!: VisionPipelineConfigResponseDto;

  @ApiProperty({ type: () => [VisionFrameResultResponseDto] })
  frames!: VisionFrameResultResponseDto[];

  @ApiProperty({ type: () => VisionScanSummaryResponseDto })
  summary!: VisionScanSummaryResponseDto;
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
  retailer!: 'walmart';

  @ApiProperty({ example: 'cilantro' })
  query!: string;

  @ApiProperty({ type: () => [ProductCandidateResponseDto] })
  candidates!: ProductCandidateResponseDto[];
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

  @ApiProperty({ example: '2026-03-19T03:12:00.000Z' })
  created_at!: string;

  @ApiProperty({ example: '2026-03-19T03:12:00.000Z' })
  updated_at!: string;
}
