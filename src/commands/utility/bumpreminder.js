const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const config = require('../../config.json');
const db = require('../../utils/database');
const bumpReminder = require('../../utils/bumpReminder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bumpreminder')
    .setDescription('Disboard bump reminder configuration & status')
    .addSubcommand(sub =>
      sub
        .setName('status')
        .setDescription('Check the current bump reminder countdown and next bump time')
    )
    .addSubcommand(sub =>
      sub
        .setName('test')
        .setDescription('Send a test bump reminder in the configured channel')
    )
    .addSubcommand(sub =>
      sub
        .setName('setchannel')
        .setDescription('Set the channel for bump reminders')
        .addChannelOption(opt =>
          opt
            .setName('channel')
            .setDescription('The text channel where bump reminders will be sent')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    const bumpConfig = db.getBumpConfig(guildId);

    if (sub === 'status') {
      const now = Date.now();
      const nextTime = bumpConfig.nextBumpTime;
      const channelId = bumpConfig.channelId || config.bumpReminder?.channelId || '1555699939978387625';
      const disboardUrl = config.bumpReminder?.disboardUrl || 'https://disboard.org/server/1555647999915593728';

      let statusDescription = '';
      if (!nextTime || nextTime <= now) {
        statusDescription = '🟢 **The server is ready to be bumped right now!**\n\nRun </bump:302050872383242240> in <#' + channelId + '> to bump!';
      } else {
        const unixSec = Math.floor(nextTime / 1000);
        statusDescription = `⏳ **Next bump is ready <t:${unixSec}:R>** (<t:${unixSec}:t>)\n\nChannel: <#${channelId}>`;
      }

      if (bumpConfig.lastBumperId) {
        statusDescription += `\n👤 Last bumped by: <@${bumpConfig.lastBumperId}>`;
      }

      const embed = new EmbedBuilder()
        .setColor(config.embedColor)
        .setTitle('🚀 Disboard Bump Status')
        .setDescription(statusDescription)
        .addFields({
          name: 'Disboard Link',
          value: `[Credify Server Page](${disboardUrl})`
        })
        .setFooter({ text: config.footerText })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Link)
          .setLabel('View on Disboard')
          .setURL(disboardUrl)
          .setEmoji('🌐')
      );

      return interaction.reply({ embeds: [embed], components: [row] });
    }

    if (sub === 'test') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({
          content: '❌ You need `Manage Server` permissions to run this test.',
          ephemeral: true
        });
      }

      await interaction.deferReply({ ephemeral: true });
      await bumpReminder.sendReminder(interaction.client, guildId);
      return interaction.editReply({
        content: '✅ Test bump reminder successfully sent!'
      });
    }

    if (sub === 'setchannel') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({
          content: '❌ You need `Manage Server` permissions to change the bump channel.',
          ephemeral: true
        });
      }

      const newChannel = interaction.options.getChannel('channel');
      db.updateBumpConfig(guildId, { channelId: newChannel.id });

      return interaction.reply({
        content: `✅ Bump reminder channel has been updated to <#${newChannel.id}>.`,
        ephemeral: true
      });
    }
  }
};
