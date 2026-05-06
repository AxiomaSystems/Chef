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

function encodeSupabasePasswordAtSigns(value) {
  if (!value) {
    return value;
  }

  try {
    new URL(value);
    return value;
  } catch {
    // Supabase passwords can contain "@".
    // If copied unescaped, URL parsing treats it as another host separator.
    const schemeSeparatorIndex = value.indexOf("://");
    const lastAtIndex = value.lastIndexOf("@");

    if (schemeSeparatorIndex < 0 || lastAtIndex < 0) {
      return value;
    }

    const authStartIndex = schemeSeparatorIndex + 3;
    const authSegment = value.slice(authStartIndex, lastAtIndex);
    const passwordSeparatorIndex = authSegment.indexOf(":");

    if (passwordSeparatorIndex < 0) {
      return value;
    }

    const username = authSegment.slice(0, passwordSeparatorIndex);
    const password = authSegment.slice(passwordSeparatorIndex + 1);
    const encodedPassword = password.replace(/@/g, "%40");

    return `${value.slice(0, authStartIndex)}${username}:${encodedPassword}${value.slice(lastAtIndex)}`;
  }
}

loadEnvFile(resolve(__dirname, "../../../.env"));

process.env.DATABASE_URL =
  encodeSupabasePasswordAtSigns(process.env.SUPABASE_DATABASE_URL) ??
  encodeSupabasePasswordAtSigns(process.env.DATABASE_URL);
process.env.DIRECT_URL =
  encodeSupabasePasswordAtSigns(process.env.SUPABASE_DIRECT_URL) ??
  encodeSupabasePasswordAtSigns(process.env.DIRECT_URL) ??
  process.env.DATABASE_URL;

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
