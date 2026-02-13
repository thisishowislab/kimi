const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { items, type } = req.body;
    
    const lineItems = items.map(item => ({
      price: item.stripePriceId,
      quantity: item.quantity || 1,
    }));

    const needsShipping = type === 'product';

    const sessionConfig = {
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.URL || 'https://formagicaluseonly.com'}/success.html`,
      cancel_url: `${process.env.URL || 'https://formagicaluseonly.com'}/cancel.html`,
    };

    if (needsShipping) {
      // Use your existing shipping rate IDs
      const shippingRates = [];
      
      if (process.env.STRIPE_SHIPPING_RATE_GROUND) {
        shippingRates.push({ shipping_rate: process.env.STRIPE_SHIPPING_RATE_GROUND });
      }
      if (process.env.STRIPE_SHIPPING_RATE_INTL) {
        shippingRates.push({ shipping_rate: process.env.STRIPE_SHIPPING_RATE_INTL });
      }
      
      // Fallback if no env vars set
      if (shippingRates.length === 0) {
        shippingRates.push({
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: 1500, currency: 'usd' },
            display_name: 'Desert Post',
            delivery_estimate: { minimum: { unit: 'business_day', value: 5 }, maximum: { unit: 'business_day', value: 10 } }
          }
        });
      }
      
      sessionConfig.shipping_address_collection = { allowed_countries: ['US', 'CA', 'MX'] };
      sessionConfig.shipping_options = shippingRates;
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    res.json({ url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
      })
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
