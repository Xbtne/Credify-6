/* ==========================================================================
   COMMANDS.JS - Credify Bot Web Command Center & Live Terminal Controller
   Enables executing Discord bot commands directly from the website with
   dynamic interactive questionnaires, channel picker, live previews & console.
   ========================================================================== */

class BotCommandCenter {
  constructor() {
    this.commandsList = [];
    this.channelsList = [];
    this.selectedCommand = null;
    this.selectedCategory = 'all';
    this.guildInfo = null;

    // DOM Elements
    this.categoryTabsContainer = document.getElementById('cmdCategoryTabs');
    this.commandGrid = document.getElementById('commandGrid');
    this.dynamicFormContainer = document.getElementById('cmdDynamicForm');
    this.cmdPreviewSyntax = document.getElementById('cmdPreviewSyntax');
    this.cmdPreviewEmbed = document.getElementById('cmdPreviewEmbed');
    this.cmdExecuteBtn = document.getElementById('btnExecuteCommand');
    this.cmdTerminalBody = document.getElementById('cmdTerminalLogs');
    this.cmdQuickActions = document.getElementById('cmdQuickActions');
    this.guildStatusBadge = document.getElementById('guildStatusBadge');
    this.btnRefreshChannels = document.getElementById('btnRefreshChannels');
    this.btnClearLogs = document.getElementById('btnClearTerminalLogs');

    this.init();
  }

  async init() {
    this.logToTerminal('INITIALIZING', 'Credify Command Center Bridge booting up...', 'info');
    await Promise.all([
      this.fetchGuildInfo(),
      this.fetchChannels(),
      this.fetchCommands()
    ]);

    this.setupEventListeners();
    this.renderQuickActions();
    this.logToTerminal('READY', 'Command Bridge connected. Web-to-Discord dispatcher active.', 'success');
  }

  setupEventListeners() {
    // Category Tabs
    if (this.categoryTabsContainer) {
      this.categoryTabsContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.cmd-tab-btn');
        if (!btn) return;
        this.categoryTabsContainer.querySelectorAll('.cmd-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedCategory = btn.getAttribute('data-category');
        this.renderCommandGrid();
      });
    }

    // Refresh Channels
    if (this.btnRefreshChannels) {
      this.btnRefreshChannels.addEventListener('click', async () => {
        this.logToTerminal('SYNC', 'Refreshing guild channel tree from Discord API...', 'info');
        await this.fetchChannels(true);
        if (this.selectedCommand) {
          this.buildDynamicForm(this.selectedCommand);
        }
      });
    }

    // Clear Terminal Logs
    if (this.btnClearLogs) {
      this.btnClearLogs.addEventListener('click', () => {
        if (this.cmdTerminalBody) {
          this.cmdTerminalBody.innerHTML = '';
          this.logToTerminal('CONSOLE', 'Terminal logs cleared by user.', 'system');
        }
      });
    }

