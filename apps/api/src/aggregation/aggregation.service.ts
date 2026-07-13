import { Injectable } from '@nestjs/common';
import type {
  AggregatedIngredient,
  CartComputationResult,
  Dish,
} from '@cart/shared';
import { normalizeIngredientKey } from '@cart/shared';

@Injectable()
export class AggregationService {
  compute(dishes: Dish[]): CartComputationResult {
    const ingredientMap = new Map<string, AggregatedIngredient>();

    for (const dish of dishes) {
      for (const ingredient of dish.ingredients) {
        const key = this.buildAggregationKey(ingredient);
        const existing = ingredientMap.get(key);
        const measured =
          ingredient.amount !== undefined &&
          ingredient.amount !== null &&
          ingredient.unit !== undefined &&
          ingredient.unit !== null &&
          ingredient.unit.trim().length > 0;

        if (existing) {
          if (measured) {
            existing.total_amount =
              (existing.total_amount ?? 0) + (ingredient.amount ?? 0);
            existing.quantity = existing.total_amount;
          }
          existing.source_dishes.push({
            dish_name: dish.name,
            amount: ingredient.amount ?? null,
            unit: ingredient.unit ?? null,
            amount_text: ingredient.amount_text,
          });
          continue;
        }

        ingredientMap.set(key, {
          ingredient_id: ingredient.ingredient_id,
          source_recipe_ingredient_id: ingredient.recipe_ingredient_id,
          canonical_ingredient: ingredient.canonical_ingredient,
          total_amount: measured ? ingredient.amount : null,
          quantity: measured ? ingredient.amount : null,
          unit: measured ? ingredient.unit : null,
          amount_text: ingredient.amount_text,
          purchase_unit_hint: measured ? ingredient.unit : undefined,
          requires_quantity_review: !measured,
          source_dishes: [
            {
              dish_name: dish.name,
              amount: ingredient.amount ?? null,
              unit: ingredient.unit ?? null,
              amount_text: ingredient.amount_text,
            },
          ],
        });
      }
    }

    return {
      dishes,
      overview: Array.from(ingredientMap.values()).sort((left, right) => {
        if (left.canonical_ingredient === right.canonical_ingredient) {
          return (left.unit ?? '').localeCompare(right.unit ?? '');
        }

        return left.canonical_ingredient.localeCompare(
          right.canonical_ingredient,
        );
      }),
    };
  }

  private buildAggregationKey(ingredient: Dish['ingredients'][number]): string {
    const unit = ingredient.unit?.trim().toLowerCase();

    if (
      !unit ||
      ingredient.amount === undefined ||
      ingredient.amount === null
    ) {
      return `unmeasured:${ingredient.recipe_ingredient_id ?? normalizeIngredientKey(ingredient.canonical_ingredient)}`;
    }

    if (ingredient.ingredient_id) {
      return `ingredient:${ingredient.ingredient_id}::${unit}`;
    }

    return `name:${normalizeIngredientKey(ingredient.canonical_ingredient)}::${unit}`;
  }
}
