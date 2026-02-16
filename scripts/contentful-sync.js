import { mkdir, writeFile } from 'node:fs/promises';

const CONTENT_TYPES = {
  products: 'NVpVj8LwkehFy7TfbDiCu',
  tours: '70oPrCNwUtqI05YuxYLW9D',
  donations: '5YmWnOsbaqjCb367hRLpST',
  posts: 'blog',
};

function toHttps(url) {
  if (!url) return '';
  return url.startsWith('//') ? `https:${url}` : url;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function slugify(value = '') {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function readLocalized(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  if ('en-US' in value) return value['en-US'];
  if ('en' in value) return value.en;
  return value;
}

function parseJsonObject(value) {
  if (typeof value !== 'string') return value;

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function pickPriceId(data = {}) {
  return (
    data.stripePriceId ||
    data.priceId ||
    data.priceID ||
    data.stripe_price_id ||
    ''
  );
}

function normalizeVariantMap(rawVariantUx = {}, defaultVariant) {
  const variantUx = parseJsonObject(readLocalized(rawVariantUx) || {});
  const fromNested = variantUx.variants && typeof variantUx.variants === 'object' ? variantUx.variants : null;

  const directMap = {};
  for (const [key, value] of Object.entries(variantUx)) {
    if (key === 'variants' || key === 'defaultKey' || key === 'defaultVariant') continue;
    const isObjectVariant = value && typeof value === 'object' && !Array.isArray(value);
    const isStringVariant = typeof value === 'string';
    if (isObjectVariant || isStringVariant) {
      directMap[key] = value;
    }
  }

  const source = fromNested || directMap;
  const variants = {};

  for (const [key, raw] of Object.entries(source)) {
    const data = parseJsonObject(readLocalized(raw) || {});
    variants[key] = {
      label: data.label || data.name || key,
      description: data.description || '',
      price: toNumber(data.price),
      imageIndex: toNumber(data.imageIndex),
      stripePriceId: pickPriceId(data),
    };
  }

  if (Object.keys(variants).length === 0) {
    variants.default = {
      label: 'Default',
      description: '',
      price: toNumber(variantUx.price),
      imageIndex: 0,
      stripePriceId: pickPriceId(variantUx),
    };
  }

  const explicitDefault = defaultVariant || variantUx.defaultKey || variantUx.defaultVariant;
  const defaultKey = variants[explicitDefault] ? explicitDefault : Object.keys(variants)[0];

  return { variants, defaultKey };
}

function mapAssetUrl(asset) {
  const file = readLocalized(asset?.fields?.file) || {};
  return toHttps(file.url || '');
}

async function fetchEntries({ space, environment, token, contentType, order, include = 2, limit = 1000 }) {
  const url = new URL(`https://cdn.contentful.com/spaces/${space}/environments/${environment}/entries`);
  url.searchParams.set('content_type', contentType);
  url.searchParams.set('include', String(include));
  url.searchParams.set('limit', String(limit));
  if (order) url.searchParams.set('order', order);

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(`Contentful request failed (${contentType}): ${response.status} ${response.statusText} ${JSON.stringify(payload)}`);
  }

  return payload;
}

function transformProducts(payload) {
  const assets = new Map((payload?.includes?.Asset || []).map((asset) => [asset?.sys?.id, asset]));

  return (payload.items || []).map((entry) => {
    const f = readLocalized(entry.fields) || {};

    const imageRefs = readLocalized(f.productImages) || readLocalized(f.images) || [];
    const images = (Array.isArray(imageRefs) ? imageRefs : [])
      .map((link) => assets.get(link?.sys?.id))
      .map(mapAssetUrl)
      .filter(Boolean);

    const variantSource = f.variantUx || f.variants || f.variantJson || f.variantJSON || {};
    const { variants, defaultKey } = normalizeVariantMap(variantSource, f.defaultVariant || f.defaultKey);

    return {
      slug: f.slug || slugify(f.productName) || entry?.sys?.id,
      productName: f.productName || 'Untitled',
      productDescription: f.productDescription || '',
      category: f.category || '',
      sku: f.sku || '',
      tags: Array.isArray(f.tags) ? f.tags : [],
      images,
      variants,
      defaultKey,
      careInstructions: f.careInstructions || '',
      disclaimer: f.disclaimer || '',
      requiresShipping: true,
    };
  });
}

function transformTours(payload) {
  const assets = new Map((payload?.includes?.Asset || []).map((asset) => [asset?.sys?.id, asset]));

  return (payload.items || []).map((entry) => {
    const f = readLocalized(entry.fields) || {};
    const tourImage = assets.get(readLocalized(f.tourImage)?.sys?.id) || readLocalized(f.tourImage);

    return {
      slug: f.slug || slugify(f.tourName) || entry?.sys?.id,
      tourName: f.tourName || 'Untitled Tour',
      tourDescription: f.tourDescription || '',
      image: mapAssetUrl(tourImage),
      stripePriceId: pickPriceId(f),
      stripePriceId: f.stripePriceId || '',
      price: toNumber(f.price),
      requiresShipping: false,
    };
  });
}

function transformDonations(payload) {
  return (payload.items || []).map((entry) => {
    const f = readLocalized(entry.fields) || {};

    return {
      slug: f.slug || slugify(f.tierName) || entry?.sys?.id,
      tierName: f.tierName || 'Untitled Tier',
      tierDescription: f.tierDescription || '',
      stripePriceId: pickPriceId(f),
      stripePriceId: f.stripePriceId || '',
      price: toNumber(f.price),
      requiresShipping: false,
    };
  });
}

function transformPosts(payload) {
  const assets = new Map((payload?.includes?.Asset || []).map((asset) => [asset?.sys?.id, asset]));

  return (payload.items || []).map((entry) => {
    const f = readLocalized(entry.fields) || {};
    const hero = assets.get(readLocalized(f.heroImage)?.sys?.id) || readLocalized(f.heroImage);

    return {
      slug: f.slug || slugify(f.title) || entry?.sys?.id,
      title: f.title || 'Untitled',
      publishedDate: f.publishedDate || '',
      date: f.publishedDate || '',
      excerpt: f.excerpt || '',
      body: f.body || '',
      heroImage: mapAssetUrl(hero),
      tags: Array.isArray(f.tags) ? f.tags : [],
    };
  });
}

export async function buildContentData(options = {}) {
  const space = options.space || process.env.CONTENTFUL_SPACE_ID;
  const environment = options.environment || process.env.CONTENTFUL_ENVIRONMENT || 'master';
  const token =
    options.token ||
    process.env.CONTENTFUL_DELIVERY_TOKEN ||
    process.env.CONTENTFUL_TOKEN ||
    process.env.CONTENTFUL_ACCESS_TOKEN;

  if (!space || !token) {
    throw new Error('Missing env vars: CONTENTFUL_SPACE_ID and CONTENTFUL_DELIVERY_TOKEN (or CONTENTFUL_TOKEN / CONTENTFUL_ACCESS_TOKEN).');
  }

  const [productsRaw, toursRaw, donationsRaw, postsRaw] = await Promise.all([
    fetchEntries({ space, environment, token, contentType: CONTENT_TYPES.products, include: 2 }),
    fetchEntries({ space, environment, token, contentType: CONTENT_TYPES.tours, include: 2 }),
    fetchEntries({ space, environment, token, contentType: CONTENT_TYPES.donations, include: 0, order: 'fields.price' }),
    fetchEntries({ space, environment, token, contentType: CONTENT_TYPES.posts, include: 2, order: '-fields.publishedDate' }),
  ]);

  const data = {
    products: transformProducts(productsRaw),
    tours: transformTours(toursRaw),
    donations: transformDonations(donationsRaw),
    posts: transformPosts(postsRaw),
  };

  await mkdir('data', { recursive: true });
  await Promise.all([
    writeFile('data/products.json', JSON.stringify(data.products, null, 2), 'utf8'),
    writeFile('data/tours.json', JSON.stringify(data.tours, null, 2), 'utf8'),
    writeFile('data/donations.json', JSON.stringify(data.donations, null, 2), 'utf8'),
    writeFile('data/posts.json', JSON.stringify(data.posts, null, 2), 'utf8'),
  ]);

  return data;
}
