import {
  buildCreateRecipeData,
  buildOwnedMutableRecipeWhere,
  buildUpdateRecipeData,
  buildVisibleRecipeWhere,
} from './recipe.persistence.mapper';

describe('recipe.persistence.mapper', () => {
  it('builds create recipe data with nested ingredients and steps', () => {
    const result = buildCreateRecipeData(
      {
        name: 'Arroz con pollo casero',
        cuisine_id: 'cuisine-peruvian',
        description: 'Comforting chicken and rice dish.',
        nutrition_data: {
          calories: 640,
          protein_g: 42,
        },
        servings: 4,
        ingredients: [
          {
            canonical_ingredient: 'rice',
            amount: 2,
            unit: 'cup',
            display_ingredient: '2 cups white rice',
            preparation: 'rinsed',
            optional: false,
            group: 'base',
          },
        ],
        steps: [
          {
            step: 1,
            what_to_do: 'Brown the chicken thighs.',
          },
        ],
        tag_ids: ['tag-system-dinner'],
      },
      'user-1',
    );

    expect(result).toEqual({
      ownerUserId: 'user-1',
      isSystemRecipe: false,
      name: 'Arroz con pollo casero',
      cuisineId: 'cuisine-peruvian',
      description: 'Comforting chicken and rice dish.',
      nutritionData: {
        calories: 640,
        protein_g: 42,
      },
      servings: 4,
      ingredients: {
        create: [
          {
            canonicalIngredient: 'rice',
            amount: 2,
            unit: 'cup',
            displayIngredient: '2 cups white rice',
            preparation: 'rinsed',
            optional: false,
            ingredientGroup: 'base',
            sortOrder: 0,
          },
        ],
      },
      steps: {
        create: [
          {
            stepNumber: 1,
            whatToDo: 'Brown the chicken thighs.',
          },
        ],
      },
    });
  });

  it('builds update recipe data with full replacement arrays when present', () => {
    const result = buildUpdateRecipeData({
      name: 'Arroz con pollo actualizado',
      nutrition_data: {
        calories: 690,
        carbs_g: 40,
      },
      servings: 6,
      ingredients: [
        {
          canonical_ingredient: 'rice',
          amount: 3,
          unit: 'cup',
        },
      ],
      steps: [
        {
          step: 1,
          what_to_do: 'Add rice and simmer until cooked.',
        },
      ],
      tag_ids: ['tag-system-updated'],
    });

    expect(result).toEqual({
      name: 'Arroz con pollo actualizado',
      cuisineId: undefined,
      description: undefined,
      nutritionData: {
        calories: 690,
        carbs_g: 40,
      },
      servings: 6,
      ingredients: {
        deleteMany: {},
        create: [
          {
            canonicalIngredient: 'rice',
            amount: 3,
            unit: 'cup',
            displayIngredient: undefined,
            preparation: undefined,
            optional: false,
            ingredientGroup: undefined,
            sortOrder: 0,
          },
        ],
      },
      steps: {
        deleteMany: {},
        create: [
          {
            stepNumber: 1,
            whatToDo: 'Add rice and simmer until cooked.',
          },
        ],
      },
    });
  });

  it('builds visibility and ownership where clauses', () => {
    expect(buildVisibleRecipeWhere('user-1')).toEqual({
      OR: [{ isSystemRecipe: true }, { ownerUserId: 'user-1' }],
    });

    expect(buildOwnedMutableRecipeWhere('recipe-1', 'user-1')).toEqual({
      id: 'recipe-1',
      ownerUserId: 'user-1',
      isSystemRecipe: false,
    });
  });
});
