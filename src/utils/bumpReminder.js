const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config.json');
const db = require('./database');

class BumpReminder {
  constructor() {
    this.timers = new Map(); // guildId -> Timeout
    this.defaultChannelId = config.bumpReminder?.channelId || '1555699939978387625';
    this.disboardUrl = config.bumpReminder?.disboardUrl || 'https://disboard.org/server/1555647999915593728';
    this.intervalMs = config.bumpReminder?.intervalMs || 2 * 60 * 60 * 1000; // 2 hours
    this.disboardBotId = config.bumpReminder?.disboardBotId || '302050872383242240';
  }

  /**
   * Initialize bump reminder service for all cached guilds
   */
  async init(client) {
    console.log('[BumpReminder] Initializing bump reminder service...');

    // Small delay to ensure guilds and channels are fully cached
    setTimeout(async () => {
      for (const [guildId] of client.guilds.cache) {
        this.scheduleNextReminder(client, guildId);
      }
    }, 5000);
  }

  /**
   * Schedule the next bump reminder based on database state
   */
  scheduleNextReminder(client, guildId) {
    if (this.timers.has(guildId)) {
      clearTimeout(this.timers.get(guildId));
      this.timers.delete(guildId);
    }

    const bumpConfig = db.getBumpConfig(guildId);
    if (!bumpConfig.enabled) return;

    const now = Date.now();
    let delay = this.intervalMs;

    if (bumpConfig.nextBumpTime) {
      const remaining = bumpConfig.nextBumpTime - now;
      if (remaining > 0) {
        delay = remaining;
      } else {
        // Was due while bot was offline
        delay = 1000; // Trigger almost immediately
      }
    }

    console.log(`[BumpReminder] Next reminder for guild ${guildId} scheduled in ${Math.round(delay / 1000 / 60)} minutes.`);

    const timer = setTimeout(async () => {
      await this.sendReminder(client, guildId);
    }, delay);

    this.timers.set(guildId, timer);
  }

  /**
   * Send the bump reminder embed and button
   */
  async sendReminder(client, guildId) {
    try {
      const bumpConfig = db.getBumpConfig(guildId);
      const channelId = bumpConfig.channelId || this.defaultChannelId;

      const guild = client.guilds.cache.get(guildId) || await client.guilds.fetch(guildId).catch(() => null);
      if (!guild) return;

      const channel = guild.channels.cache.get(channelId) || await guild.channels.fetch(channelId).catch(() => null);
      if (!channel || !channel.isTextBased()) {
        console.warn(`[BumpReminder] Bump channel ${channelId} not found or not text-based in guild ${guildId}.`);
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(config.embedColor || '#00A8FF')
        .setTitle('🚀 Time to Bump the Server!')
        .setDescription(
          `It has been **2 hours** since the last bump!\n\n` +
          `Please support **${guild.name}** by bumping us on Disboard using </bump:302050872383242240> or typing \`/bump\`!`
        )
        .addFields(
          {
            name: '⚡ Quick Command',
            value: 'Use </bump:302050872383242240> right here in this channel.',
            inline: true
          },
          {
            name: '🌟 Server Listing',
            value: `[Credify on Disboard](${this.disboardUrl})`,
            inline: true
          }
        )
        .setImage(null)
        .setFooter({ text: config.footerText || 'Credify Portal • Fast & Secure' })
        .setTimestamp();

      const buttonRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Link)
          .setLabel('View on Disboard')
          .setURL(this.disboardUrl)
          .setEmoji('🌐')
      );

      await channel.send({
        content: '🔔 **Bump Reminder!** It\'s time to bump!',
        embeds: [embed],
        components: [buttonRow]
      });

      console.log(`[BumpReminder] Reminder successfully sent in channel ${channel.id} for guild ${guildId}.`);

      // Set next auto reminder in 2 hours if nobody bumps
      const nextTime = Date.now() + this.intervalMs;
      db.updateBumpConfig(guildId, { nextBumpTime: nextTime });
      this.scheduleNextReminder(client, guildId);
    } catch (err) {
      console.error(`[BumpReminder] Failed to send bump reminder for guild ${guildId}:`, err);
    }
  }

  /**
   * Handle when a bump is successfully completed (detected from Disboard bot)
   */
  async handleBumpSuccess(client, message, bumperUser = null) {
    const guildId = message.guild?.id;
    if (!guildId) return;

    const now = Date.now();
    const nextBumpTime = now + this.intervalMs;

    db.updateBumpConfig(guildId, {
      lastBumpTime: now,
      lastBumperId: bumperUser ? bumperUser.id : null,
      nextBumpTime: nextBumpTime
    });

    // Reset reminder timer
    this.scheduleNextReminder(client, guildId);

    const relativeTime = Math.floor(nextBumpTime / 1000);

    const confirmationEmbed = new EmbedBuilder()
      .setColor(config.successColor || '#00E676')
      .setTitle('✅ Thank You for Bumping!')
      .setDescription(
        `${bumperUser ? `Thank you <@${bumperUser.id}> for bumping **${message.guild.name}**!\n\n` : `Thank you for bumping **${message.guild.name}**!\n\n`}` +
        `⏰ I have set a reminder for **2 hours** (<t:${relativeTime}:R> / <t:${relativeTime}:t>).`
      )
      .setFooter({ text: config.footerText || 'Credify Portal • Fast & Secure' })
      .setTimestamp();

    try {
      await message.channel.send({ embeds: [confirmationEmbed] });
      console.log(`[BumpReminder] Bump recorded from ${bumperUser ? bumperUser.tag : 'unknown user'} in ${guildId}. Next bump at ${new Date(nextBumpTime).toISOString()}.`);
    } catch (err) {
      console.error('[BumpReminder] Failed to send bump confirmation message:', err);
    }
  }

  /**
   * Check if an incoming message is a Disboard bump success or message
   */
  checkMessage(client, message) {
    if (!message.guild) return;

    // Check if message is from Disboard bot
    const isDisboardBot = message.author.id === this.disboardBotId ||
      (message.author.bot && message.author.username.toLowerCase().includes('disboard'));

    if (isDisboardBot) {
      // Look at embeds
      const hasBumpEmbed = message.embeds.some(embed => {
        const desc = embed.description || '';
        const title = embed.title || '';
        return (
          desc.includes('Bump done') ||
          desc.includes('Check it on DISBOARD') ||
          desc.includes('👍') ||
          title.includes('DISBOARD') ||
          desc.includes('disboard.org')
        );
      });

      const hasContentMatch = message.content && (
        message.content.includes('Bump done') ||
        message.content.includes('Check it on DISBOARD')
      );

      if (hasBumpEmbed || hasContentMatch) {
        // Try to identify who ran the command
        let bumperUser = message.interaction?.user || null;
        if (!bumperUser && message.reference?.messageId) {
          // Check referenced message
          message.channel.messages.fetch(message.reference.messageId)
            .then(refMsg => {
              this.handleBumpSuccess(client, message, refMsg.author);
            })
            .catch(() => {
              this.handleBumpSuccess(client, message, null);
            });
          return;
        }

        this.handleBumpSuccess(client, message, bumperUser);
      }
    }
  }
}

module.exports = new BumpReminder();
