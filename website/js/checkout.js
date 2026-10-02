/* ==========================================================================
   CHECKOUT.JS - Interactive Order & Payment Flow
   ========================================================================== */

const productCatalog = {
  'discord-members-online': {
    id: 'discord-members-online',
    title: 'Online Discord Members',
    desc: 'Realistic online status • High retention • Instant delivery',
    price: 7.99,
    unit: 'per 1,000 members',
    icon: 'fa-solid fa-users',
    category: 'growth'
  },
  'discord-members-offline': {
    id: 'discord-members-offline',
    title: 'Offline Discord Members',
    desc: 'Cost-effective server count boost • Fast dispatch',
    price: 4.99,
    unit: 'per 1,000 members',
    icon: 'fa-solid fa-user-group',
    category: 'growth'
  },
  'server-boosts-1m': {
    id: 'server-boosts-1m',
    title: '14x Server Boosts (1 Month)',
    desc: 'Unlocks Level 3 Perks • 1 Month full replacement warranty',
    price: 14.99,
    unit: 'per server (14 boosts)',
    icon: 'fa-solid fa-rocket',
    category: 'boosts'
  },
  'server-boosts-3m': {
    id: 'server-boosts-3m',
    title: '14x Server Boosts (3 Months)',
    desc: 'Unlocks Level 3 Perks • 3 Months extended warranty',
    price: 34.99,
    unit: 'per server (14 boosts)',
    icon: 'fa-solid fa-crown',
    category: 'boosts'
  },
  'discord-bot-ticket': {
    id: 'discord-bot-ticket',
    title: 'Credify Ticket & Moderation Bot',
    desc: '2-Button ticket system • Transcripts • Full moderation suite',
    price: 19.99,
    unit: 'one-time source & setup',
    icon: 'fa-solid fa-robot',
    category: 'bots'
  },
  'discord-bot-custom': {
    id: 'discord-bot-custom',
    title: 'Custom Discord Bot Development',
    desc: 'Tailored features • Database • Slash commands • 24/7 Hosting ready',
    price: 49.99,
    unit: 'starting price',
    icon: 'fa-solid fa-code',
    category: 'bots'
  },
  'server-growth-campaign': {
    id: 'server-growth-campaign',
    title: 'Targeted Growth Campaign',
    desc: 'Promotion across gaming & tech hubs • Organic reach',
    price: 29.99,
    unit: 'per campaign',
    icon: 'fa-solid fa-bullhorn',
    category: 'growth'
  },
  'custom-server-setup': {
    id: 'custom-server-setup',
    title: 'Professional Server Setup',
    desc: 'Aesthetic channel layouts • Roles hierarchy • Security perms',
    price: 24.99,
    unit: 'full server revamp',
    icon: 'fa-solid fa-wand-magic-sparkles',
    category: 'custom'
  },
  'digital-templates-pack': {
    id: 'digital-templates-pack',
    title: 'High-Converting Server Templates',
    desc: 'Ready-to-use Discord templates for marketplaces, gaming & clubs',
    price: 9.99,
    unit: 'bundle download',
    icon: 'fa-solid fa-layer-group',
    category: 'custom'
  }
};

class CheckoutManager {
  constructor() {
    this.modal = document.getElementById('checkoutModal');
    this.form = document.getElementById('orderForm');
    this.successScreen = document.getElementById('orderSuccessScreen');
    this.closeBtn = document.getElementById('closeCheckoutModal');

    this.prodIcon = document.getElementById('modalProdIcon');
    this.prodTitle = document.getElementById('modalProdTitle');
    this.prodDesc = document.getElementById('modalProdDesc');
    this.prodPrice = document.getElementById('modalProdPrice');

    this.qtyInput = document.getElementById('orderQuantity');
    this.qtyMinus = document.getElementById('qtyMinus');
    this.qtyPlus = document.getElementById('qtyPlus');

    this.promoInput = document.getElementById('promoCodeInput');
    this.promoBtn = document.getElementById('btnApplyPromo');
    this.promoMsg = document.getElementById('promoMessage');

    this.subtotalEl = document.getElementById('summarySubtotal');
    this.discountRow = document.getElementById('discountRow');
    this.discountPercentEl = document.getElementById('discountPercent');
    this.discountEl = document.getElementById('summaryDiscount');
    this.totalEl = document.getElementById('summaryTotal');

    this.currentProduct = productCatalog['server-boosts-1m'];
    this.quantity = 1;
    this.discountPercent = 0;

    this.init();
  }

