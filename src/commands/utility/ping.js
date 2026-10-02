const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check bot latency and Discord API response time'),

  async execute(interaction) {
    const sent = await interaction.reply({ content: '🏓 Pinging...', fetchReply: true });
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const apiPing = Math.round(interaction.client.ws.ping);

    const embed = new EmbedBuilder()
      .setColor(config.embedColor)
      .setTitle('🏓 Pong!')
      .addFields(
        { name: '⏱️ Roundtrip Latency', value: `\`${latency}ms\``, inline: true },
        { name: '🌐 Discord API Ping', value: `\`${apiPing}ms\``, inline: true }
      )
      .setTimestamp()
      .setFooter({ text: config.footerText });

    return interaction.editReply({ content: null, embeds: [embed] });
  }
};
