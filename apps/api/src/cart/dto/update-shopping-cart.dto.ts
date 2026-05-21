import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsOptional,
} from 'class-validator';

export class UpdateShoppingCartDto {
  @ApiProperty({
    example: [
      {
        kind: 'ingredient_match',
        canonical_ingredient: 'rice',
        needed_amount: 2,
        needed_unit: 'cup',
        walmart_search_query: 'rice',
        selected_product: {
          product_id: 'walmart-rice-1',
          title: 'Long Grain White Rice',
          price: 3.98,
        },
        selected_quantity: 1,
        estimated_line_total: 3.98,
      },
      {
        kind: 'manual_item',
        canonical_ingredient: 'sparkling water',
        manual_label: 'Sparkling water',
        needed_amount: 1,
        needed_unit: 'unit',
        walmart_search_query: 'sparkling water',
        selected_product: {
          product_id: 'walmart-water-1',
          title: 'Sparkling Water 12 Pack',
          price: 5.49,
        },
        selected_quantity: 1,
        estimated_line_total: 5.49,
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  matched_items?: Array<Record<string, unknown>>;

  @ApiProperty({
    required: false,
    nullable: true,
    example: '2026-05-18T18:30:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  checked_out_at?: string | null;
}
