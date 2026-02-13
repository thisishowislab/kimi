const contentful = require('contentful').createClient;
const fs = require('fs').promises;
const path = require('path');

const client = contentful({
  space: process.env.CONTENTFUL_SPACE_ID || 'nfc5otagjk9d',
  accessToken: process.env.CONTENTFUL_ACCESS_TOKEN || 'JFsw_veGXggiZ9v-GrBalkeJlyaVtAp7rFrCvc5rvnE'
});

async function build() {
  await fs.mkdir('data', { recursive: true });

  // Fetch all content types
  const [products, tours, donations, posts] = await Promise.all([
    client.getEntries({ content_type: 'NVpVj8LwkehFy7TfbDiCu', include: 2 }),
    client.getEntries({ content_type: '70oPrCNwUtqI05YuxYLW9D', include: 2 }),
    client.getEntries({ content_type: '5YmWnOsbaqjCb367hRLpST' }),
    client.getEntries({ content_type: 'blog', order: '-fields.publishedDate' })
  ]);

  // Transform products
  const productData = products.items.map(p => {
    const f = p.fields;
    return {
      slug: f.slug || f.productName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      productName: f.productName,
      productDescription: f.productDescription,
      category: f.category,
      sku: f.sku,
      tags: f.tags || [],
      images: (f.images || []).map(img => `https:${img.fields.file.url}`),
      variants: f.variantUx || {},
      defaultKey: f.defaultVariant || Object.keys(f.variantUx || {})[0] || '',
      careInstructions: f.careInstructions,
      disclaimer: f.disclaimer,
      requiresShipping: true
    };
  });

  // Transform tours
  const tourData = tours.items.map(t => {
    const f = t.fields;
    return {
      slug: f.slug || f.tourName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      tourName: f.tourName,
      tourDescription: f.tourDescription,
      image: f.tourImage ? `https:${f.tourImage.fields.file.url}` : '',
      stripePriceId: f.stripePriceId,
      price: f.price,
      requiresShipping: false
    };
  });

  // Transform donations
  const donationData = donations.items.map(d => {
    const f = d.fields;
    return {
      slug: f.tierName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      tierName: f.tierName,
      tierDescription: f.tierDescription,
      stripePriceId: f.stripePriceId,
      price: f.price,
      requiresShipping: false
    };
  });

  // Transform posts
  const postData = posts.items.map(p => {
    const f = p.fields;
    return {
      slug: f.slug,
      title: f.title,
      publishedDate: f.publishedDate,
      excerpt: f.excerpt,
      body: f.body,
      heroImage: f.heroImage ? `https:${f.heroImage.fields.file.url}` : '',
      tags: f.tags || []
    };
  });

  // Write files
  await fs.writeFile('data/products.json', JSON.stringify(productData, null, 2));
  await fs.writeFile('data/tours.json', JSON.stringify(tourData, null, 2));
  await fs.writeFile('data/donations.json', JSON.stringify(donationData, null, 2));
  await fs.writeFile('data/posts.json', JSON.stringify(postData, null, 2));

  console.log(`Built: ${productData.length} products, ${tourData.length} tours, ${donationData.length} donations, ${postData.length} posts`);
}

build().catch(console.error);
