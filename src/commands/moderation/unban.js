const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed, createModlogEmbed } = require('../../utils/embeds');
const db = require('../../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a user by their user ID')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption((opt) =>
      opt.setName('user_id').setDescription('The ID of the user to unban').setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName('reason').setDescription('Reason for the unban').setRequired(false)
    ),

  async execute(interaction) {
    const userId = interaction.options.getString('user_id').trim();
    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
      const banInfo = await interaction.guild.bans.fetch(userId).catch(() => null);
      if (!banInfo) {
        return interaction.reply({
          embeds: [createErrorEmbed('User Not Found', 'This user is not currently banned on this server.')],
          ephemeral: true
        });
      }

      await interaction.guild.members.unban(userId, `${reason} | By: ${interaction.user.tag}`);

      const modlogId = db.getModlogsChannel(interaction.guild.id);
      if (modlogId) {
        const logChan = interaction.guild.channels.cache.get(modlogId);
        if (logChan) {
          await logChan.send({
            embeds: [createModlogEmbed('Unban', banInfo.user, interaction.user, reason)]
          });
        }
      }

      return interaction.reply({
        embeds: [
          createSuccessEmbed(
            'User Unbanned',
            `**${banInfo.user.tag}** (\`${userId}\`) has been unbanned from the server.\n**Reason:** ${reason}`
          )
        ]
      });
    } catch (err) {
      console.error('[Unban] Error:', err);
      return interaction.reply({
        embeds: [createErrorEmbed('Unban Failed', `Could not unban user: ${err.message}`)],
        ephemeral: true
      });
    }
  }
};
