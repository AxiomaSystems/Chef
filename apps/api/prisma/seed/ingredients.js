const { systemRecipes } = require("./data/system-recipes");
const { userRecipes } = require("./data/user-recipes");

const DEMO_KITCHEN_SLUGS = new Set([
  "rice",
  "egg",
  "bread",
  "soy-sauce",
  "red-wine-vinegar",
  "olive-oil",
  "salt",
  "black-pepper",
]);

function normalizeName(name) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeSlug(name) {
  return normalizeName(name)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function inferCategory(name) {
  const value = normalizeName(name);

  if (/(chicken|beef|fish|sirloin|fillet)/.test(value)) {
    return "protein";
  }

  if (/(milk|cheese|egg)/.test(value)) {
    return "dairy-eggs";
  }

  if (/(lime|onion|cilantro|corn|tomato|potato|aji)/.test(value)) {
    return "produce";
  }

  if (/(rice|bread|fries)/.test(value)) {
    return "pantry";
  }

  if (/(sauce|vinegar|paste|pecan)/.test(value)) {
    return "pantry";
  }

  return "other";
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
        category: inferCategory(canonicalName),
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
    await prisma.kitchenInventoryItem.upsert({
      where: {
        userId_ingredientId: {
          userId: devUserId,
          ingredientId: ingredient.id,
        },
      },
      update: {
        source: "seed",
        confidence: "high",
      },
      create: {
        userId: devUserId,
        ingredientId: ingredient.id,
        source: "seed",
        confidence: "high",
      },
    });
  }
}

module.exports = {
  seedIngredients,
  normalizeName,
  normalizeSlug,
};
