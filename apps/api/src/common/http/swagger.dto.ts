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

export class BaseRecipeResponseDto {
  @ApiProperty({ example: 'recipe-1' })
  id!: string;

  @ApiPropertyOptional({ example: 'user-1' })
  owner_user_id?: string;

  @ApiProperty({ example: false })
  is_system_recipe!: boolean;

  @ApiProperty({ example: 'Arroz con pollo casero' })
  name!: string;

  @ApiPropertyOptional({ example: 'Peruvian' })
  cuisine?: string;

  @ApiPropertyOptional({ example: 'Comforting chicken and rice dish.' })
  description?: string;

  @ApiProperty({ example: 4 })
  servings!: number;

  @ApiProperty({ type: () => [DishIngredientResponseDto] })
  ingredients!: DishIngredientResponseDto[];

  @ApiProperty({ type: () => [RecipeStepResponseDto] })
  steps!: RecipeStepResponseDto[];

  @ApiPropertyOptional({ example: ['dinner', 'comfort food'] })
  tags?: string[];

  @ApiProperty({ example: '2026-03-19T03:12:00.000Z' })
  created_at!: string;

  @ApiProperty({ example: '2026-03-19T03:12:00.000Z' })
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
  @ApiProperty({ example: 'rice' })
  canonical_ingredient!: string;

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

export class GeneratedCartHistorySummaryResponseDto {
  @ApiProperty({ example: 'cart-1' })
  id!: string;

  @ApiProperty({ example: 'user-1' })
  user_id!: string;

  @ApiPropertyOptional({ example: 'draft-1' })
  cart_draft_id?: string;

  @ApiProperty({ example: 'walmart' })
  retailer!: string;

  @ApiProperty({ example: 19.9 })
  estimated_subtotal!: number;

  @ApiProperty({ example: 2 })
  dish_count!: number;

  @ApiProperty({ example: 5 })
  overview_count!: number;

  @ApiProperty({ example: 5 })
  matched_item_count!: number;

  @ApiProperty({ example: '2026-03-19T03:12:00.000Z' })
  created_at!: string;

  @ApiProperty({ example: '2026-03-19T03:12:00.000Z' })
  updated_at!: string;
}

export class GeneratedCartResponseDto {
  @ApiProperty({ example: 'cart-1' })
  id!: string;

  @ApiProperty({ example: 'user-1' })
  user_id!: string;

  @ApiPropertyOptional({ example: 'draft-1' })
  cart_draft_id?: string;

  @ApiProperty({ type: () => [DishResponseDto] })
  dishes!: DishResponseDto[];

  @ApiProperty({ type: () => [AggregatedIngredientResponseDto] })
  overview!: AggregatedIngredientResponseDto[];

  @ApiProperty({ type: () => [MatchedIngredientProductResponseDto] })
  matched_items!: MatchedIngredientProductResponseDto[];

  @ApiProperty({ example: 19.9 })
  estimated_subtotal!: number;

  @ApiProperty({ example: 'walmart' })
  retailer!: string;

  @ApiProperty({ example: '2026-03-19T03:12:00.000Z' })
  created_at!: string;

  @ApiProperty({ example: '2026-03-19T03:12:00.000Z' })
  updated_at!: string;
}

export class GenerateCartResponseDto {
  @ApiPropertyOptional({ example: 'draft-1' })
  cart_draft_id?: string;

  @ApiProperty({ type: () => [DishResponseDto] })
  dishes!: DishResponseDto[];

  @ApiProperty({ type: () => [AggregatedIngredientResponseDto] })
  overview!: AggregatedIngredientResponseDto[];

  @ApiProperty({ type: () => [MatchedIngredientProductResponseDto] })
  matched_items!: MatchedIngredientProductResponseDto[];

  @ApiProperty({ example: 19.9 })
  estimated_subtotal!: number;

  @ApiProperty({ example: 'walmart' })
  retailer!: string;
}
