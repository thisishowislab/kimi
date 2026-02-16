import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

function getOrigin(req) {
  const originHeader = req.headers.origin;
  if (originHeader) return originHeader;

  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  if (host) return `${proto}://${host}`;

  return process.env.URL || 'https://formagicaluseonly.com';
}

function getAllowedOrigins() {
  const envOrigins = process.env.CHECKOUT_ALLOWED_ORIGINS || '';
  return envOrigins
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

function pickCorsOrigin(reqOrigin, allowedOrigins) {
  if (!allowedOrigins.length) return '*';
  if (reqOrigin && allowedOrigins.includes(reqOrigin)) return reqOrigin;
  return allowedOrigins[0];
}

function pickStripePriceId(item = {}) {
  return (
    item.stripePriceId ||
    item.priceId ||
    item.priceID ||
    item.stripe_price_id ||
    ''
  );
}

export default async function handler(req, res) {
  const allowedOrigins = getAllowedOrigins();
  const corsOrigin = pickCorsOrigin(req.headers.origin, allowedOrigins);
  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

function getOrigin(req) {
  const originHeader = req.headers.origin;
  if (originHeader) return originHeader;

  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  if (host) return `${proto}://${host}`;

  return process.env.URL || 'https://formagicaluseonly.com';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: 'Stripe is not configured' });
  }

  try {
    const { items = [], lineItems = [], type } = req.body || {};
    const rawItems = Array.isArray(items) && items.length ? items : lineItems;

    const lineItemsForStripe = rawItems
      .map((item) => ({
        ...item,
        stripePriceId: pickStripePriceId(item),
      }))
    const { items = [], type } = req.body || {};

    const lineItems = items
      .filter((item) => typeof item?.stripePriceId === 'string' && item.stripePriceId.trim())
      .map((item) => ({
        price: item.stripePriceId,
        quantity: Number.isFinite(Number(item.quantity)) && Number(item.quantity) > 0 ? Number(item.quantity) : 1,
      }));

    if (!lineItemsForStripe.length) {
    if (!lineItems.length) {
      return res.status(400).json({ error: 'No valid Stripe price IDs were provided.' });
    }

    const needsShipping = type === 'product';
    const origin = getOrigin(req);

    const sessionConfig = {
      payment_method_types: ['card'],
      line_items: lineItemsForStripe,
      mode: 'payment',
      success_url: `${origin}/success.html`,
      cancel_url: `${origin}/cancel.html`,
      billing_address_collection: 'auto',
      allow_promotion_codes: true,
    };

    if (needsShipping) {
      const shippingRates = [];

      if (process.env.STRIPE_SHIPPING_RATE_GROUND) {
        shippingRates.push({ shipping_rate: process.env.STRIPE_SHIPPING_RATE_GROUND });
      }
      if (process.env.STRIPE_SHIPPING_RATE_INTL) {
        shippingRates.push({ shipping_rate: process.env.STRIPE_SHIPPING_RATE_INTL });
      }

      if (!shippingRates.length) {
        shippingRates.push({
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: 1500, currency: 'usd' },
            display_name: 'Desert Post',
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 5 },
              maximum: { unit: 'business_day', value: 10 },
            },
          },
        });
      }

      sessionConfig.shipping_address_collection = { allowed_countries: ['US', 'CA', 'MX'] };
      sessionConfig.shipping_options = shippingRates;
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);
    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}
