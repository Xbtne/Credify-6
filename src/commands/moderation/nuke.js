const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed, createModlogEmbed } = require('../../utils/embeds');
const db = require('../../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nuke')
    .setDescription('Recreate the current channel to wipe all messages')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addBooleanOption((opt) =>
      opt
        .setName('confirm')
        .setDescription('Confirm that you want to nuke this channel')
        .setRequired(true)
    ),

  async execute(interaction) {
    const confirm = interaction.options.getBoolean('confirm');
    const channel = interaction.channel;

    if (!confirm) {
      return interaction.reply({
        embeds: [createErrorEmbed('Nuke Cancelled', 'You must set confirm to True to execute a nuke.')],
        ephemeral: true
      });
    }

    try {
      const position = channel.position;
      const topic = channel.topic;
      const parent = channel.parent;
      const permissionOverwrites = channel.permissionOverwrites.cache;
      const name = channel.name;

      await interaction.reply({
        content: '💣 Nuking channel in 3 seconds...',
        ephemeral: false
      });

      const cloned = await channel.clone({
        name,
        parent,
        topic,
        position,
        permissionOverwrites: Array.from(permissionOverwrites.values())
      });

      await channel.delete('Channel nuked by staff.');

      await cloned.send({
        embeds: [
          createSuccessEmbed(
            'Channel Nuked',
            `This channel was recreated by <@${interaction.user.id}>.\nAll previous messages were purged.`
          ).setImage('https://media.giphy.com/media/XUFPGrX5Zis6Y/giphy.gif')
        ]
      });

      const modlogId = db.getModlogsChannel(interaction.guild.id);
      if (modlogId) {
        const logChan = interaction.guild.channels.cache.get(modlogId);
        if (logChan) {
          await logChan.send({
            embeds: [
              createModlogEmbed('Channel Nuke', interaction.user, interaction.user, 'Channel recreated & cleared', [
                { name: 'Channel', value: `#${name}`, inline: true }
              ])
            ]
          });
        }
      }
    } catch (err) {
      console.error('[Nuke] Error:', err);
    }
  }
};