  init() {
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.close());
    }

    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) this.close();
      });
    }

    if (this.qtyMinus) {
      this.qtyMinus.addEventListener('click', () => {
        if (this.quantity > 1) {
          this.quantity--;
          this.qtyInput.value = this.quantity;
          this.recalculate();
        }
      });
    }

    if (this.qtyPlus) {
      this.qtyPlus.addEventListener('click', () => {
        if (this.quantity < 100) {
          this.quantity++;
          this.qtyInput.value = this.quantity;
          this.recalculate();
        }
      });
    }

    if (this.promoBtn) {
      this.promoBtn.addEventListener('click', () => this.applyPromo());
    }

    // Payment method selector highlight
    document.querySelectorAll('input[name="paymentMethod"]').forEach((radio) => {
      radio.addEventListener('change', (e) => {
        document.querySelectorAll('.payment-option').forEach((opt) => opt.classList.remove('selected'));
        e.target.closest('.payment-option').classList.add('selected');
      });
    });

    if (this.form) {
      this.form.addEventListener('submit', (e) => this.submitOrder(e));
    }

    // Copy order ID button
    const copyBtn = document.getElementById('btnCopyOrderId');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const idText = document.getElementById('createdOrderId').innerText;
        navigator.clipboard.writeText(idText);
        if (window.showToast) window.showToast('Order ID copied to clipboard!', 'success');
      });
    }

    // View in Tracker from success view
    const viewTrackBtn = document.getElementById('btnViewTrackFromSuccess');
    if (viewTrackBtn) {
      viewTrackBtn.addEventListener('click', () => {
        const idText = document.getElementById('createdOrderId').innerText;
        this.close();
        if (window.openTrackerWithId) {
          window.openTrackerWithId(idText);
        }
      });
    }
  }

  open(productKey) {
    const product = productCatalog[productKey] || {
      id: productKey,
      title: productKey,
      desc: 'Selected service from catalog',
      price: 14.99,
      unit: '',
      icon: 'fa-solid fa-cube'
    };

    this.currentProduct = product;
    this.quantity = 1;
    this.discountPercent = 0;

    if (this.qtyInput) this.qtyInput.value = 1;
    if (this.promoInput) this.promoInput.value = '';
    if (this.promoMsg) {
      this.promoMsg.innerText = '';
      this.promoMsg.className = 'promo-feedback';
    }

    if (this.prodIcon) this.prodIcon.innerHTML = `<i class="${product.icon}"></i>`;
    if (this.prodTitle) this.prodTitle.innerText = product.title;
    if (this.prodDesc) this.prodDesc.innerText = product.desc;
    if (this.prodPrice) this.prodPrice.innerText = `$${product.price.toFixed(2)}`;

    // Reset view
    if (this.form) this.form.style.display = 'block';
    if (this.successScreen) this.successScreen.style.display = 'none';

    this.recalculate();
    this.modal.classList.add('active');
  }

  close() {
    if (this.modal) this.modal.classList.remove('active');
  }

  applyPromo() {
    const code = (this.promoInput ? this.promoInput.value : '').trim().toUpperCase();
    if (!code) return;

    if (code === 'CREDIFY10' || code === 'LAUNCH10') {
      this.discountPercent = 10;
      this.promoMsg.innerText = '✅ Code applied! 10% discount added.';
      this.promoMsg.className = 'promo-feedback text-green';
    } else if (code === 'CREDIFY20' || code === 'VIP20') {
      this.discountPercent = 20;
      this.promoMsg.innerText = '✅ VIP Code applied! 20% discount added.';
      this.promoMsg.className = 'promo-feedback text-green';
    } else {
      this.discountPercent = 0;
      this.promoMsg.innerText = '❌ Invalid promo code.';
      this.promoMsg.className = 'promo-feedback text-red';
    }
    this.recalculate();
  }

  recalculate() {
    const subtotal = this.currentProduct.price * this.quantity;
    const discountAmount = subtotal * (this.discountPercent / 100);
    const total = subtotal - discountAmount;

    if (this.subtotalEl) this.subtotalEl.innerText = `$${subtotal.toFixed(2)}`;

    if (this.discountPercent > 0) {
      if (this.discountRow) this.discountRow.style.display = 'flex';
      if (this.discountPercentEl) this.discountPercentEl.innerText = `${this.discountPercent}%`;
      if (this.discountEl) this.discountEl.innerText = `-$${discountAmount.toFixed(2)}`;
    } else {
      if (this.discountRow) this.discountRow.style.display = 'none';
    }

    if (this.totalEl) this.totalEl.innerText = `$${total.toFixed(2)}`;
  }

  async submitOrder(e) {
    e.preventDefault();

    const targetInvite = document.getElementById('orderTarget').value.trim();
    const discordUsername = document.getElementById('orderCustomer').value.trim();
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value || 'crypto';

    if (!targetInvite || !discordUsername) {
      if (window.showToast) window.showToast('Please fill in all required fields.', 'error');
      return;
    }

    const orderId = `CRD-${Math.floor(1000 + Math.random() * 9000)}-${['A', 'B', 'X', 'Z'][Math.floor(Math.random() * 4)]}`;
    const orderData = {
      orderId,
      productId: this.currentProduct.id,
      productTitle: this.currentProduct.title,
      quantity: this.quantity,
      subtotal: (this.currentProduct.price * this.quantity).toFixed(2),
      total: (this.currentProduct.price * this.quantity * (1 - this.discountPercent / 100)).toFixed(2),
      targetInvite,
      discordUsername,
      paymentMethod,
      status: 'Verification',
      statusStep: 2,
      createdAt: new Date().toISOString()
    };

    // Save to localStorage
    const existingOrders = JSON.parse(localStorage.getItem('credify_orders') || '{}');
    existingOrders[orderId] = orderData;
    localStorage.setItem('credify_orders', JSON.stringify(existingOrders));

    // Try posting to backend API if available
    try {
      await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
    } catch {}

    // Show success view
    document.getElementById('createdOrderId').innerText = orderId;
    this.form.style.display = 'none';
    this.successScreen.style.display = 'block';

    if (window.showToast) {
      window.showToast(`Order ${orderId} created successfully!`, 'success');
    }
  }
}

// Global helper to open checkout from stock or services
window.openCheckout = function (productKey) {
  if (window.checkoutManager) {
    window.checkoutManager.open(productKey);
  }
};

window.openCheckoutFromStock = function (stockId, stockNameEscaped, unitPrice) {
  const stockName = unescape(stockNameEscaped);
  if (window.checkoutManager) {
    // Check if in product catalog or create custom entry
    let matchedKey = null;
    for (const key in productCatalog) {
      if (productCatalog[key].title.toLowerCase() === stockName.toLowerCase()) {
        matchedKey = key;
        break;
      }
    }
    if (matchedKey) {
      window.checkoutManager.open(matchedKey);
    } else {
      productCatalog[stockId] = {
        id: stockId,
        title: stockName,
        desc: 'Inventory product from /stock desk',
        price: unitPrice || 9.99,
        unit: 'per unit',
        icon: 'fa-solid fa-gem',
        category: 'stock'
      };
      window.checkoutManager.open(stockId);
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  window.checkoutManager = new CheckoutManager();
});
