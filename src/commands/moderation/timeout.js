const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const ms = require('ms');
const { createSuccessEmbed, createErrorEmbed, createModlogEmbed } = require('../../utils/embeds');
const db = require('../../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Timeout (mute) a member in the server')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((opt) =>
      opt.setName('target').setDescription('The member to timeout').setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName('duration')
        .setDescription('Duration of timeout (e.g., 60s, 10m, 2h, 1d, 7d)')
        .setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName('reason').setDescription('Reason for the timeout').setRequired(false)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('target');
    const durationInput = interaction.options.getString('duration');
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
        embeds: [createErrorEmbed('Invalid Target', 'You cannot timeout yourself.')],
        ephemeral: true
      });
    }

    const durationMs = ms(durationInput);
    if (!durationMs || durationMs < 1000 || durationMs > 28 * 24 * 60 * 60 * 1000) {
      return interaction.reply({
        embeds: [
          createErrorEmbed(
            'Invalid Duration',
            'Please provide a valid duration between `1 second` and `28 days` (e.g., `10m`, `2h`, `1d`).'
          )
        ],
        ephemeral: true
      });
    }

    if (!targetMember.moderatable) {
      return interaction.reply({
        embeds: [createErrorEmbed('Permission Denied', 'I cannot moderate/timeout this user due to role hierarchy.')],
        ephemeral: true
      });
    }

    if (
      targetMember.roles.highest.position >= interaction.member.roles.highest.position &&
      interaction.guild.ownerId !== interaction.user.id
    ) {
      return interaction.reply({
        embeds: [createErrorEmbed('Permission Denied', 'You cannot timeout a member with equal or higher role than yours.')],
        ephemeral: true
      });
    }

    try {
      await targetMember.timeout(durationMs, `${reason} | By: ${interaction.user.tag}`);

      const modlogId = db.getModlogsChannel(interaction.guild.id);
      if (modlogId) {
        const logChan = interaction.guild.channels.cache.get(modlogId);
        if (logChan) {
          await logChan.send({
            embeds: [
              createModlogEmbed('Timeout', targetUser, interaction.user, reason, [
                { name: 'Duration', value: `${durationInput} (\`${ms(durationMs, { long: true })}\`)`, inline: true }
              ])
            ]
          });
        }
      }

      return interaction.reply({
        embeds: [
          createSuccessEmbed(
            'Member Timed Out',
            `**${targetUser.tag}** has been timed out for **${ms(durationMs, { long: true })}**.\n**Reason:** ${reason}`
          )
        ]
      });
    } catch (err) {
      console.error('[Timeout] Error:', err);
      return interaction.reply({
        embeds: [createErrorEmbed('Timeout Failed', `An error occurred: ${err.message}`)],
        ephemeral: true
      });
    }
  }
};
