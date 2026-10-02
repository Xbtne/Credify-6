const fs = require('fs');
const path = require('path');
const {
  ChannelType,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  AttachmentBuilder
} = require('discord.js');
const db = require('./database');
const config = require('../config.json');
const { createSuccessEmbed, createErrorEmbed } = require('./embeds');

class TicketManager {
  /**
   * Generates the setup embed and buttons for the ticket panel
   */
  getPanelComponents() {
    const bannerPath = path.join(__dirname, '../../assets/banner.png');
    const files = [];

    const embed = new EmbedBuilder()
      .setColor(config.embedColor)
      .setTitle('👑 CREDIFY • TICKET PORTAL')
      .setDescription(
        'Welcome to the official **Credify** help & sales desk! Please select an option below to create a private channel with our staff team:\n\n' +
        '🎟️ **Support Ticket**\n' +
        '• Get assistance with technical issues, general questions, or account help.\n\n' +
        '🛒 **Purchase Ticket**\n' +
        '• Inquire about products, custom orders, licensing, and billing.\n\n' +
        '*Click one of the buttons below to open your ticket!*'
      )
      .setFooter({ text: `${config.footerText} • Support • Purchases • Accounts` })
      .setTimestamp();

    if (fs.existsSync(bannerPath)) {
      const bannerAttachment = new AttachmentBuilder(bannerPath, { name: 'banner.png' });
      embed.setImage('attachment://banner.png');
      files.push(bannerAttachment);
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_create_support')
        .setLabel('Support Ticket')
        .setEmoji('🎟️')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('ticket_create_purchase')
        .setLabel('Purchase Ticket')
        .setEmoji('🛒')
        .setStyle(ButtonStyle.Success)
    );

    return { embeds: [embed], files, components: [row] };
  }

