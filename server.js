const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const ms = require('ms');
const { 
  ChannelType, 
  PermissionsBitField, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  EmbedBuilder,
  AttachmentBuilder
} = require('discord.js');
const db = require('./src/utils/database');
const config = require('./src/config.json');
const { createSuccessEmbed, createErrorEmbed, createModlogEmbed, createInfoEmbed } = require('./src/utils/embeds');
const ticketManager = require('./src/utils/ticketManager');

const app = express();
const PORT = process.env.PORT || 3000;

let discordClient = null;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'website')));

// In-Memory Storage
const ordersStore = {};
const commandAuditLogs = [];

// ==========================================
// 1. Stock API
// ==========================================
app.get('/api/stock', (req, res) => {
  const stock = [
    {
      id: 'stk-emails',
      name: 'Verified Emails',
      category: 'Accounts / Emails',
      stock: '10k in stock',
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
      stock: '8,000 in stock',
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
      stock: '300 Boosts in stock',
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
      stock: '12.4M R$ in stock',
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
      stock: 'Instant Source Code',
      stockNum: 99,
      rate: '$19.99 / Bot',
      unitPrice: 19.99,
      demand: '⚡ High',
      status: 'in-stock',
      lastUpdated: '5m ago',
      icon: 'fa-solid fa-robot'
    }
  ];
  return res.json(stock);
});

// ==========================================
// 2. Orders API
// ==========================================
app.post('/api/orders', (req, res) => {
  const order = req.body;
  if (!order || !order.orderId) {
    return res.status(400).json({ error: 'Invalid order payload' });
  }
  ordersStore[order.orderId] = order;
  console.log(`[Order Created] ${order.orderId} - ${order.productTitle} by ${order.discordUsername}`);
  return res.status(201).json({ success: true, order });
});

app.get('/api/orders/:id', (req, res) => {
  const orderId = req.params.id.toUpperCase();
  const order = ordersStore[orderId];
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  return res.json(order);
});

