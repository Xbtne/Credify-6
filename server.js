const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { ChannelType, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const db = require('./src/utils/database');
const config = require('./src/config.json');

const app = express();
const PORT = process.env.PORT || 3000;

let discordClient = null;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'website')));

// Orders In-Memory Store
const ordersStore = {};

// 1. Stock API
app.get('/api/stock', (req, res) => {
  const stock = [
    {
      id: 'stk-emails',
      name: 'Verified Emails',
      category: 'Accounts / Emails',
      stock: '10k',
      stockNum: 10000,
      rate: '$1.50',
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
      stock: '8000',
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
      stock: '300',
      stockNum: 300,
      rate: '$14.99 / 14x Level 3',
      unitPrice: 14.99,
      demand: '🔥 Very High',
      status: 'in-stock',
      lastUpdated: 'Just now',
      icon: 'fa-solid fa-rocket'
    }
  ];
  return res.json(stock);
});

// 2. Orders API
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

// 3. Web Ticket Creation API (Discord Channel Sync)
app.post('/api/web-ticket', async (req, res) => {
  const { discordUser, topic, initialMessage, type = 'support' } = req.body;

  if (!discordUser || !initialMessage) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const guildId = process.env.GUILD_ID;
  if (!discordClient || !guildId) {
    // Fallback if client isn't ready
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

    // Save ticket state to DB
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

    // Send inside-ticket Embed with Web styling
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

// 4. Send Message from Web to Discord
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

// 5. Fetch Messages for Web Chat
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

      // Check if it's an embed from the web bridge
      if (msg.embeds && msg.embeds.length > 0) {
        const embed = msg.embeds[0];
        if (embed.author && embed.author.name && embed.author.name.includes('(Website)')) {
          isWebMessage = true;
          displayAuthor = embed.author.name.replace(' (Website)', '');
          displayContent = embed.description || '';
          isStaff = false;
        } else if (embed.title && embed.title.includes('Web Ticket')) {
          // Initial welcome embed
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

// Close all active tickets API
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

// 6. Contact Inquiries API
app.post('/api/contact', (req, res) => {
  const inquiry = req.body;
  console.log(`[Contact Inquiry] From: ${inquiry.discord} | Topic: ${inquiry.topic} | Msg: ${inquiry.message}`);
  return res.json({ success: true, message: 'Inquiry received' });
});

// Wildcard fallback to serve index.html for SPA routing
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'website', 'index.html'));
});

function startServer(clientInstance) {
  if (clientInstance) {
    discordClient = clientInstance;
  }
  return app.listen(PORT, () => {
    console.log(`========================================`);
    console.log(`🌐 Credify Website Server is RUNNING!`);
    console.log(`🔗 Local URL: http://localhost:${PORT}`);
    console.log(`========================================`);
  });
}

// Allow running directly via `node server.js`
if (require.main === module) {
  startServer(null);
}

module.exports = { app, startServer };
