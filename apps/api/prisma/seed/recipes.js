const { systemRecipes } = require("./data/system-recipes");
const { userRecipes } = require("./data/user-recipes");
const { resolveCuisineId } = require("./cuisines");

const DIETARY_BADGE_SLUGS = new Set([
  "halal",
  "kosher",
  "vegan",
  "vegetarian",
  "pescatarian",
  "gluten-free",
  "dairy-free",
  "nut-free",
  "egg-free",
  "soy-free",
  "high-protein",
  "low-carb",
  "low-fat",
  "low-sodium",
  "keto",
  "paleo",
  "sugar-free",
  "spicy",
]);

function normalizeTagName(tag) {
  return tag.trim().replace(/\s+/g, " ");
}

function normalizeTagSlug(tag) {
  return normalizeTagName(tag)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function connectRecipeTags(prisma, recipeId, ownerUserId, isSystemRecipe, tags) {
  await prisma.recipeTag.deleteMany({
    where: { recipeId },
  });

  const uniqueTags = Array.from(
    new Map((tags ?? []).map((tag) => [normalizeTagSlug(tag), normalizeTagName(tag)])).entries(),
  ).map(([slug, name]) => ({ slug, name }));

  for (const tag of uniqueTags) {
    const kind = DIETARY_BADGE_SLUGS.has(tag.slug) ? "dietary_badge" : "general";
    const systemTag = await prisma.tag.findFirst({
      where: {
        scope: "system",
        slug: tag.slug,
      },
    });

    const resolvedTag =
      systemTag ||
      (isSystemRecipe
        ? await prisma.tag.create({
            data: {
              name: tag.name,
              slug: tag.slug,
              scope: "system",
              kind,
            },
          })
        : null);

    let userTag = resolvedTag;

    if (!userTag) {
      userTag = await prisma.tag.findFirst({
        where: {
          scope: "user",
          ownerUserId,
          slug: tag.slug,
        },
      });
    }

    if (!userTag) {
      userTag = await prisma.tag.create({
        data: {
          name: tag.name,
          slug: tag.slug,
          scope: "user",
          ownerUserId,
          kind: "general",
        },
      });
    } else if (userTag.name !== tag.name || userTag.kind !== "general") {
      userTag = await prisma.tag.update({
        where: { id: userTag.id },
        data: {
          name: tag.name,
          kind: "general",
        },
      });
    }

    if (resolvedTag && (resolvedTag.name !== tag.name || resolvedTag.kind !== kind)) {
      await prisma.tag.update({
        where: { id: resolvedTag.id },
        data: {
          name: tag.name,
          kind,
        },
      });
    }

    await prisma.recipeTag.create({
      data: {
        recipeId,
        tagId: (resolvedTag || userTag).id,
      },
    });
  }
}

async function upsertRecipe(prisma, recipe, ownership) {
  const cuisineId = await resolveCuisineId(prisma, recipe.cuisine);

  const existing = await prisma.baseRecipe.findFirst({
    where: {
      name: recipe.name,
      ownerUserId: ownership.ownerUserId ?? null,
      isSystemRecipe: ownership.isSystemRecipe,
    },
    select: { id: true },
  });

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
      create: recipe.ingredients,
    },
    steps: {
      deleteMany: existing ? {} : undefined,
      create: recipe.steps,
    },
  };

  if (existing) {
    const updated = await prisma.baseRecipe.update({
      where: { id: existing.id },
      data,
    });
    await connectRecipeTags(
      prisma,
      updated.id,
      ownership.ownerUserId ?? null,
      ownership.isSystemRecipe,
      recipe.tags,
    );
    return;
  }

  const created = await prisma.baseRecipe.create({ data });
  await connectRecipeTags(
    prisma,
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

  for (const recipe of systemRecipes) {
    await upsertRecipe(prisma, recipe, {
      ownerUserId: null,
      isSystemRecipe: true,
    });
  }

  for (const recipe of userRecipes) {
    await upsertRecipe(prisma, recipe, {
      ownerUserId: devUserId,
      isSystemRecipe: false,
    });
  }
}

async function seedDietaryBadgeTags(prisma) {
  const labels = {
    "halal": "Halal",
    "kosher": "Kosher",
    "vegan": "Vegan",
    "vegetarian": "Vegetarian",
    "pescatarian": "Pescatarian",
    "gluten-free": "Gluten-Free",
    "dairy-free": "Dairy-Free",
    "nut-free": "Nut-Free",
    "egg-free": "Egg-Free",
    "soy-free": "Soy-Free",
    "high-protein": "High-Protein",
    "low-carb": "Low-Carb",
    "low-fat": "Low-Fat",
    "low-sodium": "Low-Sodium",
    "keto": "Keto",
    "paleo": "Paleo",
    "sugar-free": "Sugar-Free",
    "spicy": "Spicy",
  };

  for (const [slug, name] of Object.entries(labels)) {
    await prisma.tag.upsert({
      where: { slug_scope: { slug, scope: "system" } },
      update: { name, kind: "dietary_badge" },
      create: { name, slug, scope: "system", kind: "dietary_badge" },
    });
  }
}

module.exports = {
  seedRecipes,
  seedDietaryBadgeTags,
};
