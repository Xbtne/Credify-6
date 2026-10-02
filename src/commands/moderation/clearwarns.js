const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../utils/database');
const { createSuccessEmbed, createErrorEmbed, createModlogEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clearwarns')
    .setDescription("Clear all warnings for a user")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((opt) =>
      opt.setName('target').setDescription('The user whose warnings will be cleared').setRequired(true)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('target');
    const cleared = db.clearWarnings(interaction.guild.id, targetUser.id);

    if (cleared === 0) {
      return interaction.reply({
        embeds: [createErrorEmbed('No Warnings', `**${targetUser.tag}** does not have any warnings to clear.`)],
        ephemeral: true
      });
    }

    const modlogId = db.getModlogsChannel(interaction.guild.id);
    if (modlogId) {
      const logChan = interaction.guild.channels.cache.get(modlogId);
      if (logChan) {
        await logChan.send({
          embeds: [
            createModlogEmbed('Clear Warnings', targetUser, interaction.user, `Cleared ${cleared} warning(s).`)
          ]
        });
      }
    }

    return interaction.reply({
      embeds: [
        createSuccessEmbed(
          'Warnings Cleared',
          `Successfully cleared **${cleared}** warning(s) for **${targetUser.tag}**.`
        )
      ]
    });
  }
};
