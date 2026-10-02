# 👑 CREDIFY • Complete Ecosystem

An all-in-one Discord service brand ecosystem featuring:
1. **Premium Web Marketplace**: Dark cyber aesthetic, glassmorphism cards, animated particle network, live `/stock` dashboard, interactive checkout with promo codes, real-time multi-stage order tracking, and support desk.
2. **Discord Bot (Discord.js v14)**: Dual-button interactive ticket portal (`/ticketssetup`), full moderation suite (`/ban`, `/timeout`, `/warn`, `/lock`, etc.), and live `/stock` broadcast commands with custom image attachments.

---

## 🌐 1. Web Marketplace (`website/` & `server.js`)

### ✨ Features
- **Design System**: Dark black/navy canvas (`#060810`), electric blue and neon cyan accents, glassmorphic blur cards, animated particle network, glowing borders, and responsive desktop & mobile drawers.
- **Hero Section**:
  - Headline: *"BUILD YOUR SERVER. GROW WITH CREDIFY."*
  - Tagline: *"Grow smarter. Build bigger. Stay ahead."*
  - 3D glowing Credify emblem with orbital spinning rings & floating badges (+1,000 Members, Level 3 Boosts, 24/7 Custom Bots).
- **Service Catalog**:
  - Filter tabs: *All Services*, *Growth & Members*, *Server Boosts*, *Bots & Tools*, *Custom & Digital*.
  - Direct "Order Now" triggers opening the interactive checkout flow.
- **Live Stock Section (`/stock`)**:
  - Structured real-time inventory dashboard (Robux balance, online/offline members, Level 3 boosts, custom bot setups).
  - Search filter, live status badges (🟢 In Stock / 🟡 Low Stock / 🔴 Out of Stock), last updated timestamps, and 1-click purchase binding.
- **Interactive Checkout Flow**:
  - Service tier & quantity stepper with real-time price calculation.
  - Promo code system (Try `CREDIFY10` or `CREDIFY20`).
  - Delivery inputs (Discord permanent invite link & username).
  - Payment method selector: Crypto (BTC/LTC/USDT), CashApp, Credit/Debit Card, PayPal.
  - Generates unique Order IDs (`CRD-XXXX-X`) with 1-click copy.
- **Live Order Tracker**:
  - Multi-stage visual progress stepper: *Order Placed* ➔ *Verification* ➔ *In Delivery* ➔ *Completed*.
- **Support & FAQ**:
  - Accordion FAQs, direct contact form with toast notifications, and legal policy modals (Terms of Service, Privacy Policy, Refund & Warranty).
- **REST API Ready**:
  - `GET /api/stock` – Live inventory feed
  - `POST /api/orders` – Submit orders
  - `GET /api/orders/:id` – Fetch order tracking status
  - `POST /api/contact` – Submit contact inquiries

---

## 🤖 2. Discord Bot (`src/` & `index.js`)

### 🎫 Interactive Ticket Portal (`/ticketssetup`)
- **2 Buttons**:
  - 🎟️ **Support Ticket** – Creates `#support-<user>-<number>` with guidelines and staff pings.
  - 🛒 **Purchase Ticket** – Creates `#purchase-<user>-<number>` with order instructions.
- **Staff In-Ticket Controls**:
  - 🔒 **Close** – Confirmation prompt ➔ archives channel ➔ saves transcript.
  - 🙋‍♂️ **Claim** – Assigns ticket to staff member.
  - 🔏 **Lock / Unlock** – Mutes or un-mutes ticket creator.
  - 📑 **Transcript** – Generates clean `.txt` chat logs.
  - 🔓 **Reopen** – Restores ticket author permissions.
  - 🗑️ **Delete** – 5-second countdown channel deletion.

### 🛡️ Moderation Commands
- `/ban`, `/unban`, `/kick`, `/timeout`, `/untimeout`
- `/warn`, `/warnings`, `/clearwarns`
- `/purge`, `/lock`, `/unlock`, `/slowmode`, `/nick`, `/nuke`, `/setlogs`
- `/stock` – Broadcasts live stock updates with custom graphics to your guild
- `/botinfo`, `/help`, `/ping`

---

## 🚀 Running the Project

### Start the Website & API Server:
```bash
npm run web
```
*Open [http://localhost:3000](http://localhost:3000) in your browser.*

### Start the Discord Bot:
```bash
npm start
```

### Deploy Slash Commands:
```bash
npm run deploy
```
