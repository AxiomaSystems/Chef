import type { AggregatedIngredient } from '@cart/shared';

type IngredientQueryPlan = {
  skip: boolean;
  queries: string[];
};

const SPECIALTY_INGREDIENTS = [
  'aji amarillo paste',
  'aji limo',
];

const NEAR_EQUIVALENT_QUERY_REWRITES: Array<{
  match: (ingredient: AggregatedIngredient) => boolean;
  queries: string[];
}> = [
  {
    match: (ingredient) =>
      ingredient.canonical_ingredient.toLowerCase() === 'corn' &&
      ingredient.unit.toLowerCase() === 'ear',
    queries: ['corn on the cob', 'sweet corn', 'corn'],
  },
  {
    match: (ingredient) =>
      ingredient.canonical_ingredient.toLowerCase() === 'yellow potato',
    queries: ['gold potato', 'yellow potato', 'potato'],
  },
  {
    match: (ingredient) =>
      ingredient.canonical_ingredient.toLowerCase() === 'white fish fillet',
    queries: ['white fish fillet', 'tilapia fillet', 'cod fillet'],
  },
];

export const buildIngredientQueryPlan = (
  ingredient: AggregatedIngredient,
): IngredientQueryPlan => {
  const normalizedIngredient = ingredient.canonical_ingredient.trim().toLowerCase();

  if (SPECIALTY_INGREDIENTS.includes(normalizedIngredient)) {
    return {
      skip: true,
      queries: [],
    };
  }

  const rewrite = NEAR_EQUIVALENT_QUERY_REWRITES.find((entry) =>
    entry.match(ingredient),
  );

  if (rewrite) {
    return {
      skip: false,
      queries: rewrite.queries,
    };
  }

  return {
    skip: false,
    queries: [ingredient.canonical_ingredient],
  };
};
