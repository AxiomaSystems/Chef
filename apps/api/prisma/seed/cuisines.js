const cuisines = [
  {
    id: "cuisine-peruvian",
    slug: "peruvian",
    label: "Peruvian",
    kind: "national",
  },
  {
    id: "cuisine-mexican",
    slug: "mexican",
    label: "Mexican",
    kind: "national",
  },
  {
    id: "cuisine-italian",
    slug: "italian",
    label: "Italian",
    kind: "national",
  },
  {
    id: "cuisine-middle-eastern",
    slug: "middle-eastern",
    label: "Middle Eastern",
    kind: "cultural",
  },
  {
    id: "cuisine-mediterranean",
    slug: "mediterranean",
    label: "Mediterranean",
    kind: "style",
  },
  {
    id: "cuisine-tex-mex",
    slug: "tex-mex",
    label: "Tex-Mex",
    kind: "style",
  },
  {
    id: "cuisine-other",
    slug: "other",
    label: "Other",
    kind: "other",
  },
];

async function seedCuisines(prisma) {
  for (const cuisine of cuisines) {
    await prisma.cuisine.upsert({
      where: { slug: cuisine.slug },
      update: {
        label: cuisine.label,
        kind: cuisine.kind,
      },
      create: cuisine,
    });
  }
}

async function resolveCuisineId(prisma, cuisineLabel) {
  const normalizedLabel = typeof cuisineLabel === "string" ? cuisineLabel.trim() : "";

  const cuisine =
    (normalizedLabel
      ? await prisma.cuisine.findFirst({
          where: {
            label: {
              equals: normalizedLabel,
              mode: "insensitive",
            },
          },
        })
      : null) ||
    (await prisma.cuisine.findUnique({
      where: { slug: "other" },
    }));

  if (!cuisine) {
    throw new Error("Cuisine catalog is not seeded");
  }

  return cuisine.id;
}

module.exports = {
  cuisines,
  seedCuisines,
  resolveCuisineId,
};
