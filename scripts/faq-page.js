(() => {
  const fallbackFaqs = [
    {
      q: "Is the bus actually bigger on the inside?",
      a: "Technically no, but perceptually yes. Portal 2 creates a recursive spatial loop that adds approximately 400 square feet of perceived volume. Bring a compass. It won't help, but bring one anyway.",
    },
    {
      q: "What do Mini Slabbers eat?",
      a: "Attention, mostly. But also dried apricots and small screws. Do not feed them after midnight. We don't know what happens, and we don't want to find out.",
    },
    {
      q: "Can I drive the bus?",
      a: "No. The bus drives itself when it wants to move. We haven't figured out how to stop it from relocating to the Salton Sea every third Tuesday. We just move our workshops.",
    },
    {
      q: "Are the portals dangerous?",
      a: "Only if you're not paying attention. Portal 5 temporarily inverted a visitor's gravity last month. He's fine now, but he has to wear weighted boots on Tuesdays.",
    },
    {
      q: "Do you have WiFi?",
      a: "We have Portal 6. It's faster than WiFi but requires you to think in binary. Your phone won't work here anyway. The Navy's radar interferes with everything except carrier pigeons.",
    },
    {
      q: "What's the deal with the bathroom?",
      a: "It's a composting toilet that opens to a pocket dimension. We don't know where it goes. Please don't put anything in it that you want to see again, including regrets.",
    },
    {
      q: "Can I live in the bus?",
      a: "You can try. Three people have. Two left voluntarily. One became a Mini Slabber. We don't talk about him, but he seems happy.",
    },
    {
      q: "Is this legal?",
      a: "Define legal. Define reality. Define 'is.' We pay taxes to the Salton Sea Authority, which may or may not exist.",
    },
  ];

  let faqs = [...fallbackFaqs];

  function normalizeFaqs(value) {
    const source = Array.isArray(value?.faqs) ? value.faqs : value;
    if (!Array.isArray(source)) return [];

    return source
      .map((item) => ({
        q: String(item?.q || item?.question || '').trim(),
        a: String(item?.a || item?.answer || '').trim(),
      }))
      .filter((item) => item.q && item.a)
      .filter((item) => !item.q.includes('document.addEventListener('));
  }

  function shuffleFaqs() {
    faqs = [...faqs]
      .map((faq) => ({ sortKey: Math.random(), faq }))
      .sort((a, b) => a.sortKey - b.sortKey)
      .map((entry) => entry.faq);
    renderFaqs();
  }

  function applyMonthlyFlip() {
    const now = new Date();
    document.body.classList.toggle('faq-flipped', now.getDate() === 20);
  }

  function renderFaqs() {
    const container = document.getElementById('faq-container');
    if (!container) return;

    container.innerHTML = faqs
      .map(
        (faq, idx) => `
        <div class="glass rounded-lg cursor-pointer" data-faq-index="${idx}">
          <div class="p-6 flex justify-between items-center">
            <h3 class="text-lg text-white pr-8">${faq.q}</h3>
            <span class="text-cyan-400 text-2xl transition-transform duration-300" id="icon-${idx}">+</span>
          </div>
          <div class="answer px-6 pb-6 text-gray-400 leading-relaxed" id="answer-${idx}">
            ${faq.a}
          </div>
        </div>
      `,
      )
      .join('');
  }

  function toggleFaq(idx) {
    const answer = document.getElementById(`answer-${idx}`);
    const icon = document.getElementById(`icon-${idx}`);
    if (!answer || !icon) return;

    const open = answer.classList.contains('open');

    document.querySelectorAll('.answer').forEach((el) => el.classList.remove('open'));
    document.querySelectorAll('[id^="icon-"]').forEach((el) => {
      el.style.transform = 'rotate(0deg)';
    });

    if (!open) {
      answer.classList.add('open');
      icon.style.transform = 'rotate(45deg)';
    }
  }

  async function loadFaqs() {
    try {
      const response = await fetch('/data/faq.json', { cache: 'no-store' });
      if (!response.ok) {
        renderFaqs();
        return;
      }

      const payload = await response.json();
      const loadedFaqs = normalizeFaqs(payload);
      if (loadedFaqs.length) {
        faqs = loadedFaqs;
      }
    } catch (error) {
      console.error('Falling back to built-in FAQ content:', error);
    }

    renderFaqs();
  }

  function init() {
    const container = document.getElementById('faq-container');
    if (!container) return;

    container.addEventListener('click', (event) => {
      const card = event.target.closest('[data-faq-index]');
      if (!card) return;
      toggleFaq(Number(card.dataset.faqIndex));
    });

    window.addEventListener('pageshow', shuffleFaqs);
    window.addEventListener('popstate', shuffleFaqs);

    applyMonthlyFlip();
    loadFaqs().then(shuffleFaqs);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
