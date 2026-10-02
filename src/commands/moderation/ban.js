const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed, createModlogEmbed } = require('../../utils/embeds');
const db = require('../../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user from the server')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((opt) =>
      opt.setName('target').setDescription('The user to ban').setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName('reason').setDescription('Reason for the ban').setRequired(false)
    )
    .addIntegerOption((opt) =>
      opt
        .setName('delete_messages')
        .setDescription('Days of message history to delete (0 to 7)')
        .setMinValue(0)
        .setMaxValue(7)
        .setRequired(false)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const deleteDays = interaction.options.getInteger('delete_messages') || 0;

    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (targetUser.id === interaction.user.id) {
      return interaction.reply({
        embeds: [createErrorEmbed('Invalid Target', 'You cannot ban yourself.')],
        ephemeral: true
      });
    }

    if (targetMember) {
      if (!targetMember.bannable) {
        return interaction.reply({
          embeds: [createErrorEmbed('Permission Denied', 'I cannot ban this user due to role hierarchy or missing permissions.')],
          ephemeral: true
        });
      }

      if (
        targetMember.roles.highest.position >= interaction.member.roles.highest.position &&
        interaction.guild.ownerId !== interaction.user.id
      ) {
        return interaction.reply({
          embeds: [createErrorEmbed('Permission Denied', 'You cannot ban a member with equal or higher role than yours.')],
          ephemeral: true
        });
      }
    }

    // Try sending DM to user
    try {
      await targetUser.send({
        embeds: [
          createErrorEmbed(
            `Banned from ${interaction.guild.name}`,
            `You have been banned.\n**Reason:** ${reason}\n**Moderator:** ${interaction.user.tag}`
          )
        ]
      });
    } catch {
      // Ignored if user has DMs closed
    }

    try {
      await interaction.guild.members.ban(targetUser.id, {
        reason: `${reason} | By: ${interaction.user.tag}`,
        deleteMessageSeconds: deleteDays * 24 * 60 * 60
      });

      // Mod logs
      const modlogId = db.getModlogsChannel(interaction.guild.id);
      if (modlogId) {
        const logChan = interaction.guild.channels.cache.get(modlogId);
        if (logChan) {
          await logChan.send({
            embeds: [createModlogEmbed('Ban', targetUser, interaction.user, reason)]
          });
        }
      }

      return interaction.reply({
        embeds: [
          createSuccessEmbed(
            'User Banned',
            `**${targetUser.tag}** (\`${targetUser.id}\`) has been banned.\n**Reason:** ${reason}`
          )
        ]
      });
    } catch (err) {
      console.error('[Ban] Error:', err);
      return interaction.reply({
        embeds: [createErrorEmbed('Ban Failed', `An error occurred: ${err.message}`)],
        ephemeral: true
      });
    }
  }
};
