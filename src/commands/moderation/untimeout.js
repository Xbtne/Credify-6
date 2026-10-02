const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed, createModlogEmbed } = require('../../utils/embeds');
const db = require('../../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('untimeout')
    .setDescription('Remove timeout (unmute) from a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((opt) =>
      opt.setName('target').setDescription('The member to remove timeout from').setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName('reason').setDescription('Reason for removing timeout').setRequired(false)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!targetMember) {
      return interaction.reply({
        embeds: [createErrorEmbed('Invalid Member', 'This user is not currently in this server.')],
        ephemeral: true
      });
    }

    if (!targetMember.isCommunicationDisabled()) {
      return interaction.reply({
        embeds: [createErrorEmbed('Not Timed Out', 'This member does not have an active timeout.')],
        ephemeral: true
      });
    }

    try {
      await targetMember.timeout(null, `${reason} | By: ${interaction.user.tag}`);

      const modlogId = db.getModlogsChannel(interaction.guild.id);
      if (modlogId) {
        const logChan = interaction.guild.channels.cache.get(modlogId);
        if (logChan) {
          await logChan.send({
            embeds: [createModlogEmbed('Remove Timeout', targetUser, interaction.user, reason)]
          });
        }
      }

      return interaction.reply({
        embeds: [
          createSuccessEmbed(
            'Timeout Removed',
            `Timeout has been removed from **${targetUser.tag}**.\n**Reason:** ${reason}`
          )
        ]
      });
    } catch (err) {
      console.error('[Untimeout] Error:', err);
      return interaction.reply({
        embeds: [createErrorEmbed('Untimeout Failed', `An error occurred: ${err.message}`)],
        ephemeral: true
      });
    }
  }
};
