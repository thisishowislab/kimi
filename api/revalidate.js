import { buildContentData } from '../scripts/contentful-sync.js';

export default async function handler(req, res) {
  const secret = req.query?.secret;
  if (secret !== process.env.REVALIDATE_SECRET) {
    return res.status(401).json({ error: 'Invalid secret' });
  }

  try {
    const data = await buildContentData();
    return res.status(200).json({
      revalidated: true,
      counts: {
        products: data.products.length,
        tours: data.tours.length,
        donations: data.donations.length,
        posts: data.posts.length,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
