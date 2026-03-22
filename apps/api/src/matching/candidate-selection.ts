import type { AggregatedIngredient, ProductCandidate } from '@cart/shared';
import type { CandidateMatch } from './matching.types';
import { resolveIngredientMatchingRule } from './ingredient-matching-rules';
import { convertUnit } from './unit-conversion';

const STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'by',
  'for',
  'fresh',
  'from',
  'in',
  'of',
  'on',
  'or',
  'the',
  'to',
  'with',
]);

const NEGATIVE_KEYWORDS = [
  'chips',
  'cleaner',
  'cookie',
  'cookies',
  'cracker',
  'crackers',
  'dipping',
  'dip',
  'dressing',
  'juice',
  'marinade',
  'mix',
  'perfume',
  'sauce',
  'seasoning',
  'snack',
  'soap',
  'soup',
  'syrup',
  'toy',
];

const convertCandidateSize = (
  ingredient: AggregatedIngredient,
  candidate: ProductCandidate,
): number | null => {
  if (!candidate.size_value || !candidate.size_unit) {
    return null;
  }

  return convertUnit(candidate.size_value, candidate.size_unit, ingredient.unit);
};

const tokenize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/[\s-]+/)
    .map((token) => token.trim())
    .filter((token) => token && !STOPWORDS.has(token))
    .map((token) => (token.endsWith('s') ? token.slice(0, -1) : token));

const buildSemanticScore = (
  ingredient: AggregatedIngredient,
  candidate: ProductCandidate,
) => {
  const ingredientName = ingredient.canonical_ingredient.toLowerCase();
  const ingredientTokens = tokenize(ingredient.canonical_ingredient);
  const title = candidate.title.toLowerCase();
  const brand = candidate.brand?.toLowerCase() ?? '';
  const quantityText = candidate.quantity_text?.toLowerCase() ?? '';
  const haystack = `${title} ${brand} ${quantityText}`.trim();
  const rule = resolveIngredientMatchingRule(ingredient);

  let score = 0;

  if (title.includes(ingredientName)) {
    score += 12;
  } else if (haystack.includes(ingredientName)) {
    score += 8;
  }

  const titleTokens = new Set(tokenize(candidate.title));
  const haystackTokens = new Set(tokenize(haystack));
  const matchedIngredientTokens = ingredientTokens.filter((token) =>
    haystackTokens.has(token),
  );

  score += matchedIngredientTokens.length * 4;

  if (
    ingredientTokens.length > 0 &&
    ingredientTokens.every((token) => titleTokens.has(token))
  ) {
    score += 6;
  }

  for (const keyword of NEGATIVE_KEYWORDS) {
    if (ingredientTokens.includes(keyword)) {
      continue;
    }

    if (title.includes(keyword)) {
      score -= 5;
    } else if (haystack.includes(keyword)) {
      score -= 3;
    }
  }

  if (rule) {
    const positiveMatches =
      rule.positiveKeywords?.filter((keyword) => haystack.includes(keyword)) ?? [];
    const negativeMatches =
      rule.negativeKeywords?.filter((keyword) => haystack.includes(keyword)) ?? [];
    const hardRejectMatches =
      rule.hardRejectKeywords?.filter((keyword) => haystack.includes(keyword)) ?? [];

    score += positiveMatches.length * 3;
    score -= negativeMatches.length * 6;

    if (
      rule.preferredUnits?.length &&
      candidate.size_unit &&
      rule.preferredUnits.includes(candidate.size_unit.toLowerCase())
    ) {
      score += 3;
    }

    if (hardRejectMatches.length > 0) {
      score -= 100;
    }

    return {
      score,
      matchedTokenCount: matchedIngredientTokens.length,
      minScore: rule.minSemanticScore ?? 1,
    };
  }

  return {
    score,
    matchedTokenCount: matchedIngredientTokens.length,
    minScore: 1,
  };
};

export const pickCandidate = (
  ingredient: AggregatedIngredient,
  candidates: ProductCandidate[],
): CandidateMatch | null => {
  if (candidates.length === 0) {
    return null;
  }

  return candidates
    .slice()
    .map((candidate) => ({
      product: candidate,
      convertedSizeValue: convertCandidateSize(ingredient, candidate),
      semantic: buildSemanticScore(ingredient, candidate),
    }))
    .filter(
      (candidate) =>
        candidate.semantic.matchedTokenCount > 0 &&
        candidate.semantic.score >= candidate.semantic.minScore,
    )
    .sort((left, right) => {
      if (right.semantic.score !== left.semantic.score) {
        return right.semantic.score - left.semantic.score;
      }

      const leftConvertible = left.convertedSizeValue !== null ? 0 : 1;
      const rightConvertible = right.convertedSizeValue !== null ? 0 : 1;

      if (leftConvertible !== rightConvertible) {
        return leftConvertible - rightConvertible;
      }

      const leftUnitPenalty = left.product.size_unit === ingredient.unit ? 0 : 1;
      const rightUnitPenalty = right.product.size_unit === ingredient.unit ? 0 : 1;

      if (leftUnitPenalty !== rightUnitPenalty) {
        return leftUnitPenalty - rightUnitPenalty;
      }

      return left.product.price - right.product.price;
    })[0] ?? null;
};