// ==========================================
// 3. Guild Channels & Roles API
// ==========================================
app.get('/api/guild/info', async (req, res) => {
  const guildId = process.env.GUILD_ID;
  if (!discordClient || !guildId) {
    return res.json({
      online: Boolean(discordClient),
      botTag: discordClient?.user?.tag || 'CredifyBot#0001',
      guildName: 'Credify Official Community',
      guildId: guildId || 'demo-guild',
      memberCount: 1420,
      channelsCount: 24,
      rolesCount: 12
    });
  }

  try {
    const guild = discordClient.guilds.cache.get(guildId) || await discordClient.guilds.fetch(guildId);
    if (!guild) {
      return res.json({
        online: true,
        botTag: discordClient.user.tag,
        guildName: 'Unknown Guild',
        guildId,
        memberCount: 0
      });
    }

    return res.json({
      online: true,
      botTag: discordClient.user.tag,
      botAvatar: discordClient.user.displayAvatarURL(),
      guildName: guild.name,
      guildId: guild.id,
      guildIcon: guild.iconURL(),
      memberCount: guild.memberCount,
      channelsCount: guild.channels.cache.size,
      rolesCount: guild.roles.cache.size
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/guild/channels', async (req, res) => {
  const guildId = process.env.GUILD_ID;
  if (!discordClient || !guildId) {
    // Return structured default channels if offline/demo
    return res.json({
      success: true,
      channels: [
        { id: '100000000000000001', name: 'general-chat', type: 'text', category: 'COMMUNITY' },
        { id: '100000000000000002', name: 'announcements', type: 'text', category: 'INFORMATION' },
        { id: '100000000000000003', name: 'stock-updates', type: 'text', category: 'MARKETPLACE' },
        { id: '100000000000000004', name: 'open-a-ticket', type: 'text', category: 'SUPPORT' },
        { id: '100000000000000005', name: 'bot-commands', type: 'text', category: 'BOTS' },
        { id: '100000000000000006', name: 'mod-logs', type: 'text', category: 'STAFF' },
        { id: '100000000000000007', name: 'staff-lounge', type: 'text', category: 'STAFF' },
        { id: '100000000000000008', name: 'vouch-proofs', type: 'text', category: 'MARKETPLACE' }
      ]
    });
  }

  try {
    const guild = discordClient.guilds.cache.get(guildId) || await discordClient.guilds.fetch(guildId);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    const channels = await guild.channels.fetch();
    const formatted = [];

    channels.forEach((ch) => {
      if (ch && (ch.type === ChannelType.GuildText || ch.type === ChannelType.GuildAnnouncement)) {
        formatted.push({
          id: ch.id,
          name: ch.name,
          type: ch.type === ChannelType.GuildAnnouncement ? 'announcement' : 'text',
          category: ch.parent ? ch.parent.name : 'NO CATEGORY',
          position: ch.position
        });
      }
    });

    formatted.sort((a, b) => a.position - b.position);

    return res.json({ success: true, channels: formatted });
  } catch (err) {
    console.error('[GetChannels Error]:', err);
    return res.status(500).json({ error: 'Failed to fetch guild channels' });
  }
});

// ==========================================
// 4. Command Metadata List API
// ==========================================
app.get('/api/commands/list', (req, res) => {
  const commands = [
    {
      id: 'purge',
      name: '/purge',
      category: 'Moderation',
      description: 'Bulk delete messages from a channel with optional user or bot filtering.',
      icon: 'fa-solid fa-trash-can',
      badge: 'Destructive',
      fields: [
        { key: 'channelId', label: 'Target Channel', type: 'channel', required: true, description: 'Select the channel to purge messages in.' },
        { key: 'amount', label: 'Amount of Messages', type: 'number', min: 1, max: 100, default: 20, required: true, description: 'Number of recent messages to delete (1 to 100).' },
        { key: 'targetUser', label: 'Filter Specific User (Optional)', type: 'string', placeholder: 'User ID or @username', required: false, description: 'Only delete messages sent by this user.' },
        { key: 'botsOnly', label: 'Filter Bots Only', type: 'boolean', default: false, required: false, description: 'Only delete messages posted by bot accounts.' }
      ]
    },
    {
      id: 'lock',
      name: '/lock',
      category: 'Moderation',
      description: 'Lock a channel down so regular members cannot send messages or add reactions.',
      icon: 'fa-solid fa-lock',
      badge: 'Security',
      fields: [
        { key: 'channelId', label: 'Target Channel', type: 'channel', required: true, description: 'Select channel to lock.' },
        { key: 'reason', label: 'Lockdown Reason', type: 'string', default: 'Under server maintenance / chat cooldown', required: false, description: 'Why is this channel being locked?' }
      ]
    },
    {
      id: 'unlock',
      name: '/unlock',
      category: 'Moderation',
      description: 'Unlock a previously locked channel to allow members to chat freely again.',
      icon: 'fa-solid fa-lock-open',
      badge: 'Security',
      fields: [
        { key: 'channelId', label: 'Target Channel', type: 'channel', required: true, description: 'Select channel to unlock.' },
        { key: 'reason', label: 'Unlock Reason', type: 'string', default: 'Lockdown lifted by administrator', required: false, description: 'Reason for opening channel back up.' }
      ]
    },
    {
      id: 'slowmode',
      name: '/slowmode',
      category: 'Moderation',
      description: 'Set a message rate limit delay for regular members in a channel.',
      icon: 'fa-solid fa-hourglass-half',
      badge: 'Moderation',
      fields: [
        { key: 'channelId', label: 'Target Channel', type: 'channel', required: true, description: 'Channel to apply slowmode to.' },
        { key: 'seconds', label: 'Cooldown in Seconds', type: 'select', options: [
          { label: 'Off (0 seconds)', value: 0 },
          { label: '5 seconds', value: 5 },
          { label: '10 seconds', value: 10 },
          { label: '15 seconds', value: 15 },
          { label: '30 seconds', value: 30 },
          { label: '1 minute (60s)', value: 60 },
          { label: '2 minutes (120s)', value: 120 },
          { label: '5 minutes (300s)', value: 300 },
          { label: '10 minutes (600s)', value: 600 },
          { label: '1 hour (3600s)', value: 3600 }
        ], default: 5, required: true, description: 'Time users must wait between sending messages.' }
      ]
    },
    {
      id: 'ban',
      name: '/ban',
      category: 'Moderation',
      description: 'Permanently ban a user or member from the Discord guild.',
      icon: 'fa-solid fa-user-slash',
      badge: 'High Impact',
      fields: [
        { key: 'userId', label: 'User ID or Username', type: 'string', placeholder: 'e.g. 123456789012345678 or @user', required: true, description: 'Discord ID or user mention to ban.' },
        { key: 'reason', label: 'Ban Reason', type: 'string', placeholder: 'Violation of Terms / Server Raiding', required: false, default: 'Violating community guidelines' },
        { key: 'deleteDays', label: 'Delete Message History (Days)', type: 'select', options: [
          { label: 'Don\'t delete any (0 days)', value: 0 },
          { label: 'Previous 24 Hours (1 day)', value: 1 },
          { label: 'Previous 3 Days', value: 3 },
          { label: 'Previous 7 Days', value: 7 }
        ], default: 0, required: false }
      ]
    },
    {
      id: 'unban',
      name: '/unban',
      category: 'Moderation',
      description: 'Revoke a ban for a user by their unique Discord User ID.',
      icon: 'fa-solid fa-user-check',
      badge: 'Moderation',
      fields: [
        { key: 'userId', label: 'User ID to Unban', type: 'string', placeholder: 'e.g. 123456789012345678', required: true, description: 'The 18-digit Discord Snowflake ID of the user.' },
        { key: 'reason', label: 'Unban Reason', type: 'string', placeholder: 'Appeal accepted', default: 'Ban appeal accepted by administration', required: false }
      ]
    },
    {
      id: 'kick',
      name: '/kick',
      category: 'Moderation',
      description: 'Kick a member from the server with an optional direct message notification.',
      icon: 'fa-solid fa-person-walking-dashed-line-arrow-right',
      badge: 'Moderation',
      fields: [
        { key: 'userId', label: 'Member ID or Username', type: 'string', placeholder: 'e.g. 123456789012345678 or @user', required: true, description: 'Member to kick from the guild.' },
        { key: 'reason', label: 'Kick Reason', type: 'string', default: 'Insubordination or server rule infractions', required: false }
      ]
    },
    {
      id: 'timeout',
      name: '/timeout',
      category: 'Moderation',
      description: 'Place a member in timeout (mute) for a specified duration.',
      icon: 'fa-solid fa-volume-xmark',
      badge: 'Moderation',
      fields: [
        { key: 'userId', label: 'Member ID or Username', type: 'string', required: true, description: 'Member to timeout.' },
        { key: 'duration', label: 'Timeout Duration', type: 'select', options: [
          { label: '60 Seconds (1m)', value: '60s' },
          { label: '5 Minutes (5m)', value: '5m' },
          { label: '10 Minutes (10m)', value: '10m' },
          { label: '1 Hour (1h)', value: '1h' },
          { label: '1 Day (24h)', value: '1d' },
          { label: '7 Days (1w)', value: '7d' }
        ], default: '10m', required: true },
        { key: 'reason', label: 'Timeout Reason', type: 'string', default: 'Spamming or disruptive behavior', required: false }
      ]
    },
    {
      id: 'untimeout',
      name: '/untimeout',
      category: 'Moderation',
      description: 'Remove timeout communication restrictions from a member early.',
      icon: 'fa-solid fa-volume-high',
      badge: 'Moderation',
      fields: [
        { key: 'userId', label: 'Member ID or Username', type: 'string', required: true, description: 'Member to unmute.' },
        { key: 'reason', label: 'Reason for Early Removal', type: 'string', default: 'Timeout penalty resolved early', required: false }
      ]
    },
    {
      id: 'warn',
      name: '/warn',
      category: 'Moderation',
      description: 'Issue a formal persistent warning to a user saved in the bot database.',
      icon: 'fa-solid fa-triangle-exclamation',
      badge: 'Database',
      fields: [
        { key: 'userId', label: 'Target User ID or Username', type: 'string', required: true, description: 'User being warned.' },
        { key: 'reason', label: 'Warning Reason', type: 'string', placeholder: 'e.g. Inappropriate language / self promotion', required: true, description: 'Specific reason for the warning.' }
      ]
    },
    {
      id: 'clearwarns',
      name: '/clearwarns',
      category: 'Moderation',
      description: 'Clear all active warning records for a user from the database.',
      icon: 'fa-solid fa-broom',
      badge: 'Database',
      fields: [
        { key: 'userId', label: 'Target User ID or Username', type: 'string', required: true, description: 'User whose warnings will be wiped.' }
      ]
    },
    {
      id: 'nick',
      name: '/nick',
      category: 'Moderation',
      description: 'Change or reset a server member\'s display nickname.',
      icon: 'fa-solid fa-signature',
      badge: 'Utility',
      fields: [
        { key: 'userId', label: 'Target User ID or Tag', type: 'string', required: true },
        { key: 'nickname', label: 'New Nickname (Leave blank to reset)', type: 'string', placeholder: 'e.g. VIP Member (or leave blank to reset)', required: false }
      ]
    },
    {
      id: 'nuke',
      name: '/nuke',
      category: 'Moderation',
      description: 'Clone channel settings, permissions, topic, and position, and delete old channel completely.',
      icon: 'fa-solid fa-bomb',
      badge: 'Extreme Danger',
      fields: [
        { key: 'channelId', label: 'Channel to Nuke', type: 'channel', required: true, description: 'Select channel to recreate from scratch.' },
        { key: 'confirm', label: 'Type "CONFIRM NUKE"', type: 'string', placeholder: 'CONFIRM NUKE', required: true, description: 'Safety protection phrase.' }
      ]
    },
    {
      id: 'stock',
      name: '/stock (Broadcast)',
      category: 'Broadcasts',
      description: 'Publish the official Credify real-time inventory embed with banner to any channel.',
      icon: 'fa-solid fa-chart-line',
      badge: 'Live Embed',
      fields: [
        { key: 'channelId', label: 'Destination Channel', type: 'channel', required: true, description: 'Channel where the stock table embed will be sent.' },
        { key: 'emails', label: 'Emails Stock', type: 'string', default: '10k', required: false },
        { key: 'members', label: 'Members Stock', type: 'string', default: '8000', required: false },
        { key: 'boosts', label: 'Boosts Stock', type: 'string', default: '300', required: false },
        { key: 'robux', label: 'Robux Stock', type: 'string', default: '12,458,392 R$', required: false },
        { key: 'ping', label: 'Mention / Ping', type: 'select', options: [
          { label: 'No Ping', value: 'none' },
          { label: '@here', value: '@here' },
          { label: '@everyone', value: '@everyone' }
        ], default: 'none', required: false }
      ]
    },
    {
      id: 'ticketssetup',
      name: '/ticketssetup',
      category: 'Tickets',
      description: 'Deploy the interactive 2-Button Ticket Panel (Support / Purchase) with banner to a channel.',
      icon: 'fa-solid fa-ticket',
      badge: 'Setup',
      fields: [
        { key: 'channelId', label: 'Panel Channel', type: 'channel', required: true, description: 'Channel where the ticket creation panel will be posted.' },
        { key: 'staffRole', label: 'Staff Role ID / Name (Optional)', type: 'string', placeholder: 'e.g. 100000000000000000 or Staff', required: false, description: 'Role that will have ticket viewing rights.' }
      ]
    },
    {
      id: 'closealltickets',
      name: '/closealltickets',
      category: 'Tickets',
      description: 'Bulk close and delete all open web & discord ticket channels immediately.',
      icon: 'fa-solid fa-box-archive',
      badge: 'Maintenance',
      fields: [
        { key: 'confirm', label: 'Type "CLOSE ALL"', type: 'string', placeholder: 'CLOSE ALL', required: true, description: 'Safety verification.' }
      ]
    },
    {
      id: 'announce',
      name: 'Custom Announcement Embed',
      category: 'Broadcasts',
      description: 'Craft and dispatch a custom styled Discord rich embed with neon styling, header and mentions.',
      icon: 'fa-solid fa-bullhorn',
      badge: 'Web Exclusive',
      fields: [
        { key: 'channelId', label: 'Target Channel', type: 'channel', required: true },
        { key: 'title', label: 'Announcement Title', type: 'string', placeholder: '🚀 Big Credify Restock & Updates!', required: true },
        { key: 'message', label: 'Message / Content', type: 'textarea', placeholder: 'Write your announcement in Markdown format...', required: true },
        { key: 'color', label: 'Embed Accent Color', type: 'select', options: [
          { label: 'Cyan Neon (#00E5FF)', value: '#00E5FF' },
          { label: 'Electric Blue (#00A8FF)', value: '#00A8FF' },
          { label: 'Neon Green (#00E676)', value: '#00E676' },
          { label: 'Purple / Magenta (#9C27B0)', value: '#9C27B0' },
          { label: 'Ruby Red (#FF3D57)', value: '#FF3D57' },
          { label: 'Amber Gold (#FFC107)', value: '#FFC107' }
        ], default: '#00A8FF', required: false },
        { key: 'ping', label: 'Mention', type: 'select', options: [
          { label: 'No Mention', value: 'none' },
          { label: '@here', value: '@here' },
          { label: '@everyone', value: '@everyone' }
        ], default: 'none', required: false }
      ]
    },
    {
      id: 'ping',
      name: '/ping',
      category: 'Utility',
      description: 'Check the real-time bot response latency and Discord websocket heartbeat.',
      icon: 'fa-solid fa-wifi',
      badge: 'System',
      fields: [
        { key: 'channelId', label: 'Target Channel (Optional)', type: 'channel', required: false, description: 'Post result in channel, or leave empty for web-only check.' }
      ]
    },
    {
      id: 'botinfo',
      name: '/botinfo',
      category: 'Utility',
      description: 'Query comprehensive bot statistics including uptime, memory, guilds and platform.',
      icon: 'fa-solid fa-circle-info',
      badge: 'System',
      fields: [
        { key: 'channelId', label: 'Post to Channel (Optional)', type: 'channel', required: false }
      ]
    },
    {
      id: 'bumpreminder',
      name: '/bumpreminder test',
      category: 'Utility',
      description: 'Send a simulated Disboard bump reminder to test notification delivery.',
      icon: 'fa-solid fa-bell',
      badge: 'Utility',
      fields: [
        { key: 'channelId', label: 'Reminder Channel', type: 'channel', required: true }
      ]
    }
  ];

  return res.json({ success: true, count: commands.length, commands });
});

// ==========================================
// 5. Command Execution API Engine
// ==========================================
app.post('/api/commands/execute', async (req, res) => {
  const { commandId, params = {}, executedBy = 'Web Dashboard Admin' } = req.body;

  if (!commandId) {
    return res.status(400).json({ error: 'Missing commandId' });
  }

  const guildId = process.env.GUILD_ID;
  const executionTimestamp = new Date().toISOString();

  // Helper log recorder
  function recordAudit(status, actionDetails, channelName = 'Global') {
    const logEntry = {
      id: `CMD-${Date.now()}`,
      commandId,
      status,
      executedBy,
      channel: channelName,
      details: actionDetails,
      timestamp: executionTimestamp
    };
    commandAuditLogs.unshift(logEntry);
    if (commandAuditLogs.length > 100) commandAuditLogs.pop();
    return logEntry;
  }

  // Check if Discord client is active
  if (!discordClient || !guildId) {
    // Offline simulation mode
    const simLog = recordAudit('SUCCESS (Simulated)', `Simulated execution of /${commandId}. Bot offline or running in mock standalone environment.`, params.channelId || 'demo-channel');
    return res.json({
      success: true,
      simulated: true,
      commandId,
      message: `[Simulated Action] /${commandId} successfully tested on web console.`,
      log: simLog,
      output: {
        target: params.channelId || 'demo-channel',
        payload: params,
        time: new Date().toLocaleTimeString()
      }
    });
  }

  try {
    const guild = discordClient.guilds.cache.get(guildId) || await discordClient.guilds.fetch(guildId);
    if (!guild) {
      return res.status(500).json({ error: 'Discord Guild could not be resolved.' });
    }

    // Resolve channel if provided
    let channel = null;
    if (params.channelId) {
      channel = guild.channels.cache.get(params.channelId) || await guild.channels.fetch(params.channelId).catch(() => null);
    }

    let responsePayload = {
      success: true,
      commandId,
      message: '',
      channelName: channel ? channel.name : 'N/A'
    };

    switch (commandId) {
      // ----------------------------------------
      // PURGE
      // ----------------------------------------
      case 'purge': {
        if (!channel) return res.status(400).json({ error: 'Valid channel required for purge.' });
        const amount = Math.min(Math.max(parseInt(params.amount) || 10, 1), 100);
        let fetched = await channel.messages.fetch({ limit: amount });

        if (params.targetUser) {
          const cleanUser = params.targetUser.replace(/[^0-9]/g, '');
          if (cleanUser) {
            fetched = fetched.filter(m => m.author.id === cleanUser);
          }
        }
        if (params.botsOnly) {
          fetched = fetched.filter(m => m.author.bot);
        }

        const deleted = await channel.bulkDelete(fetched, true);
        responsePayload.message = `Successfully deleted ${deleted.size} messages in #${channel.name}.`;

        const purgeEmbed = createSuccessEmbed('Messages Purged', `🧹 **${deleted.size}** messages were purged via **Credify Web Console**.\n**Operator:** \`${executedBy}\``);
        await channel.send({ embeds: [purgeEmbed] }).then(msg => setTimeout(() => msg.delete().catch(() => {}), 6000));
        recordAudit('SUCCESS', `Purged ${deleted.size} messages in #${channel.name}`, channel.name);
        break;
      }

      // ----------------------------------------
      // LOCK
      // ----------------------------------------
      case 'lock': {
        if (!channel) return res.status(400).json({ error: 'Target channel required.' });
        const reason = params.reason || 'Lockdown initiated from Web Control Center';

        await channel.permissionOverwrites.edit(guild.id, {
          SendMessages: false,
          AddReactions: false
        });

        const lockEmbed = new EmbedBuilder()
          .setColor(config.errorColor || '#FF3D57')
          .setTitle('🔒 Channel Lockdown Active')
          .setDescription(`This channel has been locked by **${executedBy}**.\n\n**Reason:** ${reason}`)
          .setTimestamp();

        await channel.send({ embeds: [lockEmbed] });
        responsePayload.message = `Locked channel #${channel.name} successfully.`;
        recordAudit('SUCCESS', `Locked #${channel.name} (${reason})`, channel.name);
        break;
      }

      // ----------------------------------------
      // UNLOCK
      // ----------------------------------------
      case 'unlock': {
        if (!channel) return res.status(400).json({ error: 'Target channel required.' });
        const reason = params.reason || 'Lockdown lifted by Web Control Center';

        await channel.permissionOverwrites.edit(guild.id, {
          SendMessages: null,
          AddReactions: null
        });

        const unlockEmbed = new EmbedBuilder()
          .setColor(config.successColor || '#00E676')
          .setTitle('🔓 Channel Lockdown Lifted')
          .setDescription(`Channel has been unlocked and normal communications are restored.\n\n**Moderator:** ${executedBy}\n**Note:** ${reason}`)
          .setTimestamp();

        await channel.send({ embeds: [unlockEmbed] });
        responsePayload.message = `Unlocked channel #${channel.name}.`;
        recordAudit('SUCCESS', `Unlocked #${channel.name}`, channel.name);
        break;
      }

      // ----------------------------------------
      // SLOWMODE
      // ----------------------------------------
      case 'slowmode': {
        if (!channel) return res.status(400).json({ error: 'Target channel required.' });
        const seconds = parseInt(params.seconds) || 0;
        await channel.setRateLimitPerUser(seconds, `Set by ${executedBy} via Web Console`);

        responsePayload.message = seconds === 0 
          ? `Slowmode disabled in #${channel.name}.`
          : `Slowmode set to ${seconds}s in #${channel.name}.`;

        const slowEmbed = createInfoEmbed('Slowmode Updated', `⏱ Slowmode delay has been updated to **${seconds}s** in this channel by **${executedBy}**.`);
        await channel.send({ embeds: [slowEmbed] });
        recordAudit('SUCCESS', `Set slowmode ${seconds}s in #${channel.name}`, channel.name);
        break;
      }

      // ----------------------------------------
      // BAN
      // ----------------------------------------
      case 'ban': {
        const rawUser = (params.userId || '').replace(/[^0-9]/g, '');
        if (!rawUser) return res.status(400).json({ error: 'Valid user ID required.' });
        const reason = params.reason || 'Banned via Credify Web Console';
        const deleteDays = parseInt(params.deleteDays) || 0;

        await guild.members.ban(rawUser, {
          reason: `${reason} | By: ${executedBy}`,
          deleteMessageSeconds: deleteDays * 24 * 60 * 60
        });

        responsePayload.message = `Successfully banned user ID ${rawUser}.`;
        recordAudit('SUCCESS', `Banned user ${rawUser} (${reason})`, 'Guild');
        break;
      }

      // ----------------------------------------
      // UNBAN
      // ----------------------------------------
      case 'unban': {
        const rawUser = (params.userId || '').replace(/[^0-9]/g, '');
        if (!rawUser) return res.status(400).json({ error: 'Valid user ID required.' });
        const reason = params.reason || 'Unbanned via Web Console';

        await guild.members.unban(rawUser, `${reason} | By: ${executedBy}`);
        responsePayload.message = `Revoked ban for user ID ${rawUser}.`;
        recordAudit('SUCCESS', `Unbanned user ${rawUser}`, 'Guild');
        break;
      }

      // ----------------------------------------
      // KICK
      // ----------------------------------------
      case 'kick': {
        const rawUser = (params.userId || '').replace(/[^0-9]/g, '');
        if (!rawUser) return res.status(400).json({ error: 'Valid member ID required.' });
        const member = await guild.members.fetch(rawUser).catch(() => null);
        if (!member) return res.status(404).json({ error: 'Member not currently in guild.' });

        const reason = params.reason || 'Kicked via Web Console';
        await member.kick(`${reason} | By: ${executedBy}`);
        responsePayload.message = `Kicked ${member.user.tag} (${rawUser}).`;
        recordAudit('SUCCESS', `Kicked ${member.user.tag}`, 'Guild');
        break;
      }

      // ----------------------------------------
      // TIMEOUT
      // ----------------------------------------
      case 'timeout': {
        const rawUser = (params.userId || '').replace(/[^0-9]/g, '');
        if (!rawUser) return res.status(400).json({ error: 'Valid member ID required.' });
        const member = await guild.members.fetch(rawUser).catch(() => null);
        if (!member) return res.status(404).json({ error: 'Member not found in guild.' });

        const durationStr = params.duration || '10m';
        const durationMs = ms(durationStr);
        const reason = params.reason || 'Timed out via Web Console';

        await member.timeout(durationMs, `${reason} | By: ${executedBy}`);
        responsePayload.message = `Timed out ${member.user.tag} for ${durationStr}.`;
        recordAudit('SUCCESS', `Timed out ${member.user.tag} for ${durationStr}`, 'Guild');
        break;
      }

      // ----------------------------------------
      // UNTIMEOUT
      // ----------------------------------------
      case 'untimeout': {
        const rawUser = (params.userId || '').replace(/[^0-9]/g, '');
        if (!rawUser) return res.status(400).json({ error: 'Valid member ID required.' });
        const member = await guild.members.fetch(rawUser).catch(() => null);
        if (!member) return res.status(404).json({ error: 'Member not found.' });

        await member.timeout(null, `Timeout removed by ${executedBy}`);
        responsePayload.message = `Removed timeout restriction from ${member.user.tag}.`;
        recordAudit('SUCCESS', `Untimed out ${member.user.tag}`, 'Guild');
        break;
      }

      // ----------------------------------------
      // WARN
      // ----------------------------------------
      case 'warn': {
        const rawUser = (params.userId || '').replace(/[^0-9]/g, '');
        if (!rawUser) return res.status(400).json({ error: 'User ID required.' });
        const reason = params.reason || 'Rule violation';

        const warn = db.addWarning(guild.id, rawUser, reason, `WebConsole:${executedBy}`);
        const totalWarns = db.getWarnings(guild.id, rawUser).length;

        responsePayload.message = `Warning #${warn.id} issued to user ${rawUser}. Total warnings: ${totalWarns}.`;
        recordAudit('SUCCESS', `Warned user ${rawUser} (#${warn.id})`, 'Guild');
        break;
      }

      // ----------------------------------------
      // CLEARWARNS
      // ----------------------------------------
      case 'clearwarns': {
        const rawUser = (params.userId || '').replace(/[^0-9]/g, '');
        if (!rawUser) return res.status(400).json({ error: 'User ID required.' });

        const gData = db.getGuild(guild.id);
        if (gData.warnings && gData.warnings[rawUser]) {
          delete gData.warnings[rawUser];
          db._write();
        }

        responsePayload.message = `Cleared all warnings for user ${rawUser}.`;
        recordAudit('SUCCESS', `Cleared warnings for ${rawUser}`, 'Guild');
        break;
      }

      // ----------------------------------------
      // NICK
      // ----------------------------------------
      case 'nick': {
        const rawUser = (params.userId || '').replace(/[^0-9]/g, '');
        if (!rawUser) return res.status(400).json({ error: 'User ID required.' });
        const member = await guild.members.fetch(rawUser).catch(() => null);
        if (!member) return res.status(404).json({ error: 'Member not found in guild.' });

        const nick = params.nickname ? params.nickname.trim() : null;
        await member.setNickname(nick, `Updated by ${executedBy} via Web Console`);
        responsePayload.message = nick ? `Nickname set to "${nick}" for ${member.user.tag}.` : `Nickname reset for ${member.user.tag}.`;
        recordAudit('SUCCESS', `Updated nickname for ${member.user.tag}`, 'Guild');
        break;
      }

      // ----------------------------------------
      // NUKE
      // ----------------------------------------
      case 'nuke': {
        if (!channel) return res.status(400).json({ error: 'Target channel required.' });
        if ((params.confirm || '').trim().toUpperCase() !== 'CONFIRM NUKE') {
          return res.status(400).json({ error: 'Confirmation phrase required: "CONFIRM NUKE"' });
        }

        const position = channel.position;
        const topic = channel.topic;
        const parent = channel.parent;
        const permissionOverwrites = channel.permissionOverwrites.cache.map(p => ({
          id: p.id,
          allow: p.allow,
          deny: p.deny,
          type: p.type
        }));

        const newChannel = await channel.clone();
        await channel.delete('Nuked via Web Console');

        await newChannel.setPosition(position);
        if (parent) await newChannel.setParent(parent);
        if (topic) await newChannel.setTopic(topic);

        const nukeEmbed = new EmbedBuilder()
          .setColor(config.embedColor)
          .setTitle('💣 Channel Nuked!')
          .setDescription(`This channel was completely wiped and recreated by **${executedBy}** via Web Console.`)
          .setImage('https://media.giphy.com/media/oe33xf3B50fsc/giphy.gif')
          .setTimestamp();

        await newChannel.send({ embeds: [nukeEmbed] });
        responsePayload.message = `Nuked #${channel.name} and recreated as #${newChannel.name}.`;
        recordAudit('SUCCESS', `Nuked and recreated #${channel.name}`, newChannel.name);
        break;
      }

      // ----------------------------------------
      // STOCK BROADCAST
      // ----------------------------------------
      case 'stock': {
        if (!channel) return res.status(400).json({ error: 'Destination channel required.' });

        const emails = params.emails || '10k';
        const members = params.members || '8000';
        const boosts = params.boosts || '300';
        const robux = params.robux || '12,458,392 R$';

        const stockEmbed = new EmbedBuilder()
          .setColor(config.embedColor || '#00A8FF')
          .setTitle('⚡ Credify • Live Inventory & Stock Status')
          .setDescription(
            `Our inventory is live and automatically updated! Browse real-time numbers below or order directly from our web portal.`
          )
          .addFields(
            { name: '📧 Verified Emails', value: `\`${emails}\` in stock\nRate: **$1.50**`, inline: true },
            { name: '👥 Discord Members', value: `\`${members}\` in stock\nRate: **$6.99 / 1k**`, inline: true },
            { name: '🚀 Server Boosts', value: `\`${boosts}\` Boosts in stock\nRate: **$14.99 / Lvl 3**`, inline: true },
            { name: '💎 Clean Robux', value: `\`${robux}\`\nRate: **$0.0035 / R$**`, inline: true },
            { name: '🤖 Ticket & Mod Bot', value: `\`Instant Source\`\nRate: **$19.99**`, inline: true },
            { name: '🔒 Purchase Portal', value: `[Visit Credify Website](http://localhost:${PORT})`, inline: true }
          )
          .setTimestamp()
          .setFooter({ text: `${config.footerText} • Real-time Broadcast` });

        const bannerPath = path.join(__dirname, 'assets', 'stock_banner.png');
        let files = [];
        if (fs.existsSync(bannerPath)) {
          files.push(new AttachmentBuilder(bannerPath, { name: 'stock_banner.png' }));
          stockEmbed.setImage('attachment://stock_banner.png');
        }

        const btnRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel('Order via Web Portal')
            .setStyle(ButtonStyle.Link)
            .setURL(`http://localhost:${PORT}`)
            .setEmoji('🌐'),
          new ButtonBuilder()
            .setLabel('Join Discord Support')
            .setStyle(ButtonStyle.Link)
            .setURL(config.discordInvite || 'https://discord.gg/5A63uwSJ6R')
            .setEmoji('💬')
        );

        let mentionContent = '';
        if (params.ping === '@everyone') mentionContent = '@everyone';
        if (params.ping === '@here') mentionContent = '@here';

        await channel.send({
          content: mentionContent || undefined,
          embeds: [stockEmbed],
          files,
          components: [btnRow]
        });

        responsePayload.message = `Stock broadcast posted in #${channel.name}.`;
        recordAudit('SUCCESS', `Broadcasted /stock to #${channel.name}`, channel.name);
        break;
      }

      // ----------------------------------------
      // TICKETS SETUP
      // ----------------------------------------
      case 'ticketssetup': {
        if (!channel) return res.status(400).json({ error: 'Panel channel required.' });

        const bannerPath = path.join(__dirname, 'assets', 'banner.png');
        const files = [];
        if (fs.existsSync(bannerPath)) {
          files.push(new AttachmentBuilder(bannerPath, { name: 'banner.png' }));
        }

        const panelEmbed = new EmbedBuilder()
          .setColor(config.embedColor || '#00A8FF')
          .setTitle('🎫 Credify Support & Purchase Desk')
          .setDescription(
            `Welcome to the **Credify Customer Portal**!\n\n` +
            `Please select a ticket option below that best fits your inquiry:\n\n` +
            `🛒 **Purchase Ticket**\n` +
            `Open this if you want to buy Server Boosts, Discord Members, Bots, or have a custom inquiry.\n\n` +
            `🛠 **Support Ticket**\n` +
            `Open this for order assistance, warranty claims, bot setup help, or general questions.\n\n` +
            `*Our staff team typically responds within a few minutes!*`
          )
          .setTimestamp()
          .setFooter({ text: config.footerText || 'Credify Portal' });

        if (files.length > 0) {
          panelEmbed.setImage('attachment://banner.png');
        }

        const panelRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('ticket_create_purchase')
            .setLabel('Purchase Ticket')
            .setEmoji('🛒')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('ticket_create_support')
            .setLabel('Support Ticket')
            .setEmoji('🛠')
            .setStyle(ButtonStyle.Primary)
        );

        await channel.send({ embeds: [panelEmbed], files, components: [panelRow] });
        responsePayload.message = `Ticket panel deployed in #${channel.name}.`;
        recordAudit('SUCCESS', `Deployed Ticket Panel in #${channel.name}`, channel.name);
        break;
      }

      // ----------------------------------------
      // CLOSE ALL TICKETS
      // ----------------------------------------
      case 'closealltickets': {
        if ((params.confirm || '').trim().toUpperCase() !== 'CLOSE ALL') {
          return res.status(400).json({ error: 'Confirmation phrase required: "CLOSE ALL"' });
        }

        const channels = await guild.channels.fetch();
        let deletedCount = 0;

        for (const [id, ch] of channels) {
          if (!ch) continue;
          const name = ch.name.toLowerCase();
          if (
            name.startsWith('support-') ||
            name.startsWith('purchase-') ||
            name.startsWith('web-support-') ||
            name.startsWith('web-purchase-') ||
            name.startsWith('web-') ||
            name.startsWith('ticket-')
          ) {
            await ch.delete('Bulk close initiated from Web Console').catch(() => {});
            deletedCount++;
          }
        }

        const gData = db.getGuild(guild.id);
        gData.tickets = {};
        db._write();

        responsePayload.message = `Bulk closed and purged ${deletedCount} ticket channel(s).`;
        recordAudit('SUCCESS', `Bulk closed ${deletedCount} ticket channels`, 'Guild');
        break;
      }

      // ----------------------------------------
      // CUSTOM ANNOUNCEMENT EMBED
      // ----------------------------------------
      case 'announce': {
        if (!channel) return res.status(400).json({ error: 'Target channel required.' });
        if (!params.title || !params.message) {
          return res.status(400).json({ error: 'Title and message are required.' });
        }

        const embedColor = params.color || '#00A8FF';
        const announceEmbed = new EmbedBuilder()
          .setColor(embedColor)
          .setTitle(params.title)
          .setDescription(params.message)
          .setTimestamp()
          .setFooter({ text: `${config.footerText} • Announcement by ${executedBy}` });

        let mentionContent = '';
        if (params.ping === '@everyone') mentionContent = '@everyone';
        if (params.ping === '@here') mentionContent = '@here';

        await channel.send({
          content: mentionContent || undefined,
          embeds: [announceEmbed]
        });

        responsePayload.message = `Announcement dispatched to #${channel.name}.`;
        recordAudit('SUCCESS', `Sent custom announcement "${params.title}" to #${channel.name}`, channel.name);
        break;
      }

      // ----------------------------------------
      // PING
      // ----------------------------------------
      case 'ping': {
        const wsPing = discordClient.ws.ping;
        responsePayload.message = `Bot Heartbeat Latency: ${wsPing}ms. Gateway operational.`;
        if (channel) {
          const pingEmbed = createInfoEmbed('🏓 Pong!', `**WebSocket Latency:** \`${wsPing}ms\`\n**Status:** 🟢 All systems online.`);
          await channel.send({ embeds: [pingEmbed] });
        }
        recordAudit('SUCCESS', `Ping test: ${wsPing}ms`, channel ? channel.name : 'System');
        break;
      }

      // ----------------------------------------
      // BOTINFO
      // ----------------------------------------
      case 'botinfo': {
        const uptimeSeconds = Math.floor(process.uptime());
        const hours = Math.floor(uptimeSeconds / 3600);
        const minutes = Math.floor((uptimeSeconds % 3600) / 60);
        const memMB = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);

        responsePayload.message = `Bot is serving ${guild.memberCount} members across ${discordClient.guilds.cache.size} server(s). Uptime: ${hours}h ${minutes}m. Memory: ${memMB}MB.`;

        if (channel) {
          const infoEmbed = new EmbedBuilder()
            .setColor(config.embedColor)
            .setTitle('🤖 Credify Bot Diagnostics')
            .addFields(
              { name: '👑 Guild', value: guild.name, inline: true },
              { name: '👥 Members', value: `${guild.memberCount}`, inline: true },
              { name: '⏱ Uptime', value: `${hours}h ${minutes}m`, inline: true },
              { name: '💾 Memory', value: `${memMB} MB`, inline: true },
              { name: '⚙️ Node.js', value: process.version, inline: true },
              { name: '⚡ Discord.js', value: '^14.18.0', inline: true }
            )
            .setTimestamp();
          await channel.send({ embeds: [infoEmbed] });
        }
        recordAudit('SUCCESS', `Queried Bot Info Diagnostics`, channel ? channel.name : 'System');
        break;
      }

      // ----------------------------------------
      // BUMP REMINDER TEST
      // ----------------------------------------
      case 'bumpreminder': {
        if (!channel) return res.status(400).json({ error: 'Channel required.' });
        const bumpReminder = require('./src/utils/bumpReminder');
        await bumpReminder.sendReminder(channel);
        responsePayload.message = `Bump reminder notification test sent to #${channel.name}.`;
        recordAudit('SUCCESS', `Sent bump reminder test to #${channel.name}`, channel.name);
        break;
      }

      default:
        return res.status(400).json({ error: `Unknown command "${commandId}"` });
    }

    return res.json(responsePayload);
  } catch (err) {
    console.error(`[Command Execution Error (${commandId})]:`, err);
    recordAudit('ERROR', `Failed executing /${commandId}: ${err.message}`, params.channelId || 'Global');
    return res.status(500).json({ error: err.message || 'Failed to execute command on Discord server' });
  }
});

