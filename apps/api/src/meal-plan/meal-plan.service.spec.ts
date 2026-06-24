import { MealPlanService } from './meal-plan.service';

describe('MealPlanService', () => {
  const service = new MealPlanService(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  ) as unknown as {
    buildNutritionSummary(events: unknown[]): {
      calories?: number;
      protein_g?: number;
      carbs_g?: number;
      fat_g?: number;
    };
  };

  it('scales per-serving nutrition by event servings divided by recipe servings', () => {
    const summary = service.buildNutritionSummary([
      {
        id: 'event-1',
        source_type: 'recipe',
        servings: 2,
        recipe: {
          id: 'recipe-1',
          servings: 4,
          nutrition_data: {
            calories: 800,
            protein_g: 40,
            carbs_g: 100,
            fat_g: 20,
          },
        },
      },
    ]);

    expect(summary).toEqual({
      calories: 400,
      protein_g: 20,
      carbs_g: 50,
      fat_g: 10,
    });
  });
});