    // Execute Button
    if (this.cmdExecuteBtn) {
      this.cmdExecuteBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.executeCurrentCommand();
      });
    }
  }

  async fetchGuildInfo() {
    try {
      const res = await fetch('/api/guild/info');
      if (res.ok) {
        this.guildInfo = await res.json();
        this.updateGuildHeader();
      }
    } catch (err) {
      console.warn('[GuildInfo Error]:', err);
    }
  }

  updateGuildHeader() {
    if (!this.guildStatusBadge) return;
    if (this.guildInfo && this.guildInfo.online) {
      this.guildStatusBadge.innerHTML = `
        <span class="pulse-dot green-dot"></span>
        <span>Bot Online • <strong>${this.guildInfo.guildName || 'Credify'}</strong> (${this.guildInfo.memberCount || 0} members)</span>
      `;
    } else {
      this.guildStatusBadge.innerHTML = `
        <span class="pulse-dot text-amber"></span>
        <span>Web Test Mode • Standalone Dispatcher</span>
      `;
    }
  }

  async fetchChannels(showToast = false) {
    try {
      const res = await fetch('/api/guild/channels');
      if (res.ok) {
        const data = await res.json();
        if (data.channels && Array.isArray(data.channels)) {
          this.channelsList = data.channels;
          if (showToast && window.showToast) {
            window.showToast(`Synced ${this.channelsList.length} channels from Discord!`, 'success');
          }
          return;
        }
      }
    } catch (err) {
      console.warn('[Channels Fetch Error]:', err);
    }

    // Fallback default list
    this.channelsList = [
      { id: '100000000000000001', name: 'general-chat', type: 'text', category: 'COMMUNITY' },
      { id: '100000000000000002', name: 'announcements', type: 'text', category: 'INFORMATION' },
      { id: '100000000000000003', name: 'stock-updates', type: 'text', category: 'MARKETPLACE' },
      { id: '100000000000000004', name: 'open-a-ticket', type: 'text', category: 'SUPPORT' },
      { id: '100000000000000005', name: 'bot-commands', type: 'text', category: 'BOTS' },
      { id: '100000000000000006', name: 'mod-logs', type: 'text', category: 'STAFF' }
    ];
  }

  async fetchCommands() {
    try {
      const res = await fetch('/api/commands/list');
      if (res.ok) {
        const data = await res.json();
        if (data.commands && Array.isArray(data.commands)) {
          this.commandsList = data.commands;
          this.renderCommandGrid();
          // Select default command
          if (this.commandsList.length > 0) {
            this.selectCommand(this.commandsList[0].id);
          }
          return;
        }
      }
    } catch (err) {
      console.error('[FetchCommands Error]:', err);
    }
  }

  renderCommandGrid() {
    if (!this.commandGrid) return;

    const filtered = this.selectedCategory === 'all'
      ? this.commandsList
      : this.commandsList.filter(c => c.category.toLowerCase() === this.selectedCategory.toLowerCase());

    this.commandGrid.innerHTML = filtered.map(cmd => {
      const isSelected = this.selectedCommand && this.selectedCommand.id === cmd.id;
      return `
        <div class="cmd-card glass-card hover-glow ${isSelected ? 'active-cmd' : ''}" onclick="window.botCommands.selectCommand('${cmd.id}')">
          <div class="cmd-card-top">
            <div class="cmd-icon-box"><i class="${cmd.icon}"></i></div>
            <span class="cmd-badge">${cmd.badge || cmd.category}</span>
          </div>
          <h4 class="cmd-name">${cmd.name}</h4>
          <p class="cmd-desc">${cmd.description}</p>
        </div>
      `;
    }).join('');
  }

  selectCommand(commandId) {
    const cmd = this.commandsList.find(c => c.id === commandId);
    if (!cmd) return;

    this.selectedCommand = cmd;
    this.renderCommandGrid();
    this.buildDynamicForm(cmd);
    this.updateLivePreview();

    this.logToTerminal('SELECT', `Selected command: ${cmd.name} (${cmd.category})`, 'info');
  }

  buildDynamicForm(cmd) {
    if (!this.dynamicFormContainer) return;

    let html = `
      <div class="cmd-form-header">
        <div class="cmd-form-title-wrap">
          <div class="cmd-form-icon"><i class="${cmd.icon}"></i></div>
          <div>
            <h3>${cmd.name}</h3>
            <p>${cmd.description}</p>
          </div>
        </div>
        <span class="cmd-category-tag"><i class="fa-solid fa-layer-group"></i> ${cmd.category}</span>
      </div>
      <form id="activeCmdForm" class="cmd-fields-wrapper" onsubmit="return false;">
    `;

    cmd.fields.forEach(field => {
      const isRequired = field.required ? '<span class="text-cyan">*</span>' : '<span class="text-muted text-xs">(Optional)</span>';
      
      html += `
        <div class="cmd-form-group">
          <div class="cmd-field-label-row">
            <label for="field_${field.key}">${field.label} ${isRequired}</label>
            ${field.description ? `<span class="cmd-field-hint" title="${field.description}"><i class="fa-solid fa-circle-question"></i></span>` : ''}
          </div>
      `;

      if (field.type === 'channel') {
        html += `
          <div class="input-icon-wrapper">
            <i class="fa-solid fa-hashtag text-cyan"></i>
            <select id="field_${field.key}" name="${field.key}" class="cmd-input cmd-select-channel" required>
              <option value="" disabled ${!field.default ? 'selected' : ''}>-- Choose Discord Channel --</option>
              ${this.channelsList.map(ch => `
                <option value="${ch.id}">#${ch.name} (${ch.category || 'General'})</option>
              `).join('')}
            </select>
          </div>
        `;
      } else if (field.type === 'select') {
        html += `
          <div class="input-icon-wrapper">
            <i class="fa-solid fa-list-check text-cyan"></i>
            <select id="field_${field.key}" name="${field.key}" class="cmd-input">
              ${field.options.map(opt => `
                <option value="${opt.value}" ${opt.value === field.default ? 'selected' : ''}>${opt.label}</option>
              `).join('')}
            </select>
          </div>
        `;
      } else if (field.type === 'boolean') {
        html += `
          <div class="cmd-toggle-wrapper">
            <label class="switch">
              <input type="checkbox" id="field_${field.key}" name="${field.key}" ${field.default ? 'checked' : ''}>
              <span class="slider round"></span>
            </label>
            <span class="toggle-label">${field.description || field.label}</span>
          </div>
        `;
      } else if (field.type === 'textarea') {
        html += `
          <textarea id="field_${field.key}" name="${field.key}" class="cmd-input cmd-textarea" rows="3" placeholder="${field.placeholder || ''}" ${field.required ? 'required' : ''}>${field.default || ''}</textarea>
        `;
      } else if (field.type === 'number') {
        html += `
          <div class="input-icon-wrapper">
            <i class="fa-solid fa-calculator text-cyan"></i>
            <input type="number" id="field_${field.key}" name="${field.key}" class="cmd-input" min="${field.min || 1}" max="${field.max || 1000}" value="${field.default || 10}" ${field.required ? 'required' : ''}>
          </div>
        `;
      } else {
        html += `
          <div class="input-icon-wrapper">
            <i class="fa-solid fa-terminal text-cyan"></i>
            <input type="text" id="field_${field.key}" name="${field.key}" class="cmd-input" placeholder="${field.placeholder || ''}" value="${field.default || ''}" ${field.required ? 'required' : ''}>
          </div>
        `;
      }

      html += `</div>`;
    });

    html += `</form>`;
    this.dynamicFormContainer.innerHTML = html;

    // Attach real-time input change listeners for live preview
    const form = document.getElementById('activeCmdForm');
    if (form) {
      form.querySelectorAll('input, select, textarea').forEach(input => {
        input.addEventListener('input', () => this.updateLivePreview());
        input.addEventListener('change', () => this.updateLivePreview());
      });
    }

    // Pre-select first channel if available
    const firstChanSelect = form.querySelector('.cmd-select-channel');
    if (firstChanSelect && this.channelsList.length > 0) {
      firstChanSelect.selectedIndex = 1;
      this.updateLivePreview();
    }
  }

  collectFormValues() {
    const form = document.getElementById('activeCmdForm');
    if (!form) return {};

    const values = {};
    const formData = new FormData(form);

    this.selectedCommand.fields.forEach(field => {
      const el = document.getElementById(`field_${field.key}`);
      if (el) {
        if (field.type === 'boolean') {
          values[field.key] = el.checked;
        } else {
          values[field.key] = el.value;
        }
      }
    });

    return values;
  }

  updateLivePreview() {
    if (!this.selectedCommand) return;
    const values = this.collectFormValues();

    // 1. Build Slash Command Syntax String
    let syntax = `${this.selectedCommand.name}`;
    for (const [k, v] of Object.entries(values)) {
      if (v !== '' && v !== undefined && v !== false) {
        if (k === 'channelId') {
          const chObj = this.channelsList.find(c => c.id === v);
          syntax += ` channel:#${chObj ? chObj.name : v}`;
        } else {
          syntax += ` ${k}:${v}`;
        }
      }
    }

    if (this.cmdPreviewSyntax) {
      this.cmdPreviewSyntax.innerText = syntax;
    }

    // 2. Build Rich Embed Preview Mockup
    if (this.cmdPreviewEmbed) {
      this.renderEmbedPreview(this.selectedCommand, values);
    }
  }

  renderEmbedPreview(cmd, values) {
    let embedTitle = `${cmd.name.toUpperCase()} Action Preview`;
    let embedColor = '#00A8FF';
    let embedDesc = cmd.description;
    let fieldsHtml = '';

    if (cmd.id === 'announce') {
      embedTitle = values.title || 'Announcement Title';
      embedDesc = values.message || 'Announcement content will appear here...';
      embedColor = values.color || '#00A8FF';
    } else if (cmd.id === 'stock') {
      embedTitle = '⚡ Credify • Live Inventory & Stock Status';
      embedDesc = 'Our inventory is live and automatically synced with our order processing pipeline.';
      fieldsHtml = `
        <div class="mock-embed-field"><span>📧 Emails:</span> <strong>${values.emails || '10k'}</strong></div>
        <div class="mock-embed-field"><span>👥 Members:</span> <strong>${values.members || '8000'}</strong></div>
        <div class="mock-embed-field"><span>🚀 Boosts:</span> <strong>${values.boosts || '300'}</strong></div>
        <div class="mock-embed-field"><span>💎 Robux:</span> <strong>${values.robux || '12.4M R$'}</strong></div>
      `;
    } else if (cmd.id === 'purge') {
      embedTitle = '🧹 Purge Execution Preview';
      embedDesc = `Ready to delete up to **${values.amount || 20}** messages in selected channel.`;
      if (values.targetUser) fieldsHtml += `<div class="mock-embed-field"><span>Target Filter:</span> <strong>${values.targetUser}</strong></div>`;
      if (values.botsOnly) fieldsHtml += `<div class="mock-embed-field"><span>Filter:</span> <strong>Bots Only</strong></div>`;
    } else if (cmd.id === 'lock') {
      embedTitle = '🔒 Channel Lockdown';
      embedDesc = `Reason: ${values.reason || 'Server maintenance / Cooldown'}`;
      embedColor = '#FF3D57';
    } else if (cmd.id === 'ticketssetup') {
      embedTitle = '🎫 Credify Support & Purchase Desk';
      embedDesc = 'Interactive Ticket Creation Portal with Support & Purchase buttons.';
    }

    const chanObj = this.channelsList.find(c => c.id === values.channelId);
    const targetChanText = chanObj ? `#${chanObj.name}` : 'Selected Channel';

    this.cmdPreviewEmbed.innerHTML = `
      <div class="discord-mock-message">
        <div class="mock-bot-avatar"><img src="assets/logo.png" alt="Bot"></div>
        <div class="mock-message-content">
          <div class="mock-bot-header">
            <span class="mock-bot-name">Credify Bot</span>
            <span class="mock-bot-tag">BOT</span>
            <span class="mock-bot-channel"><i class="fa-solid fa-hashtag"></i> ${targetChanText}</span>
            <span class="mock-bot-time">Today at ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
          </div>

          <div class="mock-embed" style="border-left-color: ${embedColor};">
            <div class="mock-embed-title" style="color: ${embedColor};">${embedTitle}</div>
            <div class="mock-embed-desc">${embedDesc}</div>
            ${fieldsHtml ? `<div class="mock-embed-fields-grid">${fieldsHtml}</div>` : ''}
            <div class="mock-embed-footer">
              <img src="assets/logo.png" class="mock-footer-icon" alt="">
              <span>Credify Official Suite • Live Web Trigger</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async executeCurrentCommand() {
    if (!this.selectedCommand) return;
    const values = this.collectFormValues();

    // Check required fields
    for (const field of this.selectedCommand.fields) {
      if (field.required && (!values[field.key] || values[field.key] === '')) {
        if (window.showToast) window.showToast(`Please fill in required field: "${field.label}"`, 'error');
        const el = document.getElementById(`field_${field.key}`);
        if (el) el.focus();
        return;
      }
    }

    // Button loading state
    const originalBtnContent = this.cmdExecuteBtn.innerHTML;
    this.cmdExecuteBtn.disabled = true;
    this.cmdExecuteBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>Executing in Discord...</span>`;

    const chanObj = this.channelsList.find(c => c.id === values.channelId);
    const chanName = chanObj ? `#${chanObj.name}` : (values.channelId || 'Global');

    this.logToTerminal('DISPATCH', `Sending /${this.selectedCommand.id} to ${chanName}...`, 'info');

    try {
      const res = await fetch('/api/commands/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commandId: this.selectedCommand.id,
          params: values,
          executedBy: localStorage.getItem('credify_user') || 'Web Dashboard Admin'
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const msg = data.message || `Command /${this.selectedCommand.id} executed successfully!`;
        this.logToTerminal('SUCCESS', `[${this.selectedCommand.name}] ${msg}`, 'success');
        if (window.showToast) window.showToast(msg, 'success');
        this.pulseSuccessFeedback();
      } else {
        const errMsg = data.error || 'Failed to execute command.';
        this.logToTerminal('ERROR', `[${this.selectedCommand.name}] ${errMsg}`, 'error');
        if (window.showToast) window.showToast(errMsg, 'error');
      }
    } catch (err) {
      this.logToTerminal('CRITICAL', `Execution failure: ${err.message}`, 'error');
      if (window.showToast) window.showToast(`Connection failed: ${err.message}`, 'error');
    } finally {
      this.cmdExecuteBtn.disabled = false;
      this.cmdExecuteBtn.innerHTML = originalBtnContent;
    }
  }

  pulseSuccessFeedback() {
    const box = document.querySelector('.cmd-preview-card');
    if (box) {
      box.classList.add('cmd-success-pulse');
      setTimeout(() => box.classList.remove('cmd-success-pulse'), 1000);
    }
  }

  logToTerminal(tag, message, type = 'info') {
    if (!this.cmdTerminalBody) return;

    const time = new Date().toLocaleTimeString();
    const line = document.createElement('div');
    line.className = `terminal-line terminal-${type}`;

    let tagColor = 'var(--cyan-neon)';
    if (type === 'success') tagColor = 'var(--neon-green)';
    if (type === 'error') tagColor = 'var(--neon-red)';
    if (type === 'system') tagColor = 'var(--purple-neon)';

    line.innerHTML = `
      <span class="terminal-time">[${time}]</span>
      <span class="terminal-tag" style="color: ${tagColor};">&lt;${tag}&gt;</span>
      <span class="terminal-msg">${message}</span>
    `;

    this.cmdTerminalBody.appendChild(line);
    this.cmdTerminalBody.scrollTop = this.cmdTerminalBody.scrollHeight;
  }

  renderQuickActions() {
    if (!this.cmdQuickActions) return;

    const presets = [
      { id: 'stock', title: 'Broadcast /stock', icon: 'fa-solid fa-chart-line', cat: 'Broadcasts' },
      { id: 'purge', title: 'Purge 25 Messages', icon: 'fa-solid fa-trash-can', cat: 'Moderation' },
      { id: 'lock', title: 'Lockdown Channel', icon: 'fa-solid fa-lock', cat: 'Moderation' },
      { id: 'unlock', title: 'Unlock Channel', icon: 'fa-solid fa-lock-open', cat: 'Moderation' },
      { id: 'ticketssetup', title: 'Deploy Ticket Panel', icon: 'fa-solid fa-ticket', cat: 'Tickets' },
      { id: 'ping', title: 'Bot Latency Ping', icon: 'fa-solid fa-wifi', cat: 'Utility' }
    ];

    this.cmdQuickActions.innerHTML = presets.map(p => `
      <button class="btn btn-glass btn-sm quick-preset-btn" onclick="window.botCommands.selectCommand('${p.id}')">
        <i class="${p.icon} text-cyan"></i> <span>${p.title}</span>
      </button>
    `).join('');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.botCommands = new BotCommandCenter();
});
