const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} = require('discord.js');
const db = require('../../utils/database');
const ticketManager = require('../../utils/ticketManager');
const config = require('../../config.json');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Manage the current ticket')
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Add a user to this ticket')
        .addUserOption((opt) =>
          opt.setName('user').setDescription('User to add').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Remove a user from this ticket')
        .addUserOption((opt) =>
          opt.setName('user').setDescription('User to remove').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('rename')
        .setDescription('Rename this ticket channel')
        .addStringOption((opt) =>
          opt.setName('name').setDescription('New channel name').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('close').setDescription('Close this ticket')
    )
    .addSubcommand((sub) =>
      sub.setName('transcript').setDescription('Generate transcript for this ticket')
    )
    .addSubcommand((sub) =>
      sub.setName('claim').setDescription('Claim or unclaim this ticket')
    ),

  async execute(interaction) {
    const { guild, channel, member, options } = interaction;
    const subcommand = options.getSubcommand();
    const ticket = db.getTicket(guild.id, channel.id);

    if (!ticket && subcommand !== 'close') {
      return interaction.reply({
        embeds: [createErrorEmbed('Invalid Channel', 'This command can only be used inside an active ticket channel.')],
        ephemeral: true
      });
    }

    const ticketConfig = db.getTicketConfig(guild.id);
    const isStaff =
      member.permissions.has(PermissionFlagsBits.ManageChannels) ||
      (ticketConfig.staffRole && member.roles.cache.has(ticketConfig.staffRole));

    if (subcommand === 'add') {
      if (!isStaff && ticket.authorId !== member.id) {
        return interaction.reply({ content: '❌ You do not have permission to add users to this ticket.', ephemeral: true });
      }
      const targetUser = options.getUser('user');
      await channel.permissionOverwrites.edit(targetUser.id, {
        ViewChannel: true,
        SendMessages: true,
        AttachFiles: true,
        ReadMessageHistory: true
      });
      return interaction.reply({
        embeds: [createSuccessEmbed('User Added', `<@${targetUser.id}> has been granted access to this ticket.`)]
      });
    }

    if (subcommand === 'remove') {
      if (!isStaff && ticket.authorId !== member.id) {
        return interaction.reply({ content: '❌ You do not have permission to remove users from this ticket.', ephemeral: true });
      }
      const targetUser = options.getUser('user');
      if (targetUser.id === ticket.authorId) {
        return interaction.reply({ content: '❌ You cannot remove the ticket creator.', ephemeral: true });
      }
      await channel.permissionOverwrites.delete(targetUser.id);
      return interaction.reply({
        embeds: [createSuccessEmbed('User Removed', `<@${targetUser.id}> has been removed from this ticket.`)]
      });
    }

    if (subcommand === 'rename') {
      if (!isStaff) {
        return interaction.reply({ content: '❌ Only staff can rename tickets.', ephemeral: true });
      }
      const newName = options.getString('name').toLowerCase().replace(/[^a-z0-9-_]/g, '-');
      await channel.setName(newName);
      return interaction.reply({
        embeds: [createSuccessEmbed('Ticket Renamed', `Channel has been renamed to \`#${newName}\`.`)]
      });
    }

    if (subcommand === 'close') {
      return ticketManager.handleCloseConfirm(interaction);
    }

    if (subcommand === 'transcript') {
      return ticketManager.handleTranscript(interaction);
    }

    if (subcommand === 'claim') {
      return ticketManager.handleClaim(interaction);
    }
  }
};
