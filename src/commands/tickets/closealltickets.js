const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../utils/database');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('closealltickets')
    .setDescription('Close and delete all open ticket channels in the server')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const channels = await interaction.guild.channels.fetch();
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
          await ch.delete('Closed all tickets via command').catch(() => {});
          deletedCount++;
        }
      }

      // Clear ticket records in database
      const gData = db.getGuild(interaction.guild.id);
      gData.tickets = {};
      db._write();

      return interaction.editReply({
        embeds: [
          createSuccessEmbed(
            'All Tickets Closed',
            `Successfully closed and deleted **${deletedCount}** ticket channel(s) and cleared the active ticket database.`
          )
        ]
      });
    } catch (err) {
      console.error('[CloseAllTickets] Error:', err);
      return interaction.editReply({
        embeds: [createErrorEmbed('Failed to Close Tickets', err.message)]
      });
    }
  }
};
