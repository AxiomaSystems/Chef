const { PrismaClient } = require("../generated/prisma");

const prisma = new PrismaClient();
const DEFAULT_DEV_USER_EMAIL = "postigodev@cart-generator.local";

const systemRecipes = [
  {
    name: "Aji de gallina",
    cuisine: "Peruvian",
    description: "Shredded chicken in a creamy aji amarillo and bread sauce.",
    servings: 4,
    tags: ["peruvian", "main-course", "chicken"],
    ingredients: [
      { canonicalIngredient: "chicken breast", amount: 800, unit: "g", displayIngredient: "chicken breast", sortOrder: 0 },
      { canonicalIngredient: "aji amarillo paste", amount: 3, unit: "tbsp", displayIngredient: "aji amarillo paste", sortOrder: 1 },
      { canonicalIngredient: "evaporated milk", amount: 1, unit: "cup", displayIngredient: "evaporated milk", sortOrder: 2 },
      { canonicalIngredient: "bread", amount: 2, unit: "slice", displayIngredient: "white bread", sortOrder: 3 },
      { canonicalIngredient: "pecan", amount: 0.5, unit: "cup", displayIngredient: "pecans", sortOrder: 4 },
      { canonicalIngredient: "parmesan cheese", amount: 0.25, unit: "cup", displayIngredient: "grated parmesan cheese", sortOrder: 5 },
      { canonicalIngredient: "yellow potato", amount: 4, unit: "unit", displayIngredient: "yellow potatoes", sortOrder: 6 },
      { canonicalIngredient: "egg", amount: 2, unit: "unit", displayIngredient: "boiled eggs", sortOrder: 7 },
    ],
    steps: [
      { stepNumber: 1, whatToDo: "Cook and shred the chicken." },
      { stepNumber: 2, whatToDo: "Blend bread, milk, pecans, and aji amarillo into a smooth sauce." },
      { stepNumber: 3, whatToDo: "Cook the sauce, fold in the chicken, and finish with parmesan." },
      { stepNumber: 4, whatToDo: "Serve with boiled potatoes and sliced egg." },
    ],
  },
  {
    name: "Lomo saltado",
    cuisine: "Peruvian",
    description: "Quick wok-style beef stir fry with onions, tomatoes, and fries.",
    servings: 4,
    tags: ["peruvian", "beef", "stir-fry"],
    ingredients: [
      { canonicalIngredient: "beef sirloin", amount: 700, unit: "g", displayIngredient: "beef sirloin", sortOrder: 0 },
      { canonicalIngredient: "red onion", amount: 1, unit: "unit", displayIngredient: "red onion", sortOrder: 1 },
      { canonicalIngredient: "tomato", amount: 2, unit: "unit", displayIngredient: "tomatoes", sortOrder: 2 },
      { canonicalIngredient: "soy sauce", amount: 3, unit: "tbsp", displayIngredient: "soy sauce", sortOrder: 3 },
      { canonicalIngredient: "red wine vinegar", amount: 1, unit: "tbsp", displayIngredient: "red wine vinegar", sortOrder: 4 },
      { canonicalIngredient: "cilantro", amount: 0.25, unit: "cup", displayIngredient: "chopped cilantro", sortOrder: 5 },
      { canonicalIngredient: "french fries", amount: 500, unit: "g", displayIngredient: "french fries", sortOrder: 6 },
      { canonicalIngredient: "rice", amount: 2, unit: "cup", displayIngredient: "cooked white rice", sortOrder: 7 },
    ],
    steps: [
      { stepNumber: 1, whatToDo: "Sear the beef over high heat." },
      { stepNumber: 2, whatToDo: "Add onion and tomato and stir fry quickly." },
      { stepNumber: 3, whatToDo: "Season with soy sauce and vinegar." },
      { stepNumber: 4, whatToDo: "Finish with cilantro and serve with fries and rice." },
    ],
  },
  {
    name: "Ceviche",
    cuisine: "Peruvian",
    description: "Fresh fish cured in lime juice with onion, chile, and cilantro.",
    servings: 4,
    tags: ["peruvian", "seafood", "cold-dish"],
    ingredients: [
      { canonicalIngredient: "white fish fillet", amount: 700, unit: "g", displayIngredient: "firm white fish fillets", sortOrder: 0 },
      { canonicalIngredient: "lime", amount: 10, unit: "unit", displayIngredient: "limes", sortOrder: 1 },
      { canonicalIngredient: "red onion", amount: 1, unit: "unit", displayIngredient: "red onion", sortOrder: 2 },
      { canonicalIngredient: "aji limo", amount: 1, unit: "unit", displayIngredient: "aji limo or other hot chile", sortOrder: 3 },
      { canonicalIngredient: "cilantro", amount: 0.25, unit: "cup", displayIngredient: "chopped cilantro", sortOrder: 4 },
      { canonicalIngredient: "sweet potato", amount: 2, unit: "unit", displayIngredient: "sweet potatoes", sortOrder: 5 },
      { canonicalIngredient: "corn", amount: 2, unit: "ear", displayIngredient: "ears of corn", sortOrder: 6 },
    ],
    steps: [
      { stepNumber: 1, whatToDo: "Cube the fish and season with salt." },
      { stepNumber: 2, whatToDo: "Add lime juice, onion, chile, and cilantro." },
      { stepNumber: 3, whatToDo: "Let the fish cure briefly until opaque." },
      { stepNumber: 4, whatToDo: "Serve chilled with sweet potato and corn." },
    ],
  },
];

