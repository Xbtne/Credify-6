const { Events, ActivityType } = require('discord.js');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`========================================`);
    console.log(`🚀 Credify Bot is ONLINE!`);
    console.log(`🤖 Logged in as: ${client.user.tag} (${client.user.id})`);
    console.log(`🌐 Serving in ${client.guilds.cache.size} server(s)`);
    console.log(`========================================`);

    // Set rich presence
    client.user.setPresence({
      activities: [
        {
          name: 'Credify Support & Tickets | /help',
          type: ActivityType.Watching
        }
      ],
      status: 'online'
    });

    // Auto-register slash commands
    if (client.registerSlashCommands) {
      await client.registerSlashCommands();
    }
  }
};
