const { readFileSync, existsSync } = require("node:fs");
const { resolve, extname } = require("node:path");
const { PrismaClient } = require("../../generated/prisma");

const prisma = new PrismaClient();

const IMAGES_DIR = resolve(__dirname, "../seed/images");

const MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function toDataUri(filePath) {
  const ext = extname(filePath).toLowerCase();
  const mime = MIME[ext] ?? "image/jpeg";
  const data = readFileSync(filePath).toString("base64");
  return `data:${mime};base64,${data}`;
}

const recipeImages = [
  { name: "Aji de gallina", file: "aji-de-gallina.jpg" },
  { name: "Lomo saltado",   file: "lomo-saltoda.jpg" },
  { name: "Ceviche",        file: "ceviche.jpg" },
];

async function main() {
  for (const { name, file } of recipeImages) {
    const filePath = resolve(IMAGES_DIR, file);
    if (!existsSync(filePath)) {
      console.warn(`SKIP  ${name} — file not found: ${file}`);
      continue;
    }

    const coverImageUrl = toDataUri(filePath);
    const result = await prisma.baseRecipe.updateMany({
      where: { name, isSystemRecipe: true },
      data: { coverImageUrl },
    });
    console.log(`OK    ${name} — updated ${result.count} row(s)`);
  }
}

main()
  .then(() => console.log("Done."))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