const userRecipes = [
  {
    name: "Arroz con pollo casero",
    cuisine: "Peruvian",
    description: "Home-style chicken rice with peas, cilantro, and bell pepper.",
    servings: 4,
    tags: ["peruvian", "chicken", "rice"],
    ingredients: [
      { canonicalIngredient: "chicken thigh", amount: 800, unit: "g", displayIngredient: "chicken thighs", sortOrder: 0 },
      { canonicalIngredient: "rice", amount: 2, unit: "cup", displayIngredient: "white rice", sortOrder: 1 },
      { canonicalIngredient: "cilantro", amount: 1, unit: "cup", displayIngredient: "cilantro", sortOrder: 2 },
      { canonicalIngredient: "green pea", amount: 1, unit: "cup", displayIngredient: "green peas", sortOrder: 3 },
      { canonicalIngredient: "red bell pepper", amount: 1, unit: "unit", displayIngredient: "red bell pepper", sortOrder: 4 },
      { canonicalIngredient: "chicken stock", amount: 3, unit: "cup", displayIngredient: "chicken stock", sortOrder: 5 },
    ],
    steps: [
      { stepNumber: 1, whatToDo: "Brown the chicken and set aside." },
      { stepNumber: 2, whatToDo: "Blend cilantro with a little stock and cook the mixture briefly." },
      { stepNumber: 3, whatToDo: "Add rice, peas, pepper, and stock, then return the chicken to the pot." },
      { stepNumber: 4, whatToDo: "Cover and cook until the rice is tender." },
    ],
  },
];

async function upsertRecipe(recipe, ownership) {
  const existing = await prisma.baseRecipe.findFirst({
    where: {
      name: recipe.name,
      ownerUserId: ownership.ownerUserId ?? null,
      isSystemRecipe: ownership.isSystemRecipe,
    },
    select: { id: true },
  });

  if (existing) {
    await prisma.baseRecipe.update({
      where: { id: existing.id },
      data: {
        ownerUserId: ownership.ownerUserId ?? null,
        isSystemRecipe: ownership.isSystemRecipe,
        cuisine: recipe.cuisine,
        description: recipe.description,
        servings: recipe.servings,
        tags: recipe.tags,
        ingredients: {
          deleteMany: {},
          create: recipe.ingredients,
        },
        steps: {
          deleteMany: {},
          create: recipe.steps,
        },
      },
    });

    return;
  }

  await prisma.baseRecipe.create({
    data: {
      ownerUserId: ownership.ownerUserId ?? null,
      isSystemRecipe: ownership.isSystemRecipe,
      name: recipe.name,
      cuisine: recipe.cuisine,
      description: recipe.description,
      servings: recipe.servings,
      tags: recipe.tags,
      ingredients: {
        create: recipe.ingredients,
      },
      steps: {
        create: recipe.steps,
      },
    },
  });
}

async function main() {
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@cart-generator.local" },
    update: {
      name: "System Admin",
      role: "admin",
    },
    create: {
      email: "admin@cart-generator.local",
      name: "System Admin",
      role: "admin",
    },
  });

  const devUser = await prisma.user.upsert({
    where: { email: DEFAULT_DEV_USER_EMAIL },
    update: {
      name: "postigodev",
      role: "user",
    },
    create: {
      email: DEFAULT_DEV_USER_EMAIL,
      name: "postigodev",
      role: "user",
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
    await upsertRecipe(recipe, {
      ownerUserId: null,
      isSystemRecipe: true,
    });
  }

  for (const recipe of userRecipes) {
    await upsertRecipe(recipe, {
      ownerUserId: devUser.id,
      isSystemRecipe: false,
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
