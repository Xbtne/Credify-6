require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const commandHandler = require('./src/handlers/commandHandler');
const eventHandler = require('./src/handlers/eventHandler');
const { startServer } = require('./server');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration
  ],
  partials: [Partials.Channel, Partials.Message, Partials.User, Partials.GuildMember]
});

// Uncaught exception handling to keep bot alive
process.on('unhandledRejection', (reason, promise) => {
  console.error('[AntiCrash] Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err, origin) => {
  console.error(`[AntiCrash] Uncaught Exception: ${err.message}`, `Origin: ${origin}`);
});

process.on('uncaughtExceptionMonitor', (err, origin) => {
  console.error(`[AntiCrash] Exception Monitor: ${err.message}`, `Origin: ${origin}`);
});

async function main() {
  await commandHandler(client);
  eventHandler(client);

  // Start unified Express web server with Discord client bridge
  startServer(client);

  const token = process.env.DISCORD_TOKEN;
  if (!token) {
    console.error('================================================================');
    console.error('❌ DISCORD_TOKEN is missing in your .env file!');
    console.error('👉 Please open .env and add your Discord Bot Token.');
    console.error('================================================================');
    process.exit(1);
  }

  try {
    await client.login(token);
  } catch (err) {
    console.error('❌ Failed to connect to Discord:', err.message);
  }
}

main();
