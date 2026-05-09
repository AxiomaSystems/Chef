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
        canonical_ingredient: 'rice',
        total_amount: 3,
        unit: 'cup',
        purchase_unit_hint: 'cup',
        source_dishes: [
          { dish_name: 'Dish A', amount: 1, unit: 'cup' },
          { dish_name: 'Dish B', amount: 2, unit: 'cup' },
        ],
      },
    ]);
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
});
