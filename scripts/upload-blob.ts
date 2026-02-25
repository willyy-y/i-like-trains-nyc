import { put } from "@vercel/blob";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(import.meta.dir, "..");
const PUBLIC = path.join(ROOT, "apps", "client", "public");

const files = [
  "data/trips/2026-02-24.json",
  "data/ridership/2024-03-12.json",
  "data/ridership/2024-03-16.json",
  "data/ridership/2023-12-31.json",
];

async function main() {
  for (const file of files) {
    const filePath = path.join(PUBLIC, file);
    const content = readFileSync(filePath);
    const sizeMB = (content.length / 1024 / 1024).toFixed(1);

    console.log(`Uploading ${file} (${sizeMB} MB)...`);

    const blob = await put(file, content, {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
    });

    console.log(`  -> ${blob.url}`);
  }

  console.log("\nDone! Update DATA_BASE_URL in config.ts with the blob base URL.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
