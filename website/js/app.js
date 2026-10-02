/* ==========================================================================
   APP.JS - Main Credify Website Script
   ========================================================================== */

const servicesData = [
  {
    id: 'discord-members-online',
    category: 'growth',
    title: 'Online Discord Members',
    desc: 'High-quality realistic online status members. Boosts server activity appearance and social credibility.',
    price: '$7.99',
    unit: 'per 1k members',
    icon: 'fa-solid fa-users',
    badge: 'Popular',
    featured: true,
    features: [
      'Realistic online badges',
      'Instant queue dispatch',
      'High retention safety rate',
      'No server admin perms needed'
    ]
  },
  {
    id: 'discord-members-offline',
    category: 'growth',
    title: 'Offline Discord Members',
    desc: 'Fast, budget-friendly member count booster to reach your member milestone thresholds quickly.',
    price: '$4.99',
    unit: 'per 1k members',
    icon: 'fa-solid fa-user-group',
    badge: 'Best Value',
    featured: false,
    features: [
      'Fast delivery speed',
      'Clean profile pictures',
      'Affordable growth tier',
      'Works on any public server'
    ]
  },
  {
    id: 'server-boosts-1m',
    category: 'boosts',
    title: '14x Server Boosts (1 Month)',
    desc: 'Instantly elevates your Discord guild to Level 3. Unlocks 384Kbps voice, 100MB uploads, and vanity URL.',
    price: '$14.99',
    unit: 'Level 3 unlocked',
    icon: 'fa-solid fa-rocket',
    badge: 'Best Seller',
    featured: true,
    features: [
      '14 Server Boosts applied',
      'Level 3 perks unlocked',
      '1-Month replacement warranty',
      'Safe automated boost flow'
    ]
  },
  {
    id: 'server-boosts-3m',
    category: 'boosts',
    title: '14x Server Boosts (3 Months)',
    desc: 'Extended Level 3 perks package with 90-day active warranty for established gaming communities.',
    price: '$34.99',
    unit: 'Level 3 for 90 Days',
    icon: 'fa-solid fa-crown',
    badge: 'Extended',
    featured: false,
    features: [
      'Level 3 perks for 3 Months',
      'Full 90-day warranty guarantee',
      'Cost savings vs monthly renewals',
      'Priority support replacement'
    ]
  },
  {
    id: 'discord-bot-ticket',
    category: 'bots',
    title: 'Credify Ticket & Mod Bot',
    desc: 'Complete Discord.js v14 bot system featuring 2-button ticket portals, transcript export, and full mod commands.',
    price: '$19.99',
    unit: 'full source code',
    icon: 'fa-solid fa-robot',
    badge: 'Exclusive',
    featured: true,
    features: [
      'Dual-button ticket portal',
      'Full moderation command suite',
      'Live /stock broadcast command',
      'Easy Node.js self-hosting'
    ]
  },
  {
    id: 'discord-bot-custom',
    category: 'bots',
    title: 'Custom Bot Development',
    desc: 'Tailored Discord bots designed to automate your specific business logic, payments, or game integrations.',
    price: '$49.99',
    unit: 'starting quote',
    icon: 'fa-solid fa-code',
    badge: 'Custom',
    featured: false,
    features: [
      'Tailored slash commands & buttons',
      'Database integration (SQL/Mongo)',
      'API webhooks & payment sync',
      'Lifetime bugfix warranty'
    ]
  },
  {
    id: 'server-growth-campaign',
    category: 'growth',
    title: 'Targeted Server Promotion',
    desc: 'Strategic promotional campaign broadcasting your community invite across targeted gaming & creator networks.',
    price: '$29.99',
    unit: 'per campaign',
    icon: 'fa-solid fa-bullhorn',
    badge: 'Organic',
    featured: false,
    features: [
      'Targeted demographic reach',
      'Clean organic traffic',
      'Detailed campaign analytics',
      'Custom invite tracking'
    ]
  },
  {
    id: 'custom-server-setup',
    category: 'custom',
    title: 'Professional Server Setup',
    desc: 'End-to-end guild overhaul: aesthetic channels, clean category layouts, auto-roles, and security permissions.',
    price: '$24.99',
    unit: 'full setup',
    icon: 'fa-solid fa-wand-magic-sparkles',
    badge: 'Turnkey',
    featured: false,
    features: [
      'Aesthetic channel typography',
      'Strict security permission audit',
      'Auto-role & verification gates',
      'Custom welcome & rules embeds'
    ]
  },
  {
    id: 'digital-templates-pack',
    category: 'custom',
    title: 'Server Templates Bundle',
    desc: 'Premium pre-configured Discord server templates ready for one-click cloning and instant launch.',
    price: '$9.99',
    unit: 'instant access',
    icon: 'fa-solid fa-layer-group',
    badge: 'Digital',
    featured: false,
    features: [
      '5+ Specialized server templates',
      'Marketplace, Gaming, Clan, Crypto',
      'Pre-configured channel permissions',
      'Instant download delivery'
    ]
  }
];

