const { Events } = require('discord.js');
const bumpReminder = require('../utils/bumpReminder');

module.exports = {
  name: Events.MessageUpdate,
  async execute(oldMessage, newMessage, client) {
    // Check updated message for Disboard bump notifications
    bumpReminder.checkMessage(client, newMessage);
  }
};
