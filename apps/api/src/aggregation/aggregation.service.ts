import { Injectable } from '@nestjs/common';
import type {
  AggregatedIngredient,
  CartComputationResult,
  Dish,
} from '@cart/shared';

@Injectable()
export class AggregationService {
  compute(dishes: Dish[]): CartComputationResult {
    const ingredientMap = new Map<string, AggregatedIngredient>();

    for (const dish of dishes) {
      for (const ingredient of dish.ingredients) {
        const key = this.buildAggregationKey(ingredient);
        const existing = ingredientMap.get(key);

        if (existing) {
          existing.total_amount += ingredient.amount;
          existing.source_dishes.push({
            dish_name: dish.name,
            amount: ingredient.amount,
            unit: ingredient.unit,
          });
          continue;
        }

        ingredientMap.set(key, {
          ingredient_id: ingredient.ingredient_id,
          canonical_ingredient: ingredient.canonical_ingredient,
          total_amount: ingredient.amount,
          unit: ingredient.unit,
          purchase_unit_hint: ingredient.unit,
          source_dishes: [
            {
              dish_name: dish.name,
              amount: ingredient.amount,
              unit: ingredient.unit,
            },
          ],
        });
      }
    }

    return {
      dishes,
      overview: Array.from(ingredientMap.values()).sort((left, right) => {
        if (left.canonical_ingredient === right.canonical_ingredient) {
          return left.unit.localeCompare(right.unit);
        }

        return left.canonical_ingredient.localeCompare(
          right.canonical_ingredient,
        );
      }),
    };
  }

  private buildAggregationKey(ingredient: Dish['ingredients'][number]): string {
    const unit = ingredient.unit.trim().toLowerCase();

    if (ingredient.ingredient_id) {
      return `ingredient:${ingredient.ingredient_id}::${unit}`;
    }

    return `name:${ingredient.canonical_ingredient.trim().toLowerCase()}::${unit}`;
  }
}
