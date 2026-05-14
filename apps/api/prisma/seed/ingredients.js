const { systemRecipes } = require('./data/system-recipes');
const { userRecipes } = require('./data/user-recipes');
const {
  inferIngredientCategory,
  inferInventoryAmount,
  normalizeIngredientName,
  normalizeIngredientSlug,
} = require('../../../../packages/shared/dist');

const DEMO_KITCHEN_SLUGS = new Set([
  'rice',
  'egg',
  'bread',
  'soy-sauce',
  'red-wine-vinegar',
  'olive-oil',
  'salt',
  'black-pepper',
]);

function normalizeName(name) {
  return normalizeIngredientName(name);
}

function normalizeSlug(name) {
  return normalizeIngredientSlug(name);
}

function ingredientSeedsFromRecipes() {
  const recipes = [...systemRecipes, ...userRecipes];
  const ingredients = new Map();

  for (const recipe of recipes) {
    for (const ingredient of recipe.ingredients) {
      const canonicalName = normalizeName(ingredient.canonicalIngredient);
      const slug = normalizeSlug(canonicalName);

      if (!slug || ingredients.has(slug)) {
        continue;
      }

      ingredients.set(slug, {
        canonicalName,
        slug,
        category: inferIngredientCategory(canonicalName),
        defaultUnit: ingredient.unit,
      });
    }
  }

  return Array.from(ingredients.values()).sort((left, right) =>
    left.canonicalName.localeCompare(right.canonicalName),
  );
}

async function seedIngredients(prisma, devUserId) {
  const ingredients = ingredientSeedsFromRecipes();

  for (const ingredient of ingredients) {
    await prisma.ingredient.upsert({
      where: { slug: ingredient.slug },
      update: {
        canonicalName: ingredient.canonicalName,
        category: ingredient.category,
        defaultUnit: ingredient.defaultUnit,
      },
      create: {
        ...ingredient,
        aliases: [],
        visionLabels: [],
      },
    });
  }

  if (!devUserId) {
    return;
  }

  const pantryIngredients = await prisma.ingredient.findMany({
    where: {
      slug: {
        in: Array.from(DEMO_KITCHEN_SLUGS),
      },
    },
  });

  for (const ingredient of pantryIngredients) {
    const existing = await prisma.kitchenInventoryItem.findFirst({
      where: {
        userId: devUserId,
        ingredientId: ingredient.id,
        reviewStatus: 'active',
      },
    });

    if (existing) {
      await prisma.kitchenInventoryItem.update({
        where: { id: existing.id },
        data: {
          displayName: ingredient.canonicalName,
          normalizedName: normalizeName(ingredient.canonicalName),
          estimatedAmount: inferInventoryAmount(ingredient.defaultUnit),
          unit: ingredient.defaultUnit,
          source: 'seed',
          confidence: 'high',
        },
      });
      continue;
    }

    await prisma.kitchenInventoryItem.create({
      data: {
        userId: devUserId,
        ingredientId: ingredient.id,
        displayName: ingredient.canonicalName,
        normalizedName: normalizeName(ingredient.canonicalName),
        estimatedAmount: inferInventoryAmount(ingredient.defaultUnit),
        unit: ingredient.defaultUnit,
        source: 'seed',
        confidence: 'high',
      },
    });
  }
}

module.exports = {
  seedIngredients,
  normalizeName,
  normalizeSlug,
};
