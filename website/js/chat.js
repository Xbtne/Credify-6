/* ==========================================================================
   CHAT.JS - Real-Time Web-to-Discord Ticket Live Chat Bridge
   Features:
   - Automated Discord Channel Creation via Bot
   - Direct Live Chat Interface inside Web App
   - Bidirectional Message Sync (Web <-> Discord Staff)
   - Persistent LocalStorage Session & Floating Restore Pill
   ========================================================================== */

class WebChatManager {
  constructor() {
    this.modal = document.getElementById('liveChatModal');
    this.floatingPill = document.getElementById('floatingTicketPill');
    this.floatingPillTitle = document.getElementById('pillTicketTitle');
    
    this.chatHeaderTitle = document.getElementById('chatTicketName');
    this.chatDiscordLink = document.getElementById('chatOpenDiscordBtn');
    this.chatMessagesContainer = document.getElementById('chatMessagesFeed');
    this.chatForm = document.getElementById('chatInputForm');
    this.chatInput = document.getElementById('chatMessageInput');
    this.chatCloseBtn = document.getElementById('chatMinimizeBtn');
    this.chatEndTicketBtn = document.getElementById('chatEndTicketBtn');

    this.activeTicket = null;
    this.pollTimer = null;
    this.lastMessageCount = 0;

    this.init();
  }

