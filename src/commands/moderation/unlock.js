const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed, createModlogEmbed } = require('../../utils/embeds');
const db = require('../../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Unlock a previously locked channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption((opt) =>
      opt
        .setName('channel')
        .setDescription('The channel to unlock (defaults to current)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    ),

  async execute(interaction) {
    const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

    try {
      await targetChannel.permissionOverwrites.edit(interaction.guild.id, {
        SendMessages: null,
        AddReactions: null
      });

      const modlogId = db.getModlogsChannel(interaction.guild.id);
      if (modlogId) {
        const logChan = interaction.guild.channels.cache.get(modlogId);
        if (logChan) {
          await logChan.send({
            embeds: [
              createModlogEmbed('Channel Unlock', interaction.user, interaction.user, 'Lockdown lifted', [
                { name: 'Channel', value: `<#${targetChannel.id}>`, inline: true }
              ])
            ]
          });
        }
      }

      await targetChannel.send({
        embeds: [
          createSuccessEmbed(
            '🔓 Channel Unlocked',
            'The channel lockdown has ended. Regular chat permissions are restored.'
          )
        ]
      });

      return interaction.reply({
        embeds: [createSuccessEmbed('Channel Unlocked', `Successfully unlocked ${targetChannel}.`)],
        ephemeral: true
      });
    } catch (err) {
      console.error('[Unlock] Error:', err);
      return interaction.reply({
        embeds: [createErrorEmbed('Unlock Failed', `Could not unlock channel: ${err.message}`)],
        ephemeral: true
      });
    }
  }
};
