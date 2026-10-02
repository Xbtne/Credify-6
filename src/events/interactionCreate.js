const { Events } = require('discord.js');
const ticketManager = require('../utils/ticketManager');
const { createErrorEmbed } = require('../utils/embeds');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    // 1. Handle Slash Commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) {
        console.error(`[Interaction] No command matching ${interaction.commandName} was found.`);
        return;
      }

      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(`[Interaction] Error executing ${interaction.commandName}:`, error);
        const errorPayload = {
          embeds: [createErrorEmbed('Command Error', 'An error occurred while executing this command.')],
          ephemeral: true
        };

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorPayload).catch(() => {});
        } else {
          await interaction.reply(errorPayload).catch(() => {});
        }
      }
      return;
    }

    // 2. Handle Buttons
    if (interaction.isButton()) {
      const { customId } = interaction;

      try {
        if (customId === 'ticket_create_support') {
          return await ticketManager.createTicket(interaction, 'support');
        }

        if (customId === 'ticket_create_purchase') {
          return await ticketManager.createTicket(interaction, 'purchase');
        }

        if (customId === 'ticket_close_confirm') {
          return await ticketManager.handleCloseConfirm(interaction);
        }

        if (customId === 'ticket_close_execute') {
          return await ticketManager.handleCloseExecute(interaction);
        }

        if (customId === 'ticket_close_cancel') {
          return await interaction.update({
            content: '❌ Ticket close cancelled.',
            components: []
          });
        }

        if (customId === 'ticket_claim') {
          return await ticketManager.handleClaim(interaction);
        }

        if (customId === 'ticket_lock_toggle') {
          return await ticketManager.handleLockToggle(interaction);
        }

        if (customId === 'ticket_transcript') {
          return await ticketManager.handleTranscript(interaction);
        }

        if (customId === 'ticket_reopen') {
          return await ticketManager.handleReopen(interaction);
        }

        if (customId === 'ticket_delete') {
          return await ticketManager.handleDelete(interaction);
        }
      } catch (err) {
        console.error('[Button Error]:', err);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: '❌ An error occurred processing this button action.',
            ephemeral: true
          }).catch(() => {});
        }
      }
    }
  }
};
