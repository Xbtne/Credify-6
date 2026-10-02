const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed, createModlogEmbed } = require('../../utils/embeds');
const db = require('../../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nick')
    .setDescription('Change or reset a member nickname')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames)
    .addUserOption((opt) =>
      opt.setName('target').setDescription('The member whose nickname to change').setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName('nickname').setDescription('The new nickname (leave empty to reset)').setRequired(false)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('target');
    const newNick = interaction.options.getString('nickname');
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!targetMember) {
      return interaction.reply({
        embeds: [createErrorEmbed('Invalid Member', 'This user is not currently in this server.')],
        ephemeral: true
      });
    }

    if (
      targetMember.roles.highest.position >= interaction.member.roles.highest.position &&
      interaction.guild.ownerId !== interaction.user.id
    ) {
      return interaction.reply({
        embeds: [createErrorEmbed('Permission Denied', 'You cannot change the nickname of someone with equal or higher role than yours.')],
        ephemeral: true
      });
    }

    try {
      const oldNick = targetMember.displayName;
      await targetMember.setNickname(newNick || null);

      const modlogId = db.getModlogsChannel(interaction.guild.id);
      if (modlogId) {
        const logChan = interaction.guild.channels.cache.get(modlogId);
        if (logChan) {
          await logChan.send({
            embeds: [
              createModlogEmbed('Nickname Change', targetUser, interaction.user, 'Nickname updated', [
                { name: 'Old Nickname', value: oldNick, inline: true },
                { name: 'New Nickname', value: newNick || '(Reset to Username)', inline: true }
              ])
            ]
          });
        }
      }

      return interaction.reply({
        embeds: [
          createSuccessEmbed(
            'Nickname Updated',
            newNick
              ? `Changed nickname of **${targetUser.tag}** to **${newNick}**.`
              : `Reset nickname of **${targetUser.tag}**.`
          )
        ]
      });
    } catch (err) {
      console.error('[Nick] Error:', err);
      return interaction.reply({
        embeds: [createErrorEmbed('Nickname Failed', `Could not update nickname: ${err.message}`)],
        ephemeral: true
      });
    }
  }
};
