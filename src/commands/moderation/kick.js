const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed, createModlogEmbed } = require('../../utils/embeds');
const db = require('../../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the server')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption((opt) =>
      opt.setName('target').setDescription('The member to kick').setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName('reason').setDescription('Reason for the kick').setRequired(false)
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

    if (targetUser.id === interaction.user.id) {
      return interaction.reply({
        embeds: [createErrorEmbed('Invalid Target', 'You cannot kick yourself.')],
        ephemeral: true
      });
    }

    if (!targetMember.kickable) {
      return interaction.reply({
        embeds: [createErrorEmbed('Permission Denied', 'I cannot kick this user due to role hierarchy.')],
        ephemeral: true
      });
    }

    if (
      targetMember.roles.highest.position >= interaction.member.roles.highest.position &&
      interaction.guild.ownerId !== interaction.user.id
    ) {
      return interaction.reply({
        embeds: [createErrorEmbed('Permission Denied', 'You cannot kick a member with equal or higher role than yours.')],
        ephemeral: true
      });
    }

    try {
      await targetUser.send({
        embeds: [
          createErrorEmbed(
            `Kicked from ${interaction.guild.name}`,
            `You have been kicked.\n**Reason:** ${reason}\n**Moderator:** ${interaction.user.tag}`
          )
        ]
      }).catch(() => {});

      await targetMember.kick(`${reason} | By: ${interaction.user.tag}`);

      const modlogId = db.getModlogsChannel(interaction.guild.id);
      if (modlogId) {
        const logChan = interaction.guild.channels.cache.get(modlogId);
        if (logChan) {
          await logChan.send({
            embeds: [createModlogEmbed('Kick', targetUser, interaction.user, reason)]
          });
        }
      }

      return interaction.reply({
        embeds: [
          createSuccessEmbed(
            'Member Kicked',
            `**${targetUser.tag}** (\`${targetUser.id}\`) has been kicked.\n**Reason:** ${reason}`
          )
        ]
      });
    } catch (err) {
      console.error('[Kick] Error:', err);
      return interaction.reply({
        embeds: [createErrorEmbed('Kick Failed', `An error occurred: ${err.message}`)],
        ephemeral: true
      });
    }
  }
};
