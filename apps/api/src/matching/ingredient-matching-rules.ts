import type { AggregatedIngredient } from '@cart/shared';

export type IngredientMatchingRule = {
  id: string;
  ingredientKeywords: string[];
  positiveKeywords?: string[];
  negativeKeywords?: string[];
  hardRejectKeywords?: string[];
  preferredUnits?: string[];
  minSemanticScore?: number;
};

const RULES: IngredientMatchingRule[] = [
  {
    id: 'corn-ear',
    ingredientKeywords: ['corn'],
    positiveKeywords: ['cob', 'ear', 'fresh', 'sweet'],
    negativeKeywords: ['kernel', 'creamed'],
    hardRejectKeywords: ['canned'],
    preferredUnits: ['unit'],
    minSemanticScore: 8,
  },
  {
    id: 'rice-plain',
    ingredientKeywords: ['rice'],
    positiveKeywords: ['rice', 'white', 'brown', 'jasmine', 'basmati', 'long', 'grain'],
    negativeKeywords: ['seasoned'],
    hardRejectKeywords: ['pilaf', 'mix', 'ready', 'roni'],
    minSemanticScore: 10,
  },
  {
    id: 'potato-raw',
    ingredientKeywords: ['potato'],
    positiveKeywords: ['fresh', 'whole', 'gold', 'yellow', 'russet', 'red'],
    negativeKeywords: ['mashed'],
    hardRejectKeywords: ['salad', 'chips', 'fries', 'hashbrown'],
    preferredUnits: ['unit'],
    minSemanticScore: 8,
  },
  {
    id: 'onion-raw',
    ingredientKeywords: ['onion'],
    positiveKeywords: ['fresh', 'whole', 'yellow', 'red', 'white', 'sweet'],
    hardRejectKeywords: ['rings', 'dip', 'mix'],
    preferredUnits: ['unit'],
    minSemanticScore: 7,
  },
  {
    id: 'tomato-raw',
    ingredientKeywords: ['tomato'],
    positiveKeywords: ['fresh', 'roma', 'heirloom', 'vine', 'beefsteak', 'grape', 'cherry'],
    hardRejectKeywords: ['sauce', 'soup', 'ketchup', 'paste', 'salsa'],
    preferredUnits: ['unit'],
    minSemanticScore: 7,
  },
  {
    id: 'cilantro-herb',
    ingredientKeywords: ['cilantro'],
    positiveKeywords: ['cilantro', 'fresh', 'bunch'],
    hardRejectKeywords: ['dressing', 'sauce', 'dip', 'marinade'],
    preferredUnits: ['unit'],
    minSemanticScore: 7,
  },
];

const tokenize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/[\s-]+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => (token.endsWith('s') ? token.slice(0, -1) : token));

export const resolveIngredientMatchingRule = (
  ingredient: AggregatedIngredient,
) => {
  const ingredientTokens = new Set(tokenize(ingredient.canonical_ingredient));

  return RULES.find((rule) =>
    rule.ingredientKeywords.some((keyword) => ingredientTokens.has(keyword)),
  );
};