// ==========================================
// 6. Command Audit Logs API
// ==========================================
app.get('/api/commands/logs', (req, res) => {
  return res.json({ success: true, logs: commandAuditLogs });
});

// ==========================================
// 7. Web Ticket Creation API (Discord Sync)
// ==========================================
app.post('/api/web-ticket', async (req, res) => {
  const { discordUser, topic, initialMessage, type = 'support' } = req.body;

  if (!discordUser || !initialMessage) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const guildId = process.env.GUILD_ID;
  if (!discordClient || !guildId) {
    const fallbackId = `WEB-TICKET-${Math.floor(1000 + Math.random() * 9000)}`;
    return res.json({
      success: true,
      ticketId: fallbackId,
      channelId: 'offline',
      discordUrl: 'https://discord.gg/5A63uwSJ6R',
      channelName: `ticket-${discordUser}`,
      initialMessage,
      createdAt: Date.now()
    });
  }

  try {
    const guild = discordClient.guilds.cache.get(guildId) || await discordClient.guilds.fetch(guildId);
    if (!guild) {
      return res.status(500).json({ error: 'Guild not found' });
    }

    const ticketConfig = db.getTicketConfig(guild.id);
    const ticketNumber = db.getNextTicketNumber(guild.id);
    const paddedNumber = String(ticketNumber).padStart(4, '0');
    const cleanUser = discordUser.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15) || 'user';
    const channelName = `web-${type}-${cleanUser}-${paddedNumber}`;

    let parentCategory = type === 'purchase' ? ticketConfig.purchaseCategory : ticketConfig.supportCategory;

    const permissionOverwrites = [
      {
        id: guild.id, // @everyone
        deny: [PermissionsBitField.Flags.ViewChannel]
      },
      {
        id: guild.members.me.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ManageChannels,
          PermissionsBitField.Flags.ManageMessages,
          PermissionsBitField.Flags.EmbedLinks,
          PermissionsBitField.Flags.AttachFiles,
          PermissionsBitField.Flags.ReadMessageHistory
        ]
      }
    ];

    if (ticketConfig.staffRole) {
      permissionOverwrites.push({
        id: ticketConfig.staffRole,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.AttachFiles,
          PermissionsBitField.Flags.EmbedLinks,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.ManageMessages
        ]
      });
    }

    const channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: parentCategory || undefined,
      topic: `🌐 Web Portal Ticket #${paddedNumber} | User: @${discordUser} | Topic: ${topic || 'General'}`,
      permissionOverwrites
    });

    db.saveTicket(guild.id, channel.id, {
      id: ticketNumber,
      number: paddedNumber,
      authorId: 'web-user',
      authorTag: discordUser,
      type,
      status: 'open',
      claimedBy: null,
      isLocked: false,
      isWebTicket: true,
      createdAt: Date.now()
    });

    const welcomeEmbed = new EmbedBuilder()
      .setColor(config.embedColor)
      .setTitle(`🌐 Web Ticket #${paddedNumber} • ${topic || 'Support'}`)
      .setDescription(
        `A new ticket was opened from the **Credify Website**!\n\n` +
        `👤 **Client:** \`@${discordUser}\`\n` +
        `📋 **Topic:** ${topic || 'General Inquiry'}\n` +
        `💬 **Initial Message:**\n> ${initialMessage}\n\n` +
        `*Staff: You can chat directly here. Messages will sync to the client on the website in real time!*`
      )
      .addFields(
        { name: '🌐 Source', value: 'Website Live Chat', inline: true },
        { name: '🔒 Status', value: 'Open (Unclaimed)', inline: true }
      )
      .setTimestamp()
      .setFooter({ text: `${config.footerText} • Web-to-Discord Bridge` });

    const controlRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_close_confirm')
        .setLabel('Close')
        .setEmoji('🔒')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('ticket_claim')
        .setLabel('Claim')
        .setEmoji('🙋‍♂️')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('ticket_transcript')
        .setLabel('Transcript')
        .setEmoji('📑')
        .setStyle(ButtonStyle.Secondary)
    );

    const pingText = ticketConfig.staffRole ? `<@&${ticketConfig.staffRole}>` : '@here';
    await channel.send({ content: `🔔 **New Web Ticket:** ${pingText}`, embeds: [welcomeEmbed], components: [controlRow] });

    const discordUrl = `https://discord.com/channels/${guild.id}/${channel.id}`;

    return res.status(201).json({
      success: true,
      ticketId: `CRD-TICKET-${paddedNumber}`,
      channelId: channel.id,
      channelName: channel.name,
      discordUrl,
      createdAt: Date.now()
    });
  } catch (err) {
    console.error('[WebTicket] Error creating ticket in Discord:', err);
    return res.status(500).json({ error: 'Failed to create Discord ticket' });
  }
});

