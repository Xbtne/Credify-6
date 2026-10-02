const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed, createModlogEmbed } = require('../../utils/embeds');
const db = require('../../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Bulk delete messages from the current channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption((opt) =>
      opt
        .setName('amount')
        .setDescription('Number of messages to delete (1-100)')
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    )
    .addUserOption((opt) =>
      opt
        .setName('target')
        .setDescription('Only delete messages from this specific user')
        .setRequired(false)
    )
    .addBooleanOption((opt) =>
      opt
        .setName('bots_only')
        .setDescription('Only delete messages sent by bots')
        .setRequired(false)
    ),

  async execute(interaction) {
    const amount = interaction.options.getInteger('amount');
    const target = interaction.options.getUser('target');
    const botsOnly = interaction.options.getBoolean('bots_only') || false;

    await interaction.deferReply({ ephemeral: true });

    try {
      let messages = await interaction.channel.messages.fetch({ limit: amount });

      if (target) {
        messages = messages.filter((m) => m.author.id === target.id);
      } else if (botsOnly) {
        messages = messages.filter((m) => m.author.bot);
      }

      if (messages.size === 0) {
        return interaction.editReply({
          embeds: [createErrorEmbed('No Messages Found', 'No messages found matching your purge criteria (or messages are older than 14 days).')]
        });
      }

      const deleted = await interaction.channel.bulkDelete(messages, true);

      const modlogId = db.getModlogsChannel(interaction.guild.id);
      if (modlogId) {
        const logChan = interaction.guild.channels.cache.get(modlogId);
        if (logChan) {
          await logChan.send({
            embeds: [
              createModlogEmbed('Purge', interaction.user, interaction.user, `Purged ${deleted.size} messages in #${interaction.channel.name}`, [
                { name: 'Channel', value: `<#${interaction.channel.id}>`, inline: true },
                { name: 'Target Filter', value: target ? `<@${target.id}>` : botsOnly ? 'Bots only' : 'None', inline: true }
              ])
            ]
          });
        }
      }

      return interaction.editReply({
        embeds: [
          createSuccessEmbed(
            'Messages Purged',
            `Successfully deleted **${deleted.size}** message(s) from ${interaction.channel}.`
          )
        ]
      });
    } catch (err) {
      console.error('[Purge] Error:', err);
      return interaction.editReply({
        embeds: [createErrorEmbed('Purge Failed', `Could not delete messages: ${err.message}`)]
      });
    }
  }
};
