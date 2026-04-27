const { readFileSync, writeFileSync } = require("node:fs");
const { resolve, extname } = require("node:path");

const IMAGES_DIR = resolve(__dirname, "../seed/images");
const SEED_FILE = resolve(__dirname, "../seed/data/system-recipes.js");

const MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function toDataUri(file) {
  const ext = extname(file).toLowerCase();
  const mime = MIME[ext] ?? "image/jpeg";
  return `data:${mime};base64,${readFileSync(resolve(IMAGES_DIR, file)).toString("base64")}`;
}

const entries = [
  { name: "Aji de gallina", file: "aji-de-gallina.jpg" },
  { name: "Lomo saltado",   file: "lomo-saltoda.jpg" },
  { name: "Ceviche",        file: "ceviche.jpg" },
];

let src = readFileSync(SEED_FILE, "utf8");

for (const { name, file } of entries) {
  const uri = toDataUri(file);
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Skip if already patched
  if (src.includes(`coverImageUrl: "data:`) && src.includes(name)) {
    const nameIdx = src.indexOf(`name: "${name}"`);
    if (nameIdx !== -1 && src.slice(nameIdx, nameIdx + 200).includes("coverImageUrl")) {
      console.log(`SKIP  ${name} — already has coverImageUrl`);
      continue;
    }
  }

  src = src.replace(
    new RegExp(`(name: "${escapedName}",)`),
    `$1\n    coverImageUrl: "${uri}",`
  );
  console.log(`OK    ${name}`);
}

writeFileSync(SEED_FILE, src, "utf8");
console.log("Done — system-recipes.js updated.");
