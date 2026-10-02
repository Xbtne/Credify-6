const { SlashCommandBuilder, EmbedBuilder, version: djsVersion } = require('discord.js');
const os = require('os');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('botinfo')
    .setDescription('Display information and metrics about Credify bot'),

  async execute(interaction) {
    const totalGuilds = interaction.client.guilds.cache.size;
    const totalUsers = interaction.client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);
    const uptime = process.uptime();
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    const uptimeString = `${days}d ${hours}h ${minutes}m ${seconds}s`;

    const memoryUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);

    const embed = new EmbedBuilder()
      .setColor(config.embedColor)
      .setTitle('📊 Credify System Statistics')
      .setThumbnail(interaction.client.user.displayAvatarURL())
      .addFields(
        { name: '🤖 Bot Name', value: `${interaction.client.user.username}`, inline: true },
        { name: '🆔 Bot ID', value: `\`${interaction.client.user.id}\``, inline: true },
        { name: '⏳ Uptime', value: `\`${uptimeString}\``, inline: true },
        { name: '🌐 Guilds', value: `\`${totalGuilds}\``, inline: true },
        { name: '👥 Total Users', value: `\`${totalUsers.toLocaleString()}\``, inline: true },
        { name: '💾 Memory Usage', value: `\`${memoryUsage} MB\``, inline: true },
        { name: '⚙️ Node.js', value: `\`${process.version}\``, inline: true },
        { name: '📦 Discord.js', value: `\`v${djsVersion}\``, inline: true },
        { name: '🖥️ Platform', value: `\`${os.platform()} (${os.arch()})\``, inline: true }
      )
      .setFooter({ text: config.footerText })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