// ==========================================
// 8. Send Message from Web to Discord
// ==========================================
app.post('/api/web-ticket/:channelId/send', async (req, res) => {
  const { channelId } = req.params;
  const { author, message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message cannot be empty' });
  }

  if (!discordClient) {
    return res.status(503).json({ error: 'Discord service unavailable' });
  }

  try {
    const channel = await discordClient.channels.fetch(channelId).catch(() => null);
    if (!channel) {
      return res.status(404).json({ error: 'Ticket channel not found' });
    }

    const embed = new EmbedBuilder()
      .setColor(config.embedColor)
      .setAuthor({ name: `${author || 'Web Client'} (Website)`, iconURL: 'https://cdn-icons-png.flaticon.com/512/847/847969.png' })
      .setDescription(message)
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    return res.json({ success: true, timestamp: Date.now() });
  } catch (err) {
    console.error('[WebTicket Send Error]:', err);
    return res.status(500).json({ error: 'Failed to forward message to Discord' });
  }
});

// ==========================================
// 9. Fetch Messages for Web Chat
// ==========================================
app.get('/api/web-ticket/:channelId/messages', async (req, res) => {
  const { channelId } = req.params;

  if (!discordClient) {
    return res.json({ messages: [] });
  }

  try {
    const channel = await discordClient.channels.fetch(channelId).catch(() => null);
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const fetched = await channel.messages.fetch({ limit: 40 });
    const sorted = Array.from(fetched.values()).reverse();

    const formattedMessages = sorted.map((msg) => {
      let isWebMessage = false;
      let displayAuthor = msg.author.tag || msg.author.username;
      let displayContent = msg.content;
      let isStaff = !msg.author.bot;

      if (msg.embeds && msg.embeds.length > 0) {
        const embed = msg.embeds[0];
        if (embed.author && embed.author.name && embed.author.name.includes('(Website)')) {
          isWebMessage = true;
          displayAuthor = embed.author.name.replace(' (Website)', '');
          displayContent = embed.description || '';
          isStaff = false;
        } else if (embed.title && embed.title.includes('Web Ticket')) {
          displayContent = `[System] Ticket opened with topic: ${embed.title}`;
          isStaff = false;
        }
      }

      return {
        id: msg.id,
        author: displayAuthor,
        isWebUser: isWebMessage,
        isStaff: isStaff && !msg.author.bot,
        isBot: msg.author.bot && !isWebMessage,
        avatar: msg.author.displayAvatarURL(),
        content: displayContent,
        timestamp: msg.createdAt
      };
    });

    return res.json({ success: true, messages: formattedMessages });
  } catch (err) {
    console.error('[WebTicket Messages Error]:', err);
    return res.status(500).json({ error: 'Failed to retrieve messages' });
  }
});

