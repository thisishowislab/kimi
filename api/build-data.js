import { buildContentData } from '../scripts/contentful-sync.js';

export default async function handler(req, res) {
  if (req.method && req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const data = await buildContentData();
    return res.status(200).json({
      built: true,
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

if (process.argv[1] && process.argv[1].endsWith('api/build-data.js')) {
  buildContentData()
    .then((data) => {
      console.log(
        `Built: ${data.products.length} products, ${data.tours.length} tours, ${data.donations.length} donations, ${data.posts.length} posts`
      );
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
