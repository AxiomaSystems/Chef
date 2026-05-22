import type { BaseRecipe } from '@cart/shared';
import {
  buildHomeRecipeRecommendations,
  type RecipeRecommendationProfile,
} from './recipe.recommendations';

const baseRecipe = (overrides: Partial<BaseRecipe>): BaseRecipe => ({
  id: 'recipe-1',
  is_system_recipe: true,
  name: 'Chicken stew',
  cuisine_id: 'cuisine-west-african',
  cuisine: {
    id: 'cuisine-west-african',
    slug: 'west-african',
    label: 'West African',
    kind: 'cultural',
    created_at: '2026-05-01T00:00:00.000Z',
    updated_at: '2026-05-01T00:00:00.000Z',
  },
  servings: 4,
  ingredients: [
    {
      canonical_ingredient: 'chicken',
      amount: 1,
      unit: 'lb',
    },
  ],
  steps: [{ step: 1, what_to_do: 'Cook it.' }],
  tag_ids: [],
  tags: [],
  created_at: '2026-05-01T00:00:00.000Z',
  updated_at: '2026-05-01T00:00:00.000Z',
  ...overrides,
});

const profile = (
  overrides: Partial<RecipeRecommendationProfile> = {},
): RecipeRecommendationProfile => ({
  preferredCuisineIds: [],
  preferredTagIds: [],
  favoriteProteins: [],
  favoriteFlavors: [],
  dislikedIngredients: [],
  preferredCookingTime: null,
  goalPriorities: [],
  hardAvoidLabels: [],
  ...overrides,
});

describe('buildHomeRecipeRecommendations', () => {
  it('prioritizes recipes that match user preferences', () => {
    const matchingRecipe = baseRecipe({
      id: 'matching',
      cuisine_id: 'cuisine-chinese',
      cuisine: {
        id: 'cuisine-chinese',
        slug: 'chinese',
        label: 'Chinese',
        kind: 'national',
        created_at: '2026-05-01T00:00:00.000Z',
        updated_at: '2026-05-01T00:00:00.000Z',
      },
      created_at: '2026-05-01T00:00:00.000Z',
    });
    const recentRecipe = baseRecipe({
      id: 'recent',
      created_at: '2026-05-02T00:00:00.000Z',
    });

    const result = buildHomeRecipeRecommendations(
      [recentRecipe, matchingRecipe],
      profile({ preferredCuisineIds: ['cuisine-chinese'] }),
    );

    expect(result.hero?.id).toBe('matching');
  });

  it('filters hard avoid labels from every home section', () => {
    const peanutRecipe = baseRecipe({
      id: 'peanut',
      name: 'Peanut noodles',
      ingredients: [
        { canonical_ingredient: 'peanut butter', amount: 1, unit: 'cup' },
      ],
      created_at: '2026-05-03T00:00:00.000Z',
    });
    const safeRecipe = baseRecipe({
      id: 'safe',
      name: 'Tomato pasta',
      ingredients: [{ canonical_ingredient: 'tomato', amount: 2, unit: 'cup' }],
      created_at: '2026-05-02T00:00:00.000Z',
    });

    const result = buildHomeRecipeRecommendations(
      [peanutRecipe, safeRecipe],
      profile({ hardAvoidLabels: ['peanut'] }),
    );
    const allIds = [
      result.hero?.id,
      ...result.picked_for_you.map((entry) => entry.recipe.id),
      ...result.trending.map((recipe) => recipe.id),
      ...result.more_to_cook.map((recipe) => recipe.id),
    ];

    expect(allIds).not.toContain('peanut');
    expect(allIds).toContain('safe');
  });
});
