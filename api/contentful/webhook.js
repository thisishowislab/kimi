import crypto from 'node:crypto';

function timingSafeEqual(a = '', b = '') {
  const aBuf = Buffer.from(String(a));
  const bBuf = Buffer.from(String(b));
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export default async function handler(req, res) {
  const topic = req.headers['x-contentful-topic'];
  const providedSecret = req.headers['x-webhook-secret'];
  const expectedSecret = process.env.CONTENTFUL_WEBHOOK_SECRET;

  if (!topic) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!expectedSecret) {
    return res.status(500).json({ error: 'Webhook secret is not configured' });
  }

  if (!timingSafeEqual(providedSecret, expectedSecret)) {
    return res.status(401).json({ error: 'Invalid webhook secret' });
  }

  if (process.env.VERCEL_DEPLOY_HOOK) {
    await fetch(process.env.VERCEL_DEPLOY_HOOK, { method: 'POST' });
  }

  return res.json({ rebuilt: true });
}