  init() {
    // Check saved session on load
    const saved = localStorage.getItem('credify_active_ticket');
    if (saved) {
      try {
        this.activeTicket = JSON.parse(saved);
        this.showFloatingPill();
      } catch (e) {
        localStorage.removeItem('credify_active_ticket');
      }
    }

    // Event listeners
    if (this.floatingPill) {
      this.floatingPill.addEventListener('click', () => this.openChat());
    }

    if (this.chatCloseBtn) {
      this.chatCloseBtn.addEventListener('click', () => this.minimizeChat());
    }

    if (this.chatEndTicketBtn) {
      this.chatEndTicketBtn.addEventListener('click', () => this.endTicket());
    }

    if (this.chatForm) {
      this.chatForm.addEventListener('submit', (e) => this.handleSendMessage(e));
    }

    // Modal background click minimizes chat
    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) this.minimizeChat();
      });
    }

    // Intercept Contact Form to create Discord ticket
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
      contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const discordUser = document.getElementById('contactDiscord').value.trim();
        const topic = document.getElementById('contactSubject').value;
        const initialMessage = document.getElementById('contactMessage').value.trim();

        if (!discordUser || !initialMessage) return;

        await this.createNewTicket({
          discordUser,
          topic: topic || 'General Support',
          initialMessage,
          type: topic === 'purchase' ? 'purchase' : 'support'
        });

        contactForm.reset();
      });
    }
  }

  async createNewTicket({ discordUser, topic, initialMessage, type = 'support' }) {
    if (window.showToast) {
      window.showToast('Connecting to Discord Bot & creating ticket...', 'info');
    }

    try {
      const res = await fetch('/api/web-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discordUser, topic, initialMessage, type })
      });

      const data = await res.json();

      if (data.success) {
        this.activeTicket = {
          ticketId: data.ticketId,
          channelId: data.channelId,
          channelName: data.channelName,
          discordUrl: data.discordUrl,
          discordUser,
          topic,
          createdAt: data.createdAt
        };

        localStorage.setItem('credify_active_ticket', JSON.stringify(this.activeTicket));

        if (window.showToast) {
          window.showToast(`Ticket ${data.channelName} created in Discord!`, 'success');
        }

        // Open chat window immediately and start sync
        this.openChat();
      } else {
        if (window.showToast) window.showToast('Failed to create ticket. Please check connection.', 'error');
      }
    } catch (err) {
      console.error('[WebChat Error]:', err);
      if (window.showToast) window.showToast('Server error connecting to ticket portal.', 'error');
    }
  }

  openChat() {
    if (!this.activeTicket) return;

    if (this.chatHeaderTitle) {
      this.chatHeaderTitle.innerText = `#${this.activeTicket.channelName || this.activeTicket.ticketId}`;
    }

    if (this.chatDiscordLink) {
      this.chatDiscordLink.href = this.activeTicket.discordUrl || 'https://discord.gg/5A63uwSJ6R';
    }

    if (this.modal) this.modal.classList.add('active');
    if (this.floatingPill) this.floatingPill.style.display = 'none';

    // Start live message polling
    this.fetchMessages();
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = setInterval(() => this.fetchMessages(), 2500);

    setTimeout(() => {
      this.chatInput?.focus();
    }, 100);
  }

  minimizeChat() {
    if (this.modal) this.modal.classList.remove('active');
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.showFloatingPill();
    if (window.showToast) {
      window.showToast('Chat minimized. Click the bottom widget to return anytime.', 'info');
    }
  }

  showFloatingPill() {
    if (this.floatingPill && this.activeTicket) {
      if (this.floatingPillTitle) {
        this.floatingPillTitle.innerText = `💬 Active Ticket: #${this.activeTicket.channelName || this.activeTicket.ticketId}`;
      }
      this.floatingPill.style.display = 'flex';
    }
  }

  async handleSendMessage(e) {
    e.preventDefault();
    if (!this.activeTicket || !this.chatInput) return;

    const message = this.chatInput.value.trim();
    if (!message) return;

    // Immediately render local bubble
    this.appendMessage({
      author: this.activeTicket.discordUser || 'You',
      content: message,
      isWebUser: true,
      timestamp: new Date().toISOString()
    });

    this.chatInput.value = '';

    try {
      await fetch(`/api/web-ticket/${this.activeTicket.channelId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: this.activeTicket.discordUser || 'Web User',
          message
        })
      });
    } catch (err) {
      console.error('[Send Error]:', err);
    }
  }

  async fetchMessages() {
    if (!this.activeTicket || !this.activeTicket.channelId) return;

    try {
      const res = await fetch(`/api/web-ticket/${this.activeTicket.channelId}/messages`);
      if (res.ok) {
        const data = await res.json();
        if (data.messages && data.messages.length > 0) {
          this.renderMessages(data.messages);
        }
      }
    } catch (err) {}
  }

  renderMessages(messages) {
    if (!this.chatMessagesContainer) return;

    // Only re-render if message count or last message ID changed
    const shouldScroll = messages.length !== this.lastMessageCount;
    this.lastMessageCount = messages.length;

    this.chatMessagesContainer.innerHTML = messages
      .map((msg) => {
        const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (msg.isWebUser) {
          // Client message (Right side)
          return `
            <div class="chat-bubble-row user-row">
              <div class="chat-bubble user-bubble">
                <div class="bubble-header">
                  <span class="bubble-author">You</span>
                  <span class="bubble-time">${time}</span>
                </div>
                <div class="bubble-text">${escapeHtml(msg.content)}</div>
              </div>
            </div>
          `;
        } else if (msg.isStaff) {
          // Discord Staff Member (Left side)
          return `
            <div class="chat-bubble-row staff-row">
              <div class="chat-avatar"><i class="fa-solid fa-shield-halved text-cyan"></i></div>
              <div class="chat-bubble staff-bubble">
                <div class="bubble-header">
                  <span class="bubble-author">${escapeHtml(msg.author)} <span class="staff-badge">STAFF</span></span>
                  <span class="bubble-time">${time}</span>
                </div>
                <div class="bubble-text">${escapeHtml(msg.content)}</div>
              </div>
            </div>
          `;
        } else {
          // Bot / System Embed Notice
          return `
            <div class="chat-system-notice">
              <i class="fa-solid fa-robot text-blue"></i>
              <span>${escapeHtml(msg.content || 'System notification')}</span>
            </div>
          `;
        }
      })
      .join('');

    if (shouldScroll) {
      this.chatMessagesContainer.scrollTop = this.chatMessagesContainer.scrollHeight;
    }
  }

  appendMessage(msg) {
    if (!this.chatMessagesContainer) return;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const row = document.createElement('div');
    row.className = 'chat-bubble-row user-row';
    row.innerHTML = `
      <div class="chat-bubble user-bubble">
        <div class="bubble-header">
          <span class="bubble-author">You</span>
          <span class="bubble-time">${time}</span>
        </div>
        <div class="bubble-text">${escapeHtml(msg.content)}</div>
      </div>
    `;
    this.chatMessagesContainer.appendChild(row);
    this.chatMessagesContainer.scrollTop = this.chatMessagesContainer.scrollHeight;
  }

  endTicket() {
    if (confirm('Are you sure you want to close this ticket session?')) {
      if (this.pollTimer) clearInterval(this.pollTimer);
      localStorage.removeItem('credify_active_ticket');
      this.activeTicket = null;
      if (this.modal) this.modal.classList.remove('active');
      if (this.floatingPill) this.floatingPill.style.display = 'none';
      if (window.showToast) window.showToast('Ticket closed and removed from active sessions.', 'info');
    }
  }
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

document.addEventListener('DOMContentLoaded', () => {
  window.webChatManager = new WebChatManager();
});
