const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType
} = require('discord.js');
const ticketManager = require('../../utils/ticketManager');
const db = require('../../utils/database');
const { createSuccessEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticketssetup')
    .setDescription('Set up the Support & Purchase ticket portal')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((option) =>
      option
        .setName('channel')
        .setDescription('Channel where the ticket panel will be sent')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .addRoleOption((option) =>
      option
        .setName('staff_role')
        .setDescription('Role that will handle and see the tickets')
        .setRequired(false)
    )
    .addChannelOption((option) =>
      option
        .setName('support_category')
        .setDescription('Category where Support tickets will be opened')
        .addChannelTypes(ChannelType.GuildCategory)
        .setRequired(false)
    )
    .addChannelOption((option) =>
      option
        .setName('purchase_category')
        .setDescription('Category where Purchase tickets will be opened')
        .addChannelTypes(ChannelType.GuildCategory)
        .setRequired(false)
    )
    .addChannelOption((option) =>
      option
        .setName('log_channel')
        .setDescription('Channel where ticket transcripts and logs will be sent')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    ),

  async execute(interaction) {
    const targetChannel = interaction.options.getChannel('channel');
    const staffRole = interaction.options.getRole('staff_role');
    const supportCategory = interaction.options.getChannel('support_category');
    const purchaseCategory = interaction.options.getChannel('purchase_category');
    const logChannel = interaction.options.getChannel('log_channel');

    // Update settings in database
    const updates = {};
    if (staffRole) updates.staffRole = staffRole.id;
    if (supportCategory) updates.supportCategory = supportCategory.id;
    if (purchaseCategory) updates.purchaseCategory = purchaseCategory.id;
    if (logChannel) updates.logChannel = logChannel.id;

    if (Object.keys(updates).length > 0) {
      db.updateTicketConfig(interaction.guild.id, updates);
    }

    // Send the panel
    const panelPayload = ticketManager.getPanelComponents();
    await targetChannel.send(panelPayload);

    let configDetails = `Panel has been deployed to ${targetChannel}.\n\n**Configuration applied:**\n`;
    configDetails += `• Staff Role: ${staffRole ? `<@&${staffRole.id}>` : '*Not set (Default Admin)*'}\n`;
    configDetails += `• Support Category: ${supportCategory ? supportCategory.name : '*Default (None)*'}\n`;
    configDetails += `• Purchase Category: ${purchaseCategory ? purchaseCategory.name : '*Default (None)*'}\n`;
    configDetails += `• Log Channel: ${logChannel ? `<#${logChannel.id}>` : '*Not set*'}`;

    return interaction.reply({
      embeds: [createSuccessEmbed('Ticket Portal Configured', configDetails)],
      ephemeral: true
    });
  }
};
