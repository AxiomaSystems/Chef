const { systemRecipes } = require('./data/system-recipes');
const { userRecipes } = require('./data/user-recipes');
const { normalizeSlug } = require('./ingredients');

const DIETARY_BADGE_SLUGS = new Set([
  'halal',
  'kosher',
  'vegan',
  'vegetarian',
  'pescatarian',
  'gluten-free',
  'dairy-free',
  'nut-free',
  'egg-free',
  'soy-free',
  'high-protein',
  'low-carb',
  'low-fat',
  'low-sodium',
  'keto',
  'paleo',
  'sugar-free',
  'spicy',
]);

function normalizeTagName(tag) {
  return tag.trim().replace(/\s+/g, ' ');
}

function normalizeTagSlug(tag) {
  return normalizeTagName(tag)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function connectRecipeTags(
  prisma,
  context,
  recipeId,
  ownerUserId,
  isSystemRecipe,
  tags,
) {
  await prisma.recipeTag.deleteMany({
    where: { recipeId },
  });

  const uniqueTags = Array.from(
    new Map(
      (tags ?? []).map((tag) => [normalizeTagSlug(tag), normalizeTagName(tag)]),
    ).entries(),
  ).map(([slug, name]) => ({ slug, name }));

  const tagIds = uniqueTags
    .map((tag) =>
      resolveSeedTagId(context, tag.slug, ownerUserId, isSystemRecipe),
    )
    .filter(Boolean);

  if (tagIds.length === 0) {
    return;
  }

  await prisma.recipeTag.createMany({
    data: tagIds.map((tagId) => ({ recipeId, tagId })),
    skipDuplicates: true,
  });
}

function mapRecipeIngredientsWithCanonicalIds(context, ingredients) {
  const slugs = ingredients.map((ingredient) =>
    normalizeSlug(ingredient.canonicalIngredient),
  );

  return ingredients.map((ingredient, index) => {
    const ingredientId = context.ingredientIdsBySlug.get(slugs[index]);

    return {
      ...ingredient,
      ...(ingredientId ? { ingredientId } : {}),
    };
  });
}

function recipeIdentityKey(recipe, ownership) {
  return [
    ownership.isSystemRecipe ? 'system' : 'user',
    ownership.ownerUserId ?? 'null',
    recipe.name,
  ].join('::');
}

function tagKind(slug) {
  return DIETARY_BADGE_SLUGS.has(slug) ? 'dietary_badge' : 'general';
}

function resolveSeedTagId(context, slug, ownerUserId, isSystemRecipe) {
  const systemTagId = context.systemTagIdsBySlug.get(slug);
  if (isSystemRecipe || systemTagId) {
    return systemTagId;
  }

  return context.userTagIdsByOwnerAndSlug.get(`${ownerUserId ?? null}:${slug}`);
}

function inferRecipePlanning(recipe) {
  const tagSlugs = new Set((recipe.tags ?? []).map(normalizeTagSlug));
  const searchable = `${recipe.name} ${recipe.description ?? ''}`.toLowerCase();
  const mealTypes = new Set();

  if (
    tagSlugs.has('breakfast') ||
    /\bbreakfast|pancake|toast|oat\b/.test(searchable)
  ) {
    mealTypes.add('breakfast');
  }
  if (
    tagSlugs.has('dessert') ||
    /\bdessert|cake|cookie|sweet\b/.test(searchable)
  ) {
    mealTypes.add('dessert');
  }
  if (tagSlugs.has('side') || tagSlugs.has('side-dish')) {
    mealTypes.add('side');
  }
  if (tagSlugs.has('snack')) {
    mealTypes.add('snack');
  }
  if (mealTypes.size === 0) {
    mealTypes.add('lunch');
    mealTypes.add('dinner');
  }

  const ingredientCount = recipe.ingredients?.length ?? 0;
  const stepCount = recipe.steps?.length ?? 0;
  const prepTimeMinutes =
    recipe.prepTimeMinutes ?? Math.min(35, 5 + ingredientCount * 2);
  const cookTimeMinutes =
    recipe.cookTimeMinutes ??
    Math.min(75, Math.max(10, stepCount * 8 + (tagSlugs.has('quick') ? 0 : 5)));
  const totalTimeMinutes =
    recipe.totalTimeMinutes ?? prepTimeMinutes + cookTimeMinutes;
  const complexityScore = ingredientCount + stepCount * 2;
  const difficulty =
    recipe.difficulty ??
    (complexityScore <= 13
      ? 'easy'
      : complexityScore <= 21
        ? 'medium'
        : 'hard');
  const ingredientsText = (recipe.ingredients ?? [])
    .map((ingredient) => ingredient.canonicalIngredient)
    .join(' ')
    .toLowerCase();
  const estimatedCostTier =
    recipe.estimatedCostTier ??
    (/\bshrimp|salmon|steak|pecan|parmesan|saffron|lamb\b/.test(ingredientsText)
      ? 'high'
      : /\bchicken|beef|fish|cheese|nuts?\b/.test(ingredientsText)
        ? 'medium'
        : 'low');
  const costNotes =
    recipe.costNotes ??
    (estimatedCostTier === 'high'
      ? ['Uses one or more premium ingredients relative to the catalog.']
      : estimatedCostTier === 'medium'
        ? ['Uses common proteins or dairy with moderate relative cost.']
        : ['Mostly pantry staples, grains, beans, or vegetables.']);

  return {
    mealTypes: Array.from(mealTypes),
    profile: {
      difficulty,
      difficultyReason:
        recipe.difficultyReason ??
        `${ingredientCount} ingredients and ${stepCount} cooking steps in the seed recipe.`,
      prepTimeMinutes,
      cookTimeMinutes,
      totalTimeMinutes,
      estimatedCostTier,
      costNotes,
    },
  };
}

async function ensureSystemTags(prisma, recipes) {
  const uniqueTags = new Map();
  for (const recipe of recipes) {
    for (const tag of recipe.tags ?? []) {
      const slug = normalizeTagSlug(tag);
      if (!slug || uniqueTags.has(slug)) {
        continue;
      }
      uniqueTags.set(slug, normalizeTagName(tag));
    }
  }

  const slugs = Array.from(uniqueTags.keys());
  const existingTags = slugs.length
    ? await prisma.tag.findMany({
        where: {
          scope: 'system',
          slug: { in: slugs },
        },
      })
    : [];
  const existingBySlug = new Map(existingTags.map((tag) => [tag.slug, tag]));

  for (const [slug, name] of uniqueTags.entries()) {
    const existing = existingBySlug.get(slug);
    const kind = tagKind(slug);
    if (!existing) {
      const created = await prisma.tag.create({
        data: { name, slug, scope: 'system', kind },
      });
      existingBySlug.set(slug, created);
    } else if (existing.name !== name || existing.kind !== kind) {
      const updated = await prisma.tag.update({
        where: { id: existing.id },
        data: { name, kind },
      });
      existingBySlug.set(slug, updated);
    }
  }

  return new Map(
    Array.from(existingBySlug.values()).map((tag) => [tag.slug, tag.id]),
  );
}

async function ensureUserTags(
  prisma,
  recipes,
  ownerUserId,
  systemTagIdsBySlug,
) {
  if (!ownerUserId) {
    return new Map();
  }

  const uniqueTags = new Map();
  for (const recipe of recipes) {
    for (const tag of recipe.tags ?? []) {
      const slug = normalizeTagSlug(tag);
      if (!slug || systemTagIdsBySlug.has(slug) || uniqueTags.has(slug)) {
        continue;
      }
      uniqueTags.set(slug, normalizeTagName(tag));
    }
  }

  const slugs = Array.from(uniqueTags.keys());
  const existingTags = slugs.length
    ? await prisma.tag.findMany({
        where: {
          scope: 'user',
          ownerUserId,
          slug: { in: slugs },
        },
      })
    : [];
  const existingBySlug = new Map(existingTags.map((tag) => [tag.slug, tag]));

  for (const [slug, name] of uniqueTags.entries()) {
    const existing = existingBySlug.get(slug);
    if (!existing) {
      const created = await prisma.tag.create({
        data: { name, slug, scope: 'user', ownerUserId, kind: 'general' },
      });
      existingBySlug.set(slug, created);
    } else if (existing.name !== name || existing.kind !== 'general') {
      const updated = await prisma.tag.update({
        where: { id: existing.id },
        data: { name, kind: 'general' },
      });
      existingBySlug.set(slug, updated);
    }
  }

  return new Map(
    Array.from(existingBySlug.values()).map((tag) => [
      `${ownerUserId}:${tag.slug}`,
      tag.id,
    ]),
  );
}

async function buildRecipeSeedContext(prisma, devUserId) {
  const recipes = [...systemRecipes, ...userRecipes];
  const cuisineLabels = Array.from(
    new Set(recipes.map((recipe) => recipe.cuisine).filter(Boolean)),
  );
  const cuisineRows = await prisma.cuisine.findMany({
    where: {
      label: { in: cuisineLabels },
    },
    select: { id: true, label: true, slug: true },
  });
  const cuisineIdsByLabel = new Map(
    cuisineRows.map((cuisine) => [cuisine.label.toLowerCase(), cuisine.id]),
  );
  const fallbackCuisineId =
    cuisineRows.find((cuisine) => cuisine.slug === 'other')?.id ??
    (
      await prisma.cuisine.findUnique({
        where: { slug: 'other' },
        select: { id: true },
      })
    )?.id;

  if (!fallbackCuisineId) {
    throw new Error('Cuisine catalog is not seeded');
  }

  const ingredientSlugs = Array.from(
    new Set(
      recipes
        .flatMap((recipe) => recipe.ingredients)
        .map((ingredient) => normalizeSlug(ingredient.canonicalIngredient))
        .filter(Boolean),
    ),
  );
  const ingredientRows = await prisma.ingredient.findMany({
    where: { slug: { in: ingredientSlugs } },
    select: { id: true, slug: true },
  });

  const existingSystemRecipes = await prisma.baseRecipe.findMany({
    where: {
      isSystemRecipe: true,
      ownerUserId: null,
      name: { in: systemRecipes.map((recipe) => recipe.name) },
    },
    select: { id: true, name: true, ownerUserId: true, isSystemRecipe: true },
  });
  const existingUserRecipes = devUserId
    ? await prisma.baseRecipe.findMany({
        where: {
          isSystemRecipe: false,
          ownerUserId: devUserId,
          name: { in: userRecipes.map((recipe) => recipe.name) },
        },
        select: {
          id: true,
          name: true,
          ownerUserId: true,
          isSystemRecipe: true,
        },
      })
    : [];

  const systemTagIdsBySlug = await ensureSystemTags(prisma, systemRecipes);
  const userTagIdsByOwnerAndSlug = await ensureUserTags(
    prisma,
    userRecipes,
    devUserId,
    systemTagIdsBySlug,
  );

  return {
    cuisineIdsByLabel,
    fallbackCuisineId,
    ingredientIdsBySlug: new Map(
      ingredientRows.map((ingredient) => [ingredient.slug, ingredient.id]),
    ),
    existingRecipesByKey: new Map(
      [...existingSystemRecipes, ...existingUserRecipes].map((existing) => [
        recipeIdentityKey(existing, existing),
        existing,
      ]),
    ),
    systemTagIdsBySlug,
    userTagIdsByOwnerAndSlug,
  };
}

async function upsertRecipe(prisma, context, recipe, ownership) {
  const cuisineId =
    context.cuisineIdsByLabel.get(String(recipe.cuisine).toLowerCase()) ??
    context.fallbackCuisineId;
  const ingredients = mapRecipeIngredientsWithCanonicalIds(
    context,
    recipe.ingredients,
  );

  const existing = context.existingRecipesByKey.get(
    recipeIdentityKey(recipe, ownership),
  );
  const planning = inferRecipePlanning(recipe);
  const provenance = ownership.isSystemRecipe
    ? {
        sourceType: 'unknown',
        sourceName: 'Preppie',
        attributionLabel: 'Curated by Preppie',
        reviewStatus: 'trusted',
      }
    : {
        sourceType: 'user_created',
        sourceName: null,
        attributionLabel: null,
        reviewStatus: 'reviewed',
      };

  const data = {
    ownerUserId: ownership.ownerUserId ?? null,
    isSystemRecipe: ownership.isSystemRecipe,
    name: recipe.name,
    cuisineId,
    description: recipe.description,
    coverImageUrl: recipe.coverImageUrl,
    nutritionData: recipe.nutritionData,
    servings: recipe.servings,
    ingredients: {
      deleteMany: existing ? {} : undefined,
      create: ingredients,
    },
    steps: {
      deleteMany: existing ? {} : undefined,
      create: recipe.steps,
    },
    planningProfile: {
      ...(existing
        ? {
            upsert: {
              create: planning.profile,
              update: planning.profile,
            },
          }
        : { create: planning.profile }),
    },
    mealTypes: {
      ...(existing ? { deleteMany: {} } : {}),
      create: planning.mealTypes.map((mealType) => ({ mealType })),
    },
    provenanceProfile: {
      ...(existing
        ? {
            upsert: {
              create: provenance,
              update: provenance,
            },
          }
        : { create: provenance }),
    },
  };

  if (existing) {
    const updated = await prisma.baseRecipe.update({
      where: { id: existing.id },
      data,
    });
    await connectRecipeTags(
      prisma,
      context,
      updated.id,
      ownership.ownerUserId ?? null,
      ownership.isSystemRecipe,
      recipe.tags,
    );
    return;
  }

  const created = await prisma.baseRecipe.create({ data });
  context.existingRecipesByKey.set(recipeIdentityKey(recipe, ownership), {
    id: created.id,
  });
  await connectRecipeTags(
    prisma,
    context,
    created.id,
    ownership.ownerUserId ?? null,
    ownership.isSystemRecipe,
    recipe.tags,
  );
}

async function seedRecipes(prisma, devUserId) {
  await prisma.baseRecipe.updateMany({
    where: {
      isSystemRecipe: true,
    },
    data: {
      ownerUserId: null,
    },
  });

  await prisma.baseRecipe.deleteMany({
    where: {
      ownerUserId: null,
      isSystemRecipe: false,
      name: {
        in: systemRecipes.map((recipe) => recipe.name),
      },
    },
  });

  const context = await buildRecipeSeedContext(prisma, devUserId);

  for (const recipe of systemRecipes) {
    await upsertRecipe(prisma, context, recipe, {
      ownerUserId: null,
      isSystemRecipe: true,
    });
  }

  for (const recipe of userRecipes) {
    await upsertRecipe(prisma, context, recipe, {
      ownerUserId: devUserId,
      isSystemRecipe: false,
    });
  }
}

async function seedDietaryBadgeTags(prisma) {
  const labels = {
    halal: 'Halal',
    kosher: 'Kosher',
    vegan: 'Vegan',
    vegetarian: 'Vegetarian',
    pescatarian: 'Pescatarian',
    'gluten-free': 'Gluten-Free',
    'dairy-free': 'Dairy-Free',
    'nut-free': 'Nut-Free',
    'egg-free': 'Egg-Free',
    'soy-free': 'Soy-Free',
    'high-protein': 'High-Protein',
    'low-carb': 'Low-Carb',
    'low-fat': 'Low-Fat',
    'low-sodium': 'Low-Sodium',
    keto: 'Keto',
    paleo: 'Paleo',
    'sugar-free': 'Sugar-Free',
    spicy: 'Spicy',
  };

  for (const [slug, name] of Object.entries(labels)) {
    const existing = await prisma.tag.findFirst({
      where: { slug, scope: 'system' },
    });

    if (existing) {
      await prisma.tag.update({
        where: { id: existing.id },
        data: { name, kind: 'dietary_badge' },
      });
      continue;
    }

    await prisma.tag.create({
      data: { name, slug, scope: 'system', kind: 'dietary_badge' },
    });
  }
}

module.exports = {
  seedRecipes,
  seedDietaryBadgeTags,
};
