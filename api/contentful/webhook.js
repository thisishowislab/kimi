// Receives Contentful publish events and triggers rebuild
export default async function handler(req, res) {
  // Verify webhook secret if you set one
  const topic = req.headers['x-contentful-topic'];
  
  if (!topic) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Trigger Vercel deploy hook to rebuild with new data
  if (process.env.VERCEL_DEPLOY_HOOK) {
    await fetch(process.env.VERCEL_DEPLOY_HOOK, { method: 'POST' });
  }

  res.json({ rebuilt: true });
}
