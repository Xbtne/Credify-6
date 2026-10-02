const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed, createModlogEmbed } = require('../../utils/embeds');
const db = require('../../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Lock a channel to prevent regular members from sending messages')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption((opt) =>
      opt
        .setName('channel')
        .setDescription('The channel to lock (defaults to current)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    )
    .addStringOption((opt) =>
      opt.setName('reason').setDescription('Reason for the lockdown').setRequired(false)
    ),

  async execute(interaction) {
    const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
      await targetChannel.permissionOverwrites.edit(interaction.guild.id, {
        SendMessages: false,
        AddReactions: false
      });

      const modlogId = db.getModlogsChannel(interaction.guild.id);
      if (modlogId) {
        const logChan = interaction.guild.channels.cache.get(modlogId);
        if (logChan) {
          await logChan.send({
            embeds: [
              createModlogEmbed('Channel Lock', interaction.user, interaction.user, reason, [
                { name: 'Channel', value: `<#${targetChannel.id}>`, inline: true }
              ])
            ]
          });
        }
      }

      await targetChannel.send({
        embeds: [
          createErrorEmbed(
            '🔒 Channel Locked',
            `This channel has been placed under lockdown by staff.\n**Reason:** ${reason}`
          )
        ]
      });

      return interaction.reply({
        embeds: [createSuccessEmbed('Channel Locked', `Successfully locked ${targetChannel}.`)],
        ephemeral: true
      });
    } catch (err) {
      console.error('[Lock] Error:', err);
      return interaction.reply({
        embeds: [createErrorEmbed('Lock Failed', `Could not lock channel: ${err.message}`)],
        ephemeral: true
      });
    }
  }
};