// ==========================================
// 10. Bulk Close All Active Tickets API
// ==========================================
app.post('/api/web-ticket/close-all', async (req, res) => {
  const guildId = process.env.GUILD_ID;
  if (!discordClient || !guildId) {
    return res.json({ success: true, count: 0 });
  }

  try {
    const guild = discordClient.guilds.cache.get(guildId) || await discordClient.guilds.fetch(guildId);
    let deletedCount = 0;

    if (guild) {
      const channels = await guild.channels.fetch();
      for (const [id, ch] of channels) {
        if (!ch) continue;
        const name = ch.name.toLowerCase();
        if (
          name.startsWith('support-') ||
          name.startsWith('purchase-') ||
          name.startsWith('web-support-') ||
          name.startsWith('web-purchase-') ||
          name.startsWith('web-') ||
          name.startsWith('ticket-')
        ) {
          await ch.delete('Bulk close requested').catch(() => {});
          deletedCount++;
        }
      }

      const gData = db.getGuild(guild.id);
      gData.tickets = {};
      db._write();
    }

    return res.json({ success: true, count: deletedCount });
  } catch (err) {
    console.error('[CloseAllTickets Error]:', err);
    return res.status(500).json({ error: 'Failed to close tickets' });
  }
});

// ==========================================
// 11. Contact Inquiries API
// ==========================================
app.post('/api/contact', (req, res) => {
  const inquiry = req.body;
  console.log(`[Contact Inquiry] From: ${inquiry.discord} | Topic: ${inquiry.topic} | Msg: ${inquiry.message}`);
  return res.json({ success: true, message: 'Inquiry received' });
});

// SPA routing fallback
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'website', 'index.html'));
});

function startServer(clientInstance) {
  if (clientInstance) {
    discordClient = clientInstance;
  }
  return app.listen(PORT, () => {
    console.log(`========================================`);
    console.log(`🌐 Credify (Backup) Web & Command Engine RUNNING!`);
    console.log(`🔗 Local URL: http://localhost:${PORT}`);
    console.log(`⚡ Web Bot Commands & REST API ACTIVE!`);
    console.log(`========================================`);
  });
}

if (require.main === module) {
  startServer(null);
}

module.exports = { app, startServer };
