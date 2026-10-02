/* ==========================================================================
   TRACKER.JS - Real-Time Order Tracking & Stepper
   ========================================================================== */

class OrderTracker {
  constructor() {
    this.modal = document.getElementById('trackerModal');
    this.closeBtn = document.getElementById('closeTrackerModal');
    this.searchInput = document.getElementById('trackSearchInput');
    this.searchBtn = document.getElementById('btnSearchTrack');

    this.detailsView = document.getElementById('trackerDetailsView');
    this.notFoundView = document.getElementById('trackerNotFoundView');

    this.orderIdDisplay = document.getElementById('trackOrderIdDisplay');
    this.serviceDisplay = document.getElementById('trackServiceDisplay');
    this.statusBadge = document.getElementById('trackStatusBadge');
    this.statusMsg = document.getElementById('trackStatusMessage');

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

    if (this.searchBtn) {
      this.searchBtn.addEventListener('click', () => this.search());
    }

    if (this.searchInput) {
      this.searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.search();
      });
    }

    // Trigger buttons from navbar / drawer
    const navTrackBtn = document.getElementById('btnTrackOrder');
    if (navTrackBtn) {
      navTrackBtn.addEventListener('click', () => this.open());
    }
    const mobileTrackBtn = document.getElementById('mobileTrackBtn');
    if (mobileTrackBtn) {
      mobileTrackBtn.addEventListener('click', () => {
        const drawer = document.getElementById('mobileDrawer');
        if (drawer) drawer.classList.remove('open');
        this.open();
      });
    }
  }

  open(orderId = '') {
    if (this.modal) this.modal.classList.add('active');
    if (orderId && this.searchInput) {
      this.searchInput.value = orderId;
      this.search();
    }
  }

  close() {
    if (this.modal) this.modal.classList.remove('active');
  }

  async search() {
    const rawId = (this.searchInput ? this.searchInput.value : '').trim().toUpperCase();
    if (!rawId) {
      if (window.showToast) window.showToast('Please enter an Order ID.', 'error');
      return;
    }

    let order = null;

    // Check localStorage first
    const localOrders = JSON.parse(localStorage.getItem('credify_orders') || '{}');
    if (localOrders[rawId]) {
      order = localOrders[rawId];
    }

    // Attempt checking backend if available
    if (!order) {
      try {
        const res = await fetch(`/api/orders/${rawId}`);
        if (res.ok) {
          order = await res.json();
        }
      } catch {}
    }

    // Simulated default demo order for CRD-1001-A if searched
    if (!order && rawId === 'CRD-1001-A') {
      order = {
        orderId: 'CRD-1001-A',
        productTitle: '14x Server Boosts (1 Month)',
        status: 'In Delivery',
        statusStep: 3,
        createdAt: new Date().toISOString()
      };
    }

    if (order) {
      this.renderOrder(order);
    } else {
      if (this.detailsView) this.detailsView.style.display = 'none';
      if (this.notFoundView) this.notFoundView.style.display = 'block';
    }
  }

  renderOrder(order) {
    if (this.notFoundView) this.notFoundView.style.display = 'none';
    if (this.detailsView) this.detailsView.style.display = 'block';

    if (this.orderIdDisplay) this.orderIdDisplay.innerText = order.orderId;
    if (this.serviceDisplay) this.serviceDisplay.innerText = `${order.productTitle} ${order.quantity ? `(x${order.quantity})` : ''}`;

    const step = order.statusStep || 2;
    const statusText = order.status || 'Processing';

    if (this.statusBadge) {
      this.statusBadge.innerText = statusText;
      this.statusBadge.className = 'status-pill status-processing';
      if (step === 4) {
        this.statusBadge.className = 'status-pill status-in-stock';
      }
    }

    // Update Stepper Nodes
    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');
    const step3 = document.getElementById('step3');
    const step4 = document.getElementById('step4');
    const line1 = document.getElementById('line1');
    const line2 = document.getElementById('line2');
    const line3 = document.getElementById('line3');

    // Reset classes
    [step1, step2, step3, step4].forEach(s => s && (s.className = 'step-node'));
    [line1, line2, line3].forEach(l => l && (l.className = 'step-line'));

    if (step >= 1) {
      if (step1) step1.classList.add(step > 1 ? 'completed' : 'active');
    }
    if (step >= 2) {
      if (line1) line1.classList.add('active');
      if (step2) step2.classList.add(step > 2 ? 'completed' : 'active');
    }
    if (step >= 3) {
      if (line2) line2.classList.add('active');
      if (step3) step3.classList.add(step > 3 ? 'completed' : 'active');
    }
    if (step >= 4) {
      if (line3) line3.classList.add('active');
      if (step4) step4.classList.add('completed');
    }

    // Dynamic message
    if (this.statusMsg) {
      if (step === 1) {
        this.statusMsg.innerText = 'Your order has been placed and is queued for verification.';
      } else if (step === 2) {
        this.statusMsg.innerText = 'Payment received. Order is in verification queue. Automated delivery starting shortly.';
      } else if (step === 3) {
        this.statusMsg.innerText = 'Delivery in progress. Server boosts or member invites are being processed right now!';
      } else if (step === 4) {
        this.statusMsg.innerText = 'Order delivered successfully! Thank you for choosing Credify.';
      }
    }
  }
}

window.openTrackerWithId = function (orderId) {
  if (window.orderTracker) {
    window.orderTracker.open(orderId);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  window.orderTracker = new OrderTracker();
});
