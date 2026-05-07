const cuisines = [
  // ── National ─────────────────────────────────────────────────────────────
  { id: "cuisine-peruvian",    slug: "peruvian",    label: "Peruvian",    kind: "national" },
  { id: "cuisine-mexican",     slug: "mexican",     label: "Mexican",     kind: "national" },
  { id: "cuisine-italian",     slug: "italian",     label: "Italian",     kind: "national" },
  { id: "cuisine-french",      slug: "french",      label: "French",      kind: "national" },
  { id: "cuisine-spanish",     slug: "spanish",     label: "Spanish",     kind: "national" },
  { id: "cuisine-greek",       slug: "greek",       label: "Greek",       kind: "national" },
  { id: "cuisine-turkish",     slug: "turkish",     label: "Turkish",     kind: "national" },
  { id: "cuisine-lebanese",    slug: "lebanese",    label: "Lebanese",    kind: "national" },
  { id: "cuisine-moroccan",    slug: "moroccan",    label: "Moroccan",    kind: "national" },
  { id: "cuisine-ethiopian",   slug: "ethiopian",   label: "Ethiopian",   kind: "national" },
  { id: "cuisine-nigerian",    slug: "nigerian",    label: "Nigerian",    kind: "national" },
  { id: "cuisine-ghanaian",    slug: "ghanaian",    label: "Ghanaian",    kind: "national" },
  { id: "cuisine-senegalese",  slug: "senegalese",  label: "Senegalese",  kind: "national" },
  { id: "cuisine-egyptian",    slug: "egyptian",    label: "Egyptian",    kind: "national" },
  { id: "cuisine-indian",      slug: "indian",      label: "Indian",      kind: "national" },
  { id: "cuisine-chinese",     slug: "chinese",     label: "Chinese",     kind: "national" },
  { id: "cuisine-japanese",    slug: "japanese",    label: "Japanese",    kind: "national" },
  { id: "cuisine-korean",      slug: "korean",      label: "Korean",      kind: "national" },
  { id: "cuisine-thai",        slug: "thai",        label: "Thai",        kind: "national" },
  { id: "cuisine-vietnamese",  slug: "vietnamese",  label: "Vietnamese",  kind: "national" },
  { id: "cuisine-filipino",    slug: "filipino",    label: "Filipino",    kind: "national" },
  { id: "cuisine-indonesian",  slug: "indonesian",  label: "Indonesian",  kind: "national" },
  { id: "cuisine-brazilian",   slug: "brazilian",   label: "Brazilian",   kind: "national" },
  { id: "cuisine-colombian",   slug: "colombian",   label: "Colombian",   kind: "national" },
  { id: "cuisine-jamaican",    slug: "jamaican",    label: "Jamaican",    kind: "national" },
  { id: "cuisine-cuban",       slug: "cuban",       label: "Cuban",       kind: "national" },
  { id: "cuisine-haitian",     slug: "haitian",     label: "Haitian",     kind: "national" },
  { id: "cuisine-puerto-rican", slug: "puerto-rican", label: "Puerto Rican", kind: "national" },
  { id: "cuisine-ukrainian",   slug: "ukrainian",   label: "Ukrainian",   kind: "national" },
  { id: "cuisine-german",      slug: "german",      label: "German",      kind: "national" },

  // ── Cultural / Regional ────────────────────────────────────────────────
  { id: "cuisine-middle-eastern",  slug: "middle-eastern",  label: "Middle Eastern",  kind: "cultural" },
  { id: "cuisine-west-african",    slug: "west-african",    label: "West African",    kind: "cultural" },
  { id: "cuisine-east-african",    slug: "east-african",    label: "East African",    kind: "cultural" },
  { id: "cuisine-north-african",   slug: "north-african",   label: "North African",   kind: "cultural" },
  { id: "cuisine-south-asian",     slug: "south-asian",     label: "South Asian",     kind: "cultural" },
  { id: "cuisine-southeast-asian", slug: "southeast-asian", label: "Southeast Asian", kind: "cultural" },
  { id: "cuisine-caribbean",       slug: "caribbean",       label: "Caribbean",       kind: "cultural" },
  { id: "cuisine-latin-american",  slug: "latin-american",  label: "Latin American",  kind: "cultural" },

  // ── Style ──────────────────────────────────────────────────────────────
  { id: "cuisine-mediterranean", slug: "mediterranean", label: "Mediterranean", kind: "style" },
  { id: "cuisine-tex-mex",       slug: "tex-mex",       label: "Tex-Mex",       kind: "style" },
  { id: "cuisine-soul-food",     slug: "soul-food",     label: "Soul Food",     kind: "style" },
  { id: "cuisine-bbq",           slug: "bbq",           label: "BBQ",           kind: "style" },
  { id: "cuisine-fusion",        slug: "fusion",        label: "Fusion",        kind: "style" },

  // ── Other ──────────────────────────────────────────────────────────────
  { id: "cuisine-other", slug: "other", label: "Other", kind: "other" },
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
