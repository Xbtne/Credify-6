const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const db = require('../../utils/database');
const { createSuccessEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setlogs')
    .setDescription('Set the channel for moderation logs')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((opt) =>
      opt
        .setName('channel')
        .setDescription('Channel where moderation logs will be dispatched')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    db.setModlogsChannel(interaction.guild.id, channel.id);

    return interaction.reply({
      embeds: [
        createSuccessEmbed(
          'Modlogs Configured',
          `Moderation actions will now be logged to ${channel}.`
        )
      ],
      ephemeral: true
    });
  }
};
