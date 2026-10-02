const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed, createModlogEmbed } = require('../../utils/embeds');
const db = require('../../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Set slowmode cooldown for a channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addIntegerOption((opt) =>
      opt
        .setName('seconds')
        .setDescription('Slowmode cooldown in seconds (0 to disable, max 21600 = 6 hours)')
        .setMinValue(0)
        .setMaxValue(21600)
        .setRequired(true)
    )
    .addChannelOption((opt) =>
      opt
        .setName('channel')
        .setDescription('Channel to apply slowmode (defaults to current)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    ),

  async execute(interaction) {
    const seconds = interaction.options.getInteger('seconds');
    const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

    try {
      await targetChannel.setRateLimitPerUser(seconds);

      const modlogId = db.getModlogsChannel(interaction.guild.id);
      if (modlogId) {
        const logChan = interaction.guild.channels.cache.get(modlogId);
        if (logChan) {
          await logChan.send({
            embeds: [
              createModlogEmbed('Slowmode Update', interaction.user, interaction.user, `Set slowmode to ${seconds}s`, [
                { name: 'Channel', value: `<#${targetChannel.id}>`, inline: true }
              ])
            ]
          });
        }
      }

      const description =
        seconds === 0
          ? `Slowmode has been **disabled** for ${targetChannel}.`
          : `Slowmode for ${targetChannel} is now set to **${seconds} second(s)**.`;

      return interaction.reply({
        embeds: [createSuccessEmbed('Slowmode Updated', description)]
      });
    } catch (err) {
      console.error('[Slowmode] Error:', err);
      return interaction.reply({
        embeds: [createErrorEmbed('Slowmode Failed', `Could not update slowmode: ${err.message}`)],
        ephemeral: true
      });
    }
  }
};
