const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { items, type } = req.body; // type: 'product' | 'donation' | 'tour'
    
    const lineItems = items.map(item => {
      // If you have a stripePriceId, use it directly (better)
      if (item.stripePriceId && item.stripePriceId.startsWith('price_')) {
        return {
          price: item.stripePriceId,
          quantity: item.qty || 1
        };
      }
      
      // Otherwise create dynamic price
      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.name,
            description: item.variantLabel || undefined,
          },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.qty || 1,
      };
    });

    // Determine shipping needs
    const needsShipping = type === 'product'; // Only products need shipping
    
    const sessionConfig = {
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.URL}/success.html`,
      cancel_url: `${process.env.URL}/cancel.html`,
      metadata: { type }
    };

    if (needsShipping) {
      sessionConfig.shipping_address_collection = {
        allowed_countries: ['US', 'CA']
      };
      sessionConfig.shipping_options = [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: 1500, currency: 'usd' },
            display_name: 'Desert Courier (5-10 days)',
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 5 },
              maximum: { unit: 'business_day', value: 10 }
            }
          }
        }
      ];
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);
    res.json({ url: session.url });
    
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ error: err.message });
  }
};
