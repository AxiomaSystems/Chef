const { existsSync, readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { PrismaClient } = require("../generated/prisma");
const { seedCuisines } = require("./seed/cuisines");
const { seedUsers } = require("./seed/users");
const { seedRecipes } = require("./seed/recipes");
const { seedIngredients } = require("./seed/ingredients");

function loadEnvFile(path) {
  if (!existsSync(path)) {
    return;
  }

  for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^["']|["']$/g, "");

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(resolve(__dirname, "../../../.env"));
loadEnvFile(resolve(__dirname, "../.env"));

const prisma = new PrismaClient();

async function main() {
  await seedCuisines(prisma);
  const { devUser } = await seedUsers(prisma);
  await seedRecipes(prisma, devUser.id);
  await seedIngredients(prisma, devUser.id);
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
