const { systemRecipes } = require("./data/system-recipes");
const { userRecipes } = require("./data/user-recipes");
const { resolveCuisineId } = require("./cuisines");

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
        },
      });
    } else if (userTag.name !== tag.name) {
      userTag = await prisma.tag.update({
        where: { id: userTag.id },
        data: {
          name: tag.name,
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

module.exports = {
  seedRecipes,
};
