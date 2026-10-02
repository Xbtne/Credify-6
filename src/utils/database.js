const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../../data');
const dataFile = path.join(dataDir, 'database.json');

const defaultData = {
  guilds: {},
  // Structure per guild:
  // {
  //   ticketConfig: {
  //     supportCategory: null,
  //     purchaseCategory: null,
  //     staffRole: null,
  //     logChannel: null,
  //     counter: 0,
  //     supportWelcomeMessage: null,
  //     purchaseWelcomeMessage: null
  //   },
  //   tickets: {}, // channelId -> { id, authorId, type, status, claimedBy, createdAt, closedAt }
  //   warnings: {}, // userId -> [ { id, reason, moderatorId, timestamp } ]
  //   modlogs: null // channelId
  // }
};

class Database {
  constructor() {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    if (!fs.existsSync(dataFile)) {
      fs.writeFileSync(dataFile, JSON.stringify(defaultData, null, 2), 'utf-8');
    }
    this.cache = this._read();
  }

  _read() {
    try {
      const raw = fs.readFileSync(dataFile, 'utf-8');
      return JSON.parse(raw);
    } catch (err) {
      console.error('[DB] Failed to read database, using default fallback:', err);
      return { ...defaultData };
    }
  }

  _write() {
    try {
      fs.writeFileSync(dataFile, JSON.stringify(this.cache, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DB] Failed to write database:', err);
    }
  }

  getGuild(guildId) {
    if (!this.cache.guilds[guildId]) {
      this.cache.guilds[guildId] = {
        ticketConfig: {
          supportCategory: null,
          purchaseCategory: null,
          staffRole: null,
          logChannel: null,
          counter: 0,
          supportWelcomeMessage: null,
          purchaseWelcomeMessage: null
        },
        tickets: {},
        warnings: {},
        modlogs: null
      };
      this._write();
    }
    return this.cache.guilds[guildId];
  }

  // --- Ticket Settings ---
  getTicketConfig(guildId) {
    const guild = this.getGuild(guildId);
    return guild.ticketConfig;
  }

  updateTicketConfig(guildId, configUpdates) {
    const guild = this.getGuild(guildId);
    guild.ticketConfig = { ...guild.ticketConfig, ...configUpdates };
    this._write();
    return guild.ticketConfig;
  }

  getNextTicketNumber(guildId) {
    const guild = this.getGuild(guildId);
    guild.ticketConfig.counter = (guild.ticketConfig.counter || 0) + 1;
    this._write();
    return guild.ticketConfig.counter;
  }

  // --- Tickets ---
  saveTicket(guildId, channelId, ticketData) {
    const guild = this.getGuild(guildId);
    guild.tickets[channelId] = ticketData;
    this._write();
  }

  getTicket(guildId, channelId) {
    const guild = this.getGuild(guildId);
    return guild.tickets[channelId] || null;
  }

  getOpenTicketsByUser(guildId, userId) {
    const guild = this.getGuild(guildId);
    return Object.values(guild.tickets).filter(
      (t) => t.authorId === userId && t.status !== 'closed'
    );
  }

  updateTicket(guildId, channelId, updates) {
    const guild = this.getGuild(guildId);
    if (guild.tickets[channelId]) {
      guild.tickets[channelId] = { ...guild.tickets[channelId], ...updates };
      this._write();
      return guild.tickets[channelId];
    }
    return null;
  }

  removeTicket(guildId, channelId) {
    const guild = this.getGuild(guildId);
    if (guild.tickets[channelId]) {
      delete guild.tickets[channelId];
      this._write();
    }
  }

  // --- Warnings ---
  addWarning(guildId, userId, reason, moderatorId) {
    const guild = this.getGuild(guildId);
    if (!guild.warnings[userId]) {
      guild.warnings[userId] = [];
    }
    const warn = {
      id: (guild.warnings[userId].length + 1).toString(),
      reason,
      moderatorId,
      timestamp: Date.now()
    };
    guild.warnings[userId].push(warn);
    this._write();
    return warn;
  }

  getWarnings(guildId, userId) {
    const guild = this.getGuild(guildId);
    return guild.warnings[userId] || [];
  }

  clearWarnings(guildId, userId) {
    const guild = this.getGuild(guildId);
    const count = (guild.warnings[userId] || []).length;
    guild.warnings[userId] = [];
    this._write();
    return count;
  }

  removeWarning(guildId, userId, warnId) {
    const guild = this.getGuild(guildId);
    if (!guild.warnings[userId]) return false;
    const initialLen = guild.warnings[userId].length;
    guild.warnings[userId] = guild.warnings[userId].filter((w) => w.id !== warnId);
    this._write();
    return guild.warnings[userId].length < initialLen;
  }

  // --- Moderation Logs ---
  setModlogsChannel(guildId, channelId) {
    const guild = this.getGuild(guildId);
    guild.modlogs = channelId;
    this._write();
  }

  getModlogsChannel(guildId) {
    const guild = this.getGuild(guildId);
    return guild.modlogs;
  }

  // --- Bump Reminder ---
  getBumpConfig(guildId) {
    const guild = this.getGuild(guildId);
    if (!guild.bumpConfig) {
      guild.bumpConfig = {
        channelId: '1555699939978387625',
        enabled: true,
        lastBumpTime: null,
        lastBumperId: null,
        nextBumpTime: null
      };
      this._write();
    }
    return guild.bumpConfig;
  }

  updateBumpConfig(guildId, updates) {
    const guild = this.getGuild(guildId);
    guild.bumpConfig = { ...(guild.bumpConfig || {}), ...updates };
    this._write();
    return guild.bumpConfig;
  }
}

module.exports = new Database();
