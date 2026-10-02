const fs = require('fs');
const path = require('path');
const { Collection, REST, Routes } = require('discord.js');

module.exports = async (client) => {
  client.commands = new Collection();
  const commandsArray = [];

  const commandsPath = path.join(__dirname, '../commands');
  const commandFolders = fs.readdirSync(commandsPath);

  for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    if (!fs.statSync(folderPath).isDirectory()) continue;

    const commandFiles = fs.readdirSync(folderPath).filter((file) => file.endsWith('.js'));
    for (const file of commandFiles) {
      const filePath = path.join(folderPath, file);
      const command = require(filePath);

      if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        commandsArray.push(command.data.toJSON());
        console.log(`[Commands] Loaded: /${command.data.name} (${folder})`);
      } else {
        console.warn(`[Commands] The command at ${filePath} is missing "data" or "execute".`);
      }
    }
  }

  // Register commands when bot starts or when token is loaded
  client.registerSlashCommands = async () => {
    const token = process.env.DISCORD_TOKEN;
    const clientId = process.env.CLIENT_ID || client.user?.id;
    const guildId = process.env.GUILD_ID;

    if (!token || !clientId) {
      console.warn('[Commands] DISCORD_TOKEN or CLIENT_ID is missing. Skipping auto-registration.');
      return;
    }

    const rest = new REST({ version: '10' }).setToken(token);

    try {
      console.log(`[Commands] Started refreshing ${commandsArray.length} application (/) commands.`);

      if (guildId) {
        // Fast instant update for guild
        await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
          body: commandsArray
        });
        console.log(`[Commands] Successfully registered commands to guild: ${guildId}`);
      } else {
        // Global registration
        await rest.put(Routes.applicationCommands(clientId), {
          body: commandsArray
        });
        console.log('[Commands] Successfully registered commands globally.');
      }
    } catch (error) {
      console.error('[Commands] Error registering slash commands:', error);
    }
  };
};
