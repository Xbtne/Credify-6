const { EmbedBuilder } = require('discord.js');
const config = require('../config.json');

module.exports = {
  createSuccessEmbed(title, description) {
    return new EmbedBuilder()
      .setColor(config.successColor)
      .setTitle(`✅ ${title}`)
      .setDescription(description)
      .setTimestamp()
      .setFooter({ text: config.footerText });
  },

  createErrorEmbed(title, description) {
    return new EmbedBuilder()
      .setColor(config.errorColor)
      .setTitle(`❌ ${title}`)
      .setDescription(description)
      .setTimestamp()
      .setFooter({ text: config.footerText });
  },

  createWarningEmbed(title, description) {
    return new EmbedBuilder()
      .setColor(config.warningColor)
      .setTitle(`⚠️ ${title}`)
      .setDescription(description)
      .setTimestamp()
      .setFooter({ text: config.footerText });
  },

  createInfoEmbed(title, description) {
    return new EmbedBuilder()
      .setColor(config.embedColor)
      .setTitle(title)
      .setDescription(description)
      .setTimestamp()
      .setFooter({ text: config.footerText });
  },

  createModlogEmbed(action, target, moderator, reason, extraFields = []) {
    const embed = new EmbedBuilder()
      .setColor(
        action.toLowerCase().includes('ban') || action.toLowerCase().includes('kick')
          ? config.errorColor
          : action.toLowerCase().includes('warn') || action.toLowerCase().includes('timeout')
          ? config.warningColor
          : config.embedColor
      )
      .setTitle(`🛡️ Moderation Log: ${action}`)
      .addFields(
        { name: 'Target User', value: `${target.tag || target.user?.tag || target.id} (\`${target.id}\`)`, inline: true },
        { name: 'Moderator', value: `${moderator.tag || moderator.user?.tag || moderator.id} (\`${moderator.id}\`)`, inline: true },
        { name: 'Reason', value: reason || 'No reason specified', inline: false },
        ...extraFields
      )
      .setTimestamp()
      .setFooter({ text: config.footerText });
    return embed;
  }
};
