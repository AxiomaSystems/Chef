const { systemRecipes } = require('./data/system-recipes');
const { userRecipes } = require('./data/user-recipes');

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
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

function normalizeSlug(name) {
  return normalizeName(name)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function inferCategory(name) {
  const value = normalizeName(name);

  if (
    /(chicken|beef|pork|bacon|turkey|lamb|fish|sirloin|fillet|salmon|tuna|shrimp|crab|lobster|scallop|cod|tofu|tempeh|lentil|chickpea|bean|edamame)/.test(
      value,
    )
  ) {
    return 'protein';
  }

  if (
    /(milk|cheese|egg|cream|yogurt|butter|mozzarella|parmesan|feta|brie|gouda|ricotta|mascarpone)/.test(
      value,
    )
  ) {
    return 'dairy-eggs';
  }

  if (
    /(apple|banana|lemon|lime|orange|strawberry|blueberry|raspberry|mango|avocado|grape|pineapple|watermelon|peach|pear|plum|kiwi|papaya|coconut|cherry|pomegranate|fig|grapefruit|cantaloupe)/.test(
      value,
    )
  ) {
    return 'fruit';
  }

  if (
    /(onion|garlic|tomato|pepper|broccoli|spinach|kale|carrot|celery|cucumber|zucchini|eggplant|mushroom|asparagus|pea|corn|cauliflower|cabbage|lettuce|arugula|potato|beet|artichoke|leek|bok choy|radish|turnip|parsnip|aji|cilantro|parsley|basil|chive|dill)/.test(
      value,
    )
  ) {
    return 'produce';
  }

  if (
    /(rice|bread|fries|pasta|spaghetti|penne|tortilla|oat|quinoa|barley|couscous|breadcrumb|panko|pita|naan|flour|cornmeal)/.test(
      value,
    )
  ) {
    return 'pantry';
  }

  if (
    /(oil|sauce|vinegar|paste|ketchup|mustard|mayonnaise|sriracha|tahini|pesto|broth|stock|canned|sugar|honey|syrup|baking|cornstarch|yeast|cocoa|chocolate|peanut butter|almond butter|jam|tapenade|caper|pecan|almond|walnut|cashew|pistachio|seed)/.test(
      value,
    )
  ) {
    return 'pantry';
  }

  if (
    /(salt|pepper|cumin|paprika|turmeric|cinnamon|oregano|thyme|rosemary|bay|chili|cayenne|powder|ginger|nutmeg|clove|cardamom|coriander|fennel|sage|allspice|anise|vanilla|saffron|curry|masala|za'atar|sumac|harissa|ras el hanout)/.test(
      value,
    )
  ) {
    return 'spices';
  }

  return 'other';
}

function inferDefaultAmount(unit) {
  const defaults = {
    unit: 1,
    lb: 1,
    oz: 8,
    g: 500,
    kg: 1,
    cup: 1,
    tbsp: 1,
    tsp: 1,
    bunch: 1,
    slice: 4,
    can: 1,
    jar: 1,
    bottle: 1,
    carton: 1,
    dozen: 1,
    ear: 2,
    bag: 1,
  };

  return defaults[unit] ?? 1;
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
          estimatedAmount: inferDefaultAmount(ingredient.defaultUnit),
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
        estimatedAmount: inferDefaultAmount(ingredient.defaultUnit),
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
