require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const db = require('./src/utils/database');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  console.log(`Connected to Discord as ${client.user.tag}`);
  const guildId = process.env.GUILD_ID;
  const guild = client.guilds.cache.get(guildId) || await client.guilds.fetch(guildId);

  if (!guild) {
    console.error('Guild not found');
    process.exit(1);
  }

  const channels = await guild.channels.fetch();
  let deletedCount = 0;

  for (const [id, ch] of channels) {
    if (!ch) continue;
    const name = ch.name.toLowerCase();
    if (
      name.startsWith('support-') ||
      name.startsWith('purchase-') ||
      name.startsWith('web-support-') ||
      name.startsWith('web-purchase-') ||
      name.startsWith('web-') ||
      name.startsWith('ticket-')
    ) {
      console.log(`Deleting ticket channel: #${ch.name} (${ch.id})`);
      try {
        await ch.delete('Bulk close requested by owner');
        deletedCount++;
      } catch (err) {
        console.error(`Failed to delete #${ch.name}:`, err.message);
      }
    }
  }

  // Clear database tickets for guild
  const gData = db.getGuild(guild.id);
  gData.tickets = {};
  db._write();

  console.log(`✅ Successfully closed and deleted ${deletedCount} ticket channel(s) in Discord and cleared local database!`);
  process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
