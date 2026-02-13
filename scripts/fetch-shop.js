// scripts/fetch-shop.js
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const SPACE = process.env.CONTENTFUL_SPACE_ID;
const TOKEN = process.env.CONTENTFUL_DELIVERY_TOKEN;
const ENV = process.env.CONTENTFUL_ENVIRONMENT || "master";

// Your Marketplace Product *Content Type* ID:
const CONTENT_TYPE_ID = "NVpVj8LwkehFy7TfbDiCu";

async function main() {
  if (!SPACE || !TOKEN) {
    throw new Error(
      "Missing env vars. Need CONTENTFUL_SPACE_ID and CONTENTFUL_DELIVERY_TOKEN."
    );
  }

  const url = new URL(
    `https://cdn.contentful.com/spaces/${SPACE}/environments/${ENV}/entries`
  );
  url.searchParams.set("content_type", CONTENT_TYPE_ID);
  url.searchParams.set("include", "2");      // include linked assets
  url.searchParams.set("limit", "1000");     // increase if you have lots

  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });

  const data = await r.json();

  if (!r.ok) {
    console.error("Contentful error response:", data);
    throw new Error(`Contentful request failed: ${r.status} ${r.statusText}`);
  }

  // Ensure data/ exists
  await mkdir("data", { recursive: true });

  // Write snapshot
  const outPath = path.join("data", "shop.json");
  await writeFile(outPath, JSON.stringify(data, null, 2), "utf8");

  console.log(`Wrote ${outPath} with ${data.items?.length ?? 0} items.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