  /**
   * Handles button interaction to create a ticket
   */
  async createTicket(interaction, type) {
    const { guild, user } = interaction;
    const ticketConfig = db.getTicketConfig(guild.id);

    // Check open tickets limit
    const existing = db.getOpenTicketsByUser(guild.id, user.id);
    if (existing.length >= config.maxOpenTicketsPerUser) {
      return interaction.reply({
        embeds: [
          createErrorEmbed(
            'Ticket Limit Reached',
            `You already have **${existing.length}** open tickets! Please close previous tickets before opening a new one.`
          )
        ],
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const ticketNumber = db.getNextTicketNumber(guild.id);
    const paddedNumber = String(ticketNumber).padStart(4, '0');
    const channelName = `${type === 'support' ? 'support' : 'purchase'}-${user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}-${paddedNumber}`;

    // Target category
    let categoryId = null;
    if (type === 'support' && ticketConfig.supportCategory) {
      categoryId = ticketConfig.supportCategory;
    } else if (type === 'purchase' && ticketConfig.purchaseCategory) {
      categoryId = ticketConfig.purchaseCategory;
    }

    // Prepare permission overwrites
    const permissionOverwrites = [
      {
        id: guild.id, // @everyone
        deny: [PermissionsBitField.Flags.ViewChannel]
      },
      {
        id: user.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.AttachFiles,
          PermissionsBitField.Flags.EmbedLinks,
          PermissionsBitField.Flags.ReadMessageHistory
        ]
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

    try {
      const channel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: categoryId || undefined,
        topic: `Ticket #${paddedNumber} | Type: ${type.toUpperCase()} | User: ${user.tag} (${user.id})`,
        permissionOverwrites
      });

      // Save ticket state to DB
      db.saveTicket(guild.id, channel.id, {
        id: ticketNumber,
        number: paddedNumber,
        authorId: user.id,
        authorTag: user.tag,
        type,
        status: 'open',
        claimedBy: null,
        isLocked: false,
        createdAt: Date.now()
      });

      // Build inside-ticket message
      const isSupport = type === 'support';
      const welcomeEmbed = new EmbedBuilder()
        .setColor(isSupport ? config.ticketSupportColor : config.ticketPurchaseColor)
        .setTitle(isSupport ? `🟢 Support Ticket #${paddedNumber}` : `🛒 Purchase Inquiry #${paddedNumber}`)
        .setDescription(
          `Hello <@${user.id}>! Thank you for reaching out.\n\n` +
          (isSupport
            ? 'Please describe your problem or question in detail. Include screenshots or error messages if applicable.\nA support team member will be with you shortly.'
            : 'Welcome to our Sales & Billing department! Please list the item(s) you wish to purchase, your preferred payment method, and any special requests.')
        )
        .addFields(
          { name: '👤 Creator', value: `<@${user.id}>`, inline: true },
          { name: '📋 Category', value: isSupport ? 'General Support' : 'Sales / Purchase', inline: true },
          { name: '🔒 Status', value: 'Open (Unclaimed)', inline: true }
        )
        .setFooter({ text: `${config.footerText} • Use the buttons below to manage this ticket` })
        .setTimestamp();

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
          .setCustomId('ticket_lock_toggle')
          .setLabel('Lock/Unlock')
          .setEmoji('🔏')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('ticket_transcript')
          .setLabel('Transcript')
          .setEmoji('📑')
          .setStyle(ButtonStyle.Secondary)
      );

      const pingContent = ticketConfig.staffRole
        ? `<@${user.id}> | <@&${ticketConfig.staffRole}>`
        : `<@${user.id}>`;

      await channel.send({
        content: pingContent,
        embeds: [welcomeEmbed],
        components: [controlRow]
      });

      await interaction.editReply({
        embeds: [
          createSuccessEmbed(
            'Ticket Created',
            `Your **${type}** ticket has been created: ${channel}`
          )
        ]
      });
    } catch (err) {
      console.error('[TicketManager] Error creating channel:', err);
      return interaction.editReply({
        embeds: [
          createErrorEmbed(
            'Creation Failed',
            'Could not create the ticket channel. Please check that the bot has `Manage Channels` permission and proper role hierarchy.'
          )
        ]
      });
    }
  }

  /**
   * Handles claiming a ticket
   */
  async handleClaim(interaction) {
    const { guild, channel, user, member } = interaction;
    const ticket = db.getTicket(guild.id, channel.id);
    const ticketConfig = db.getTicketConfig(guild.id);

    if (!ticket) {
      return interaction.reply({
        content: '❌ This channel is not an active ticket in the database.',
        ephemeral: true
      });
    }

    const isStaff =
      member.permissions.has(PermissionsBitField.Flags.ManageChannels) ||
      (ticketConfig.staffRole && member.roles.cache.has(ticketConfig.staffRole));

    if (!isStaff) {
      return interaction.reply({
        content: '❌ Only staff members can claim tickets.',
        ephemeral: true
      });
    }

    if (ticket.claimedBy === user.id) {
      // Unclaim
      db.updateTicket(guild.id, channel.id, { claimedBy: null });
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.warningColor)
            .setDescription(`🔓 **${user.tag}** has un-claimed this ticket. Anyone on staff can assist now.`)
        ]
      });
    }

    db.updateTicket(guild.id, channel.id, { claimedBy: user.id });

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.successColor)
          .setDescription(`🙋‍♂️ This ticket has been **claimed** by <@${user.id}>! They will be assisting you.`)
      ]
    });
  }

  /**
   * Toggles lock on ticket for ticket author
   */
  async handleLockToggle(interaction) {
    const { guild, channel, member } = interaction;
    const ticket = db.getTicket(guild.id, channel.id);
    const ticketConfig = db.getTicketConfig(guild.id);

    if (!ticket) {
      return interaction.reply({
        content: '❌ This channel is not an active ticket in the database.',
        ephemeral: true
      });
    }

    const isStaff =
      member.permissions.has(PermissionsBitField.Flags.ManageChannels) ||
      (ticketConfig.staffRole && member.roles.cache.has(ticketConfig.staffRole));

    if (!isStaff) {
      return interaction.reply({
        content: '❌ Only staff members can lock or unlock tickets.',
        ephemeral: true
      });
    }

    const newLockState = !ticket.isLocked;
    db.updateTicket(guild.id, channel.id, { isLocked: newLockState });

    await channel.permissionOverwrites.edit(ticket.authorId, {
      SendMessages: !newLockState
    });

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(newLockState ? config.errorColor : config.successColor)
          .setTitle(newLockState ? '🔏 Ticket Locked' : '🔓 Ticket Unlocked')
          .setDescription(
            newLockState
              ? `The ticket author (<@${ticket.authorId}>) has been muted from sending messages.`
              : `The ticket author (<@${ticket.authorId}>) can now send messages again.`
          )
      ]
    });
  }

  /**
   * Prompts close or directly closes ticket
   */
  async handleCloseConfirm(interaction) {
    return this.handleCloseExecute(interaction);
  }

  /**
   * Closes ticket, removes author permissions, and displays post-close controls
   */
  async handleCloseExecute(interaction) {
    const { guild, channel, user, member } = interaction;
    let ticket = db.getTicket(guild.id, channel.id);

    // If ticket is not in db, create fallback object
    if (!ticket) {
      ticket = {
        authorId: null,
        number: channel.name.replace(/[^0-9]/g, '') || '0000',
        type: channel.name.includes('purchase') ? 'purchase' : 'support',
        status: 'open'
      };
    }

    // Acknowledge interaction
    if (!interaction.replied && !interaction.deferred) {
      await interaction.deferReply({ ephemeral: true }).catch(() => {});
    }

    try {
      db.updateTicket(guild.id, channel.id, { status: 'closed', closedAt: Date.now() });
    } catch (e) {
      console.error('[TicketManager] DB update error on close:', e);
    }

    // Revoke send and view permissions for creator if present
    if (ticket.authorId) {
      try {
        await channel.permissionOverwrites.edit(ticket.authorId, {
          ViewChannel: false,
          SendMessages: false
        });
      } catch (e) {
        console.warn('[TicketManager] Could not update author permissions:', e.message);
      }
    }

    const closedEmbed = new EmbedBuilder()
      .setColor(config.errorColor)
      .setTitle('🔒 Ticket Closed')
      .setDescription(
        `This ticket has been closed by <@${user.id}>.\n\n` +
        '• Click **🔓 Reopen** to restore user access.\n' +
        '• Click **📑 Transcript** to download the chat history.\n' +
        '• Click **🗑️ Delete** to permanently remove this channel.'
      )
      .setFooter({ text: `${config.footerText} • Credify Ticket System` })
      .setTimestamp();

    const postCloseRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_reopen')
        .setLabel('Reopen')
        .setEmoji('🔓')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('ticket_transcript')
        .setLabel('Transcript')
        .setEmoji('📑')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('ticket_delete')
        .setLabel('Delete')
        .setEmoji('🗑️')
        .setStyle(ButtonStyle.Danger)
    );

    // Send public announcement into the ticket channel
    await channel.send({
      embeds: [closedEmbed],
      components: [postCloseRow]
    }).catch(console.error);

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({
        content: '✅ Ticket closed successfully.'
      }).catch(() => {});
    }

    // Send log to log channel if configured
    try {
      const ticketConfig = db.getTicketConfig(guild.id);
      if (ticketConfig && ticketConfig.logChannel) {
        const logChan = guild.channels.cache.get(ticketConfig.logChannel);
        if (logChan) {
          const transcriptAttachment = await this.generateTranscript(channel);
          const logEmbed = new EmbedBuilder()
            .setColor(config.errorColor)
            .setTitle(`📁 Ticket Closed: #${ticket.number || channel.name}`)
            .addFields(
              { name: 'Author', value: ticket.authorId ? `<@${ticket.authorId}> (\`${ticket.authorId}\`)` : 'Unknown / Web', inline: true },
              { name: 'Closed By', value: `<@${user.id}> (\`${user.id}\`)`, inline: true },
              { name: 'Type', value: ticket.type?.toUpperCase() || 'SUPPORT', inline: true },
              { name: 'Channel', value: `${channel.name}`, inline: true }
            )
            .setTimestamp();

          await logChan.send({
            embeds: [logEmbed],
            files: transcriptAttachment ? [transcriptAttachment] : []
          }).catch(() => {});
        }
      }
    } catch (logErr) {
      console.error('[TicketManager] Log send error:', logErr);
    }
  }

  /**
   * Reopens a closed ticket
   */
  async handleReopen(interaction) {
    const { guild, channel, user } = interaction;
    let ticket = db.getTicket(guild.id, channel.id);

    try {
      db.updateTicket(guild.id, channel.id, { status: 'open' });
    } catch (e) {}

    if (ticket && ticket.authorId) {
      try {
        await channel.permissionOverwrites.edit(ticket.authorId, {
          ViewChannel: true,
          SendMessages: true,
          AttachFiles: true,
          ReadMessageHistory: true
        });
      } catch (e) {
        console.warn('[TicketManager] Could not restore author permissions:', e.message);
      }
    }

    const reopenEmbed = new EmbedBuilder()
      .setColor(config.successColor)
      .setTitle('🔓 Ticket Reopened')
      .setDescription(`This ticket has been reopened by <@${user.id}>. The author has access restored.`)
      .setTimestamp();

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ embeds: [reopenEmbed] }).catch(() => {});
    } else {
      await channel.send({ embeds: [reopenEmbed] }).catch(() => {});
    }
  }

  /**
   * Generates a clean text transcript
   */
  async generateTranscript(channel) {
    try {
      const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
      if (!messages) return null;

      const sorted = Array.from(messages.values()).reverse();

      let transcript = `=== CREDIFY TICKET TRANSCRIPT ===\n`;
      transcript += `Channel: #${channel.name} (${channel.id})\n`;
      transcript += `Generated At: ${new Date().toISOString()}\n`;
      transcript += `Total Messages: ${sorted.length}\n`;
      transcript += `===================================\n\n`;

      for (const msg of sorted) {
        const time = msg.createdAt.toISOString().replace('T', ' ').substring(0, 19);
        const userTag = msg.author ? (msg.author.tag || msg.author.username) : 'System';
        transcript += `[${time}] ${userTag} (${msg.author?.id || '0'}):\n${msg.content || '[Embed / Attachment]'}\n`;
        if (msg.attachments && msg.attachments.size > 0) {
          msg.attachments.forEach(att => {
            transcript += `  Attachment: ${att.url}\n`;
          });
        }
        transcript += `\n`;
      }

      const buffer = Buffer.from(transcript, 'utf-8');
      return new AttachmentBuilder(buffer, { name: `transcript-${channel.name}.txt` });
    } catch (err) {
      console.error('[Transcript] Failed to generate:', err);
      return null;
    }
  }

  /**
   * Sends transcript in current channel
   */
  async handleTranscript(interaction) {
    if (!interaction.replied && !interaction.deferred) {
      await interaction.deferReply().catch(() => {});
    }
    const attachment = await this.generateTranscript(interaction.channel);

    if (!attachment) {
      const errPayload = { content: '❌ Failed to generate transcript.' };
      if (interaction.deferred || interaction.replied) {
        return interaction.editReply(errPayload).catch(() => {});
      } else {
        return interaction.reply(errPayload).catch(() => {});
      }
    }

    const payload = {
      content: `📑 **Ticket Transcript:**`,
      files: [attachment]
    };

    if (interaction.deferred || interaction.replied) {
      return interaction.editReply(payload).catch(() => {});
    } else {
      return interaction.reply(payload).catch(() => {});
    }
  }

  /**
   * Deletes ticket channel after countdown
   */
  async handleDelete(interaction) {
    const { channel, guild } = interaction;

    try {
      db.removeTicket(guild.id, channel.id);
    } catch (e) {}

    const deleteEmbed = new EmbedBuilder()
      .setColor(config.errorColor)
      .setDescription('🗑️ Deleting ticket in **3 seconds**...');

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ embeds: [deleteEmbed] }).catch(() => {});
    } else {
      await channel.send({ embeds: [deleteEmbed] }).catch(() => {});
    }

    setTimeout(async () => {
      try {
        await channel.delete('Ticket closed and deleted.');
      } catch (err) {
        console.error('[TicketManager] Failed to delete channel:', err.message);
      }
    }, 3000);
  }
}

module.exports = new TicketManager();
