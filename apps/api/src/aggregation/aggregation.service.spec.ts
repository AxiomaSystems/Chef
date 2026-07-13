import { AggregationService } from './aggregation.service';

describe('AggregationService', () => {
  let service: AggregationService;

  beforeEach(() => {
    service = new AggregationService();
  });

  it('aggregates ingredients with the same canonical ingredient and unit', () => {
    const result = service.compute([
      {
        name: 'Dish A',
        ingredients: [
          {
            canonical_ingredient: 'rice',
            amount: 1,
            unit: 'cup',
          },
        ],
        steps: [],
      },
      {
        name: 'Dish B',
        ingredients: [
          {
            canonical_ingredient: 'rice',
            amount: 2,
            unit: 'cup',
          },
        ],
        steps: [],
      },
    ]);

    expect(result.overview).toEqual([
      {
        ingredient_id: undefined,
        source_recipe_ingredient_id: undefined,
        canonical_ingredient: 'rice',
        total_amount: 3,
        quantity: 3,
        unit: 'cup',
        amount_text: undefined,
        purchase_unit_hint: 'cup',
        requires_quantity_review: false,
        source_dishes: [
          {
            dish_name: 'Dish A',
            amount: 1,
            unit: 'cup',
            amount_text: undefined,
          },
          {
            dish_name: 'Dish B',
            amount: 2,
            unit: 'cup',
            amount_text: undefined,
          },
        ],
      },
    ]);
  });

  it('aggregates ingredients with equivalent normalized names', () => {
    const result = service.compute([
      {
        name: 'Dish A',
        ingredients: [
          {
            canonical_ingredient: 'Chicken',
            amount: 1,
            unit: 'lb',
          },
        ],
        steps: [],
      },
      {
        name: 'Dish B',
        ingredients: [
          {
            canonical_ingredient: 'chicken!',
            amount: 1,
            unit: 'lb',
          },
        ],
        steps: [],
      },
    ]);

    expect(result.overview).toHaveLength(1);
    expect(result.overview[0]).toEqual(
      expect.objectContaining({
        canonical_ingredient: 'Chicken',
        total_amount: 2,
        unit: 'lb',
      }),
    );
  });

  it('aggregates by ingredient id before display name when available', () => {
    const result = service.compute([
      {
        name: 'Dish A',
        ingredients: [
          {
            ingredient_id: 'ingredient-rice',
            canonical_ingredient: 'white rice',
            amount: 1,
            unit: 'cup',
          },
        ],
        steps: [],
      },
      {
        name: 'Dish B',
        ingredients: [
          {
            ingredient_id: 'ingredient-rice',
            canonical_ingredient: 'rice',
            amount: 2,
            unit: 'cup',
          },
        ],
        steps: [],
      },
    ]);

    expect(result.overview).toEqual([
      expect.objectContaining({
        ingredient_id: 'ingredient-rice',
        canonical_ingredient: 'white rice',
        total_amount: 3,
        unit: 'cup',
      }),
    ]);
  });

  it('does not merge ingredients with different units', () => {
    const result = service.compute([
      {
        name: 'Dish A',
        ingredients: [
          {
            canonical_ingredient: 'milk',
            amount: 1,
            unit: 'cup',
          },
          {
            canonical_ingredient: 'milk',
            amount: 200,
            unit: 'ml',
          },
        ],
        steps: [],
      },
    ]);

    expect(result.overview).toHaveLength(2);
    expect(result.overview.map((item) => item.unit).sort()).toEqual([
      'cup',
      'ml',
    ]);
  });

  it('keeps unmeasured ingredients as reviewable cart lines', () => {
    const result = service.compute([
      {
        name: 'Dish A',
        ingredients: [
          {
            recipe_ingredient_id: 'dish-ingredient-salt',
            canonical_ingredient: 'salt',
            amount: null,
            unit: null,
            amount_text: 'to taste',
          },
        ],
        steps: [],
      },
    ]);

    expect(result.overview).toEqual([
      expect.objectContaining({
        source_recipe_ingredient_id: 'dish-ingredient-salt',
        canonical_ingredient: 'salt',
        total_amount: null,
        quantity: null,
        unit: null,
        amount_text: 'to taste',
        purchase_unit_hint: undefined,
        requires_quantity_review: true,
      }),
    ]);
  });
});
