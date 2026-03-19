const { PrismaClient } = require("../generated/prisma");
const { seedCuisines } = require("./seed/cuisines");
const { seedUsers } = require("./seed/users");
const { seedRecipes } = require("./seed/recipes");

const prisma = new PrismaClient();

async function main() {
  await seedCuisines(prisma);
  const { devUser } = await seedUsers(prisma);
  await seedRecipes(prisma, devUser.id);
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