// Toast Generator
window.showToast = function (message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  let icon = 'fa-solid fa-circle-info text-cyan';
  if (type === 'success') icon = 'fa-solid fa-circle-check text-green';
  if (type === 'error') icon = 'fa-solid fa-circle-exclamation text-red';

  toast.innerHTML = `<i class="${icon}"></i> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(30px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
};

document.addEventListener('DOMContentLoaded', () => {
  // 1. Dynamic Year
  const yearSpan = document.getElementById('yearSpan');
  if (yearSpan) yearSpan.innerText = new Date().getFullYear();

  // 2. Render Services
  renderServices('all');

  // 3. Category Tab Filters
  const tabs = document.querySelectorAll('.service-tabs .tab-btn');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      const category = tab.getAttribute('data-category');
      renderServices(category);
    });
  });

  // 4. Footer link shortcuts to service tabs
  document.querySelectorAll('a[data-cat]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const cat = link.getAttribute('data-cat');
      const targetTab = document.querySelector(`.service-tabs .tab-btn[data-category="${cat}"]`);
      if (targetTab) {
        targetTab.click();
      }
    });
  });

  // 5. Navbar Sticky Glass Transition
  const navbar = document.querySelector('.navbar-wrapper');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      navbar?.classList.add('scrolled');
    } else {
      navbar?.classList.remove('scrolled');
    }
  });

  // 6. Mobile Menu Overlay Toggle
  const mobileToggle = document.getElementById('mobileMenuBtn');
  const mobileDrawer = document.getElementById('mobileDrawer');
  const drawerCloseBtn = document.getElementById('drawerCloseBtn');

  function openMenu() {
    mobileDrawer?.classList.add('open');
  }

  function closeMenu() {
    mobileDrawer?.classList.remove('open');
  }

  mobileToggle?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (mobileDrawer?.classList.contains('open')) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  drawerCloseBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    closeMenu();
  });

  document.querySelectorAll('.drawer-link').forEach((link) => {
    link.addEventListener('click', () => {
      closeMenu();
    });
  });

  // 7. FAQ Accordion
  const faqQuestions = document.querySelectorAll('.faq-question');
  faqQuestions.forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const answer = item.querySelector('.faq-answer');
      const isOpen = item.classList.contains('open');

      // Close other open faqs
      document.querySelectorAll('.faq-item.open').forEach((other) => {
        if (other !== item) {
          other.classList.remove('open');
          other.querySelector('.faq-answer').style.maxHeight = null;
        }
      });

      if (isOpen) {
        item.classList.remove('open');
        answer.style.maxHeight = null;
      } else {
        item.classList.add('open');
        answer.style.maxHeight = answer.scrollHeight + 'px';
      }
    });
  });

  // 8. Contact Form
  const contactForm = document.getElementById('contactForm');
  contactForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const discord = document.getElementById('contactDiscord').value;
    const topic = document.getElementById('contactSubject').value;
    const message = document.getElementById('contactMessage').value;

    try {
      await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discord, topic, message })
      });
    } catch {}

    window.showToast('Inquiry submitted! Our team will contact you shortly.', 'success');
    contactForm.reset();
  });

  // Web ticket button trigger
  document.getElementById('btnOpenWebTicket')?.addEventListener('click', () => {
    const contactSection = document.getElementById('contactForm');
    contactSection?.scrollIntoView({ behavior: 'smooth' });
    document.getElementById('contactDiscord')?.focus();
  });

  // 9. Login Modal & Auth Simulation
  const loginModal = document.getElementById('loginModal');
  const btnLogin = document.getElementById('btnLogin');
  const closeLoginModal = document.getElementById('closeLoginModal');
  const btnSimulateDiscord = document.getElementById('btnSimulateDiscordLogin');
  const loginText = document.getElementById('loginText');

  // Check saved session
  const savedUser = localStorage.getItem('credify_user');
  if (savedUser && loginText) {
    loginText.innerText = `@${savedUser}`;
  }

  btnLogin?.addEventListener('click', () => {
    if (localStorage.getItem('credify_user')) {
      // Logout option
      if (confirm('Do you want to sign out?')) {
        localStorage.removeItem('credify_user');
        if (loginText) loginText.innerText = 'Login';
        window.showToast('Logged out successfully.', 'info');
      }
    } else {
      loginModal?.classList.add('active');
    }
  });

  closeLoginModal?.addEventListener('click', () => {
    loginModal?.classList.remove('active');
  });

  loginModal?.addEventListener('click', (e) => {
    if (e.target === loginModal) loginModal.classList.remove('active');
  });

  btnSimulateDiscord?.addEventListener('click', () => {
    const fakeUsername = prompt('Enter your Discord username (or leave default for CredifyUser):', 'CredifyUser');
    const user = fakeUsername ? fakeUsername.trim() : 'CredifyUser';
    localStorage.setItem('credify_user', user);
    if (loginText) loginText.innerText = `@${user}`;
    loginModal?.classList.remove('active');
    window.showToast(`Welcome back, ${user}!`, 'success');
  });

  // 10. Nav Get Started Button
  document.getElementById('btnNavGetStarted')?.addEventListener('click', () => {
    document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' });
  });
  document.getElementById('mobileGetStartedBtn')?.addEventListener('click', () => {
    mobileDrawer?.classList.remove('open');
    document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' });
  });

  // 11. Legal Policy Modals
  setupLegalModals();
});

// Render Services Grid
function renderServices(category) {
  const grid = document.getElementById('servicesGrid');
  if (!grid) return;

  const filtered = category === 'all'
    ? servicesData
    : servicesData.filter((s) => s.category === category);

  grid.innerHTML = filtered
    .map((s) => `
      <div class="service-card glass-card hover-glow">
        <div class="service-card-top">
          <div class="service-icon-box"><i class="${s.icon}"></i></div>
          <span class="service-badge ${s.featured ? 'featured' : ''}">${s.badge}</span>
        </div>

        <h3 class="service-card-title">${s.title}</h3>
        <p class="service-card-desc">${s.desc}</p>

        <div class="service-features-list">
          ${s.features.map(f => `
            <div class="service-feature-item">
              <i class="fa-solid fa-check text-cyan"></i>
              <span>${f}</span>
            </div>
          `).join('')}
        </div>

        <div class="service-card-bottom">
          <div class="service-price-block">
            <span class="price-label">Starting at</span>
            <span class="price-value">${s.price}</span>
          </div>
          <button class="btn btn-primary" onclick="window.openCheckout('${s.id}')">
            <i class="fa-solid fa-cart-shopping"></i> Order Now
          </button>
        </div>
      </div>
    `)
    .join('');
}

// Legal Policies Content & Modal
function setupLegalModals() {
  const legalModal = document.getElementById('legalModal');
  const closeLegalModal = document.getElementById('closeLegalModal');
  const modalTitle = document.getElementById('legalModalTitle');
  const modalContent = document.getElementById('legalModalContent');

  const policies = {
    tos: {
      title: 'Terms of Service',
      content: `
        <h3>1. Acceptance of Terms</h3>
        <p>By accessing Credify services or making a purchase through our platform or Discord server, you acknowledge and agree to comply with these terms.</p>
        <h3>2. Service Fulfillment</h3>
        <p>Credify provides digital Discord growth, boosts, and automation bot solutions. All fulfillment begins promptly after payment verification.</p>
        <h3>3. Responsible Use</h3>
        <p>You agree not to use Credify services for malicious server attacks, unlawful raids, or harassment. Violation will result in immediate termination of service without refund.</p>
      `
    },
    privacy: {
      title: 'Privacy Policy',
      content: `
        <h3>1. Information We Collect</h3>
        <p>We only collect the minimal information necessary to deliver your requested service: your Discord username/tag and designated server invite link.</p>
        <h3>2. Data Protection</h3>
        <p>Your data is never sold, shared, or distributed to third parties. Transactions processed via cryptocurrency or external gateways follow strict end-to-end encryption protocols.</p>
      `
    },
    refund: {
      title: 'Refund & Warranty Policy',
      content: `
        <h3>1. Boost Warranties</h3>
        <p>All Server Boost packages come with active warranty coverage (30 days for 1-month packages, 90 days for 3-month packages). If any boost drops, our staff will replenish it free of charge.</p>
        <h3>2. Refund Eligibility</h3>
        <p>Due to the nature of digital goods, refunds are only issued if a service cannot be fulfilled within 24 hours of payment verification.</p>
      `
    }
  };

  function openLegal(key) {
    if (!policies[key]) return;
    if (modalTitle) modalTitle.innerText = policies[key].title;
    if (modalContent) modalContent.innerHTML = policies[key].content;
    legalModal?.classList.add('active');
  }

  document.getElementById('btnOpenTos')?.addEventListener('click', () => openLegal('tos'));
  document.getElementById('btnOpenPrivacy')?.addEventListener('click', () => openLegal('privacy'));
  document.getElementById('btnOpenRefund')?.addEventListener('click', () => openLegal('refund'));

  closeLegalModal?.addEventListener('click', () => {
    legalModal?.classList.remove('active');
  });

  legalModal?.addEventListener('click', (e) => {
    if (e.target === legalModal) legalModal.classList.remove('active');
  });
}
