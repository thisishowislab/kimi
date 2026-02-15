import { buildContentData } from './scripts/contentful-sync.js';

buildContentData()
  .then((data) => {
    console.log(
      `Built data files: ${data.products.length} products, ${data.tours.length} tours, ${data.donations.length} donations, ${data.posts.length} posts.`
    );
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
