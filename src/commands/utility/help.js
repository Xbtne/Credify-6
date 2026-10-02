const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Display available commands and features'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(config.embedColor)
      .setTitle('📚 Credify Bot Command Reference')
      .setDescription(
        'Credify is a high-performance Discord bot featuring an interactive **Support & Purchase Ticket System** and **Full Moderation Suite**.\n\n' +
        'Select a category below or explore the command categories:'
      )
      .addFields(
        {
          name: '🎫 Ticket System',
          value:
            '`/ticketssetup` - Deploy the 2-button ticket portal (Support & Purchase)\n' +
            '`/ticket add` - Add a member to the current ticket\n' +
            '`/ticket remove` - Remove a member from the ticket\n' +
            '`/ticket close` - Close the current ticket\n' +
            '`/ticket claim` - Claim ticket as staff\n' +
            '`/ticket transcript` - Export text chat transcript\n' +
            '`/ticket rename` - Rename the ticket channel',
          inline: false
        },
        {
          name: '🛡️ Moderation Suite',
          value:
            '`/ban` - Ban a member from the guild\n' +
            '`/unban` - Unban a user by ID\n' +
            '`/kick` - Kick a member\n' +
            '`/timeout` - Timeout/mute a member (e.g., 10m, 1h, 1d)\n' +
            '`/untimeout` - Remove active timeout\n' +
            '`/warn` - Issue formal warning\n' +
            '`/warnings` - View user warning history\n' +
            '`/clearwarns` - Clear warnings for a user\n' +
            '`/purge` - Bulk delete messages with filters\n' +
            '`/lock` / `/unlock` - Lockdown or restore a channel\n' +
            '`/slowmode` - Set channel chat slowmode cooldown\n' +
            '`/nick` - Change or reset a member nickname\n' +
            '`/nuke` - Recreate & wipe channel messages\n' +
            '`/setlogs` - Set channel for moderation logging',
          inline: false
        },
        {
          name: '⚡ Utility',
          value:
            '`/stock` - Post live product stock and inventory update\n' +
            '`/bumpreminder` - View bump countdown status and settings\n' +
            '`/help` - View this help menu\n' +
            '`/ping` - View bot latency & API ping\n' +
            '`/botinfo` - System info & bot statistics',
          inline: false
        }
      )
      .setFooter({ text: config.footerText })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
