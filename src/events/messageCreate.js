const { Events } = require('discord.js');
const bumpReminder = require('../utils/bumpReminder');

module.exports = {
  name: Events.MessageCreate,
  async execute(message, client) {
    // Check for Disboard bump notifications
    bumpReminder.checkMessage(client, message);
  }
};
