/* ==========================================================================
   STOCK.JS - Live Inventory & Rate Dashboard
   Updated with exact Credify inventory
   ========================================================================== */

const defaultStockData = [
  {
    id: 'stk-emails',
    name: 'Verified Emails',
    category: 'Accounts / Emails',
    stock: '10,000 in stock (10k)',
    stockNum: 10000,
    rate: '$1.50 / pack',
    unitPrice: 1.50,
    demand: '🔥 Very High',
    status: 'in-stock',
    lastUpdated: '1m ago',
    icon: 'fa-solid fa-envelope'
  },
  {
    id: 'stk-discord-members',
    name: 'Discord Members',
    category: 'Growth',
    stock: '8,000 in stock (8000)',
    stockNum: 8000,
    rate: '$6.99 / 1,000',
    unitPrice: 6.99,
    demand: '⚡ High',
    status: 'in-stock',
    lastUpdated: '2m ago',
    icon: 'fa-solid fa-users'
  },
  {
    id: 'stk-discord-boosts',
    name: 'Discord Server Boosts',
    category: 'Boosts',
    stock: '300 Boosts in stock (300)',
    stockNum: 300,
    rate: '$14.99 / 14x Level 3',
    unitPrice: 14.99,
    demand: '🔥 Very High',
    status: 'in-stock',
    lastUpdated: 'Just now',
    icon: 'fa-solid fa-rocket'
  },
  {
    id: 'stk-robux',
    name: 'Robux Clean Balance',
    category: 'Currency',
    stock: '12,458,392 R$',
    stockNum: 12458392,
    rate: '$0.0035 / R$',
    unitPrice: 3.50,
    demand: '🔥 Very High',
    status: 'in-stock',
    lastUpdated: '3m ago',
    icon: 'fa-solid fa-gem'
  },
  {
    id: 'stk-bots-ticket',
    name: 'Custom Ticket Bot System',
    category: 'Bots & Tools',
    stock: 'Instant Source',
    stockNum: 99,
    rate: '$19.99 / Bot',
    unitPrice: 19.99,
    demand: '⚡ High',
    status: 'in-stock',
    lastUpdated: '5m ago',
    icon: 'fa-solid fa-robot'
  }
];

class StockManager {
  constructor() {
    this.stockList = [...defaultStockData];
    this.tableBody = document.getElementById('stockTableBody');
    this.searchInput = document.getElementById('stockSearchInput');
    this.refreshBtn = document.getElementById('btnRefreshStock');

    this.init();
  }

  async init() {
    if (this.searchInput) {
      this.searchInput.addEventListener('input', () => this.filterStock());
    }

    if (this.refreshBtn) {
      this.refreshBtn.addEventListener('click', () => this.fetchStock(true));
    }

    await this.fetchStock(false);
  }

  async fetchStock(showToast = false) {
    try {
      const res = await fetch('/api/stock');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          this.stockList = data;
        }
      }
    } catch (err) {}

    this.render(this.stockList);

    if (showToast && window.showToast) {
      window.showToast('Stock data refreshed in real time!', 'success');
    }
  }

  filterStock() {
    const query = (this.searchInput ? this.searchInput.value : '').toLowerCase().trim();
    if (!query) {
      this.render(this.stockList);
      return;
    }

    const filtered = this.stockList.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.demand.toLowerCase().includes(query)
    );

    this.render(filtered);
  }

  render(items) {
    if (!this.tableBody) return;

    if (items.length === 0) {
      this.tableBody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center" style="padding: 2.5rem; color: var(--text-muted);">
            <i class="fa-solid fa-circle-exclamation" style="font-size: 1.5rem; margin-bottom: 0.5rem; display: block;"></i>
            No items matched your search query.
          </td>
        </tr>
      `;
      return;
    }

    this.tableBody.innerHTML = items
      .map((item) => {
        let statusBadge = '<span class="status-pill status-in-stock"><i class="fa-solid fa-circle-check"></i> In Stock</span>';
        if (item.status === 'low-stock') {
          statusBadge = '<span class="status-pill status-low-stock"><i class="fa-solid fa-triangle-exclamation"></i> Low Stock</span>';
        } else if (item.status === 'out-of-stock') {
          statusBadge = '<span class="status-pill status-out-of-stock"><i class="fa-solid fa-circle-xmark"></i> Out of Stock</span>';
        }

        const demandClass = item.demand.includes('High') ? 'demand-high' : 'demand-moderate';

        return `
          <tr>
            <td>
              <div class="prod-cell">
                <div class="prod-cell-icon"><i class="${item.icon}"></i></div>
                <div>
                  <span class="prod-cell-title">${item.name}</span>
                </div>
              </div>
            </td>
            <td><span style="color: var(--text-muted); font-size: 0.85rem;">${item.category}</span></td>
            <td><strong>${item.stock}</strong></td>
            <td><span class="text-cyan" style="font-weight: 700;">${item.rate}</span></td>
            <td><span class="demand-pill ${demandClass}">${item.demand}</span></td>
            <td>${statusBadge}</td>
            <td><span style="color: var(--text-muted); font-size: 0.85rem;"><i class="fa-regular fa-clock"></i> ${item.lastUpdated}</span></td>
            <td>
              <button class="btn btn-primary btn-sm" onclick="window.openCheckoutFromStock('${item.id}', '${escape(item.name)}', ${item.unitPrice})">
                <i class="fa-solid fa-cart-shopping"></i> Purchase
              </button>
            </td>
          </tr>
        `;
      })
      .join('');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.stockManager = new StockManager();
});
