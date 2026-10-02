const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed, createModlogEmbed } = require('../../utils/embeds');
const db = require('../../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Issue a formal warning to a user')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((opt) =>
      opt.setName('target').setDescription('The user to warn').setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName('reason').setDescription('Reason for the warning').setRequired(true)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason');

    if (targetUser.bot) {
      return interaction.reply({
        embeds: [createErrorEmbed('Invalid Target', 'You cannot warn bot accounts.')],
        ephemeral: true
      });
    }

    if (targetUser.id === interaction.user.id) {
      return interaction.reply({
        embeds: [createErrorEmbed('Invalid Target', 'You cannot warn yourself.')],
        ephemeral: true
      });
    }

    const warn = db.addWarning(interaction.guild.id, targetUser.id, reason, interaction.user.id);
    const totalWarns = db.getWarnings(interaction.guild.id, targetUser.id).length;

    // Send DM if possible
    try {
      await targetUser.send({
        embeds: [
          createErrorEmbed(
            `Warning Received from ${interaction.guild.name}`,
            `You have received a formal warning.\n**Reason:** ${reason}\n**Total Warnings:** ${totalWarns}`
          )
        ]
      });
    } catch {}

    const modlogId = db.getModlogsChannel(interaction.guild.id);
    if (modlogId) {
      const logChan = interaction.guild.channels.cache.get(modlogId);
      if (logChan) {
        await logChan.send({
          embeds: [
            createModlogEmbed('Warning', targetUser, interaction.user, reason, [
              { name: 'Warn ID', value: `#${warn.id}`, inline: true },
              { name: 'Total Warnings', value: `${totalWarns}`, inline: true }
            ])
          ]
        });
      }
    }

    return interaction.reply({
      embeds: [
        createSuccessEmbed(
          'Warning Issued',
          `**${targetUser.tag}** has been warned.\n**Reason:** ${reason}\n**Total Warnings:** ${totalWarns} (Warn ID: \`#${warn.id}\`)`
        )
      ]
    });
  }
};
