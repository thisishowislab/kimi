(() => {
  function toggleMobileNav() {
    document.getElementById('mobile-nav')?.classList.toggle('hidden');
  }

  function getLocalized(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
    if ('en-US' in value) return value['en-US'];
    if ('en' in value) return value.en;
    return value;
  }

  function pickDonationPriceId(tier = {}) {
    const t = getLocalized(tier) || {};

    return (
      getLocalized(t.stripePriceId) ||
      getLocalized(t.priceId) ||
      getLocalized(t.priceID) ||
      getLocalized(t.stripe_price_id) ||
      ''
    );
  }

  function normalizeTiers(payload) {
    const source = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.donations)
        ? payload.donations
        : [];

    return source.map((tier) => {
      const t = getLocalized(tier) || {};
      return {
        tierName: getLocalized(t.tierName) || getLocalized(t.name) || 'Untitled Tier',
        tierDescription: getLocalized(t.tierDescription) || getLocalized(t.description) || '',
        price: Number(getLocalized(t.price) || 0),
        stripePriceId: pickDonationPriceId(t),
      };
    });
  }

  async function load() {
    const list = document.getElementById('tiers-list');
    if (!list) return;

    try {
      const response = await fetch('/data/donations.json', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Failed loading donations.json (${response.status})`);
      }

      const payload = await response.json();
      const tiers = normalizeTiers(payload);

      if (!tiers.length) {
        list.innerHTML = '<p class="text-gray-600 col-span-2 text-center py-12">No donation tiers available.</p>';
        return;
      }

      list.innerHTML = tiers
        .map((tier) => {
          const priceId = tier.stripePriceId;
          return `
            <div class="tier-card glass p-8 rounded-lg text-center">
              <h3 class="serif text-2xl text-white mb-4">${tier.tierName}</h3>
              <p class="text-gray-400 mb-6 text-sm">${tier.tierDescription}</p>
              <div class="text-4xl text-white mb-6">$${tier.price}</div>
              <button onclick="window.startDonationCheckout('${priceId}')" ${priceId ? '' : 'disabled'} class="w-full py-3 border border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-white transition uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed">
                Contribute
              </button>
              <p class="text-[10px] text-gray-600 mt-4 uppercase tracking-widest">No shipping • Direct support</p>
            </div>
          `;
        })
        .join('');
    } catch (error) {
      console.error(error);
      list.innerHTML = '<p class="text-red-400 col-span-2 text-center py-12">Error loading donation tiers.</p>';
    }
  }

  async function startDonationCheckout(priceId) {
    if (!priceId) {
      console.error('Donation tier missing Stripe price ID.');
      return;
    }

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ stripePriceId: priceId, quantity: 1 }],
          type: 'donation',
          shipping: false,
        }),
      });

      const payload = await response.json();
      if (payload.url) {
        window.location = payload.url;
        return;
      }

      alert(payload.error || 'Unable to start donation checkout right now.');
      console.error('Donation checkout failed:', payload.error || 'Unknown error');
    } catch (error) {
      alert('Unable to start donation checkout right now.');
      console.error('Donation checkout request failed:', error);
    }
  }

  window.toggleMobileNav = toggleMobileNav;
  window.startDonationCheckout = startDonationCheckout;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load);
  } else {
    load();
  }
})();
