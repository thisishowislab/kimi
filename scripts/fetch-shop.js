// scripts/fetch-shop.js
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const SPACE = process.env.CONTENTFUL_SPACE_ID;
const ENV = process.env.CONTENTFUL_ENVIRONMENT || "master";

// accept either name so you don't have to keep renaming env vars
const TOKEN =
  process.env.CONTENTFUL_DELIVERY_TOKEN ||
  process.env.CONTENTFUL_TOKEN ||
  process.env.CONTENTFUL_ACCESS_TOKEN;

// Your Marketplace Product Content Type ID
const CONTENT_TYPE_ID = "NVpVj8LwkehFy7TfbDiCu";

// Output file name that your current oldshop expects:
const OUT_FILE = path.join("data", "products.json");

function toHttps(url) {
  if (!url) return null;
  return url.startsWith("//") ? `https:${url}` : url;
}

function num(x, fallback = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

async function main() {
  if (!SPACE || !TOKEN) {
    throw new Error(
      "Missing env vars. Need CONTENTFUL_SPACE_ID and a Contentful token (CONTENTFUL_DELIVERY_TOKEN or CONTENTFUL_TOKEN)."
    );
  }

  const url = new URL(
    `https://cdn.contentful.com/spaces/${SPACE}/environments/${ENV}/entries`
  );
  url.searchParams.set("content_type", CONTENT_TYPE_ID);
  url.searchParams.set("include", "2");
  url.searchParams.set("limit", "1000");

  const r = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });

  const data = await r.json();

  if (!r.ok) {
    console.error("Contentful error response:", data);
    throw new Error(`Contentful request failed: ${r.status} ${r.statusText}`);
  }

  // Build Asset map for images
  const assets = new Map();
  for (const a of data?.includes?.Asset || []) {
    assets.set(a?.sys?.id, a);
  }

  const products = (data.items || []).map((entry) => {
    const f = entry.fields || {};

    // Images
    const imageLinks = Array.isArray(f.productImages) ? f.productImages : [];
    const images = imageLinks
      .map((link) => link?.sys?.id)
      .map((id) => {
        const asset = assets.get(id);
        const file = asset?.fields?.file;
        return toHttps(file?.url);
      })
      .filter(Boolean);

    // Variants: you said you store dropdown config in variantUx (Object)
    // We'll support either:
    //  - variantUx.variants + variantUx.defaultKey
    //  - OR a simpler shape like variantUx.options array
    const ux = f.variantUx || {};
    let variants = ux?.variants;
    let defaultKey = ux?.defaultKey;

    // If variants not provided, create a safe default
    if (!variants || typeof variants !== "object") {
      variants = {
        default: {
          price: num(ux?.price, 0),
          imageIndex: 0,
        },
      };
      defaultKey = "default";
    }

    // Ensure defaultKey is valid
    if (!defaultKey || !variants[defaultKey]) {
      defaultKey = Object.keys(variants)[0] || "default";
    }

    // Normalize each variant to { price:number, imageIndex:number }
    for (const k of Object.keys(variants)) {
      variants[k] = {
        price: num(variants[k]?.price, 0),
        imageIndex: num(variants[k]?.imageIndex, 0),
      };
    }

    // Slug: use your field if present, otherwise entry id (stable)
    const slug = f.slug || entry?.sys?.id;

    return {
      productName: f.productName || "Untitled",
      category: f.category || "Uncategorized",
      slug,
      variants,
      defaultKey,
      images,
    };
  });

  await mkdir("data", { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(products, null, 2), "utf8");

  console.log(`Wrote ${OUT_FILE} with ${products.length} products.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
