const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../utils/database');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription("View a user's warning history")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((opt) =>
      opt.setName('target').setDescription('The user to view warnings for').setRequired(true)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('target');
    const warnings = db.getWarnings(interaction.guild.id, targetUser.id);

    if (warnings.length === 0) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.successColor)
            .setTitle(`🛡️ Warnings: ${targetUser.tag}`)
            .setDescription(`**${targetUser.tag}** has a clean record with **0** warnings.`)
            .setTimestamp()
        ]
      });
    }

    const embed = new EmbedBuilder()
      .setColor(config.warningColor)
      .setTitle(`⚠️ Warnings: ${targetUser.tag} (${warnings.length} total)`)
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .setTimestamp()
      .setFooter({ text: config.footerText });

    const warnList = warnings
      .map(
        (w) =>
          `**#${w.id}** • <t:${Math.floor(w.timestamp / 1000)}:R>\n` +
          `• **Reason:** ${w.reason}\n` +
          `• **Moderator:** <@${w.moderatorId}>\n`
      )
      .join('\n');

    embed.setDescription(warnList.slice(0, 4000));

    return interaction.reply({ embeds: [embed] });
  }
};
