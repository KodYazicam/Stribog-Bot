const { REST, Routes } = require('discord.js');
const { readdirSync, statSync } = require('fs');
const { join } = require('path');
require('dotenv').config();

if (!process.env.TOKEN || !process.env.CLIENT_ID) {
    console.error('Missing TOKEN or CLIENT_ID. Copy .env.example to .env.');
    process.exit(1);
}

const commands = [];
const commandsPath = join(__dirname, 'commands');
const commandFolders = readdirSync(commandsPath);

    for (const folder of commandFolders) {
        const folderPath = join(commandsPath, folder);
        if (!statSync(folderPath).isDirectory()) continue;
        const commandFiles = readdirSync(folderPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = join(folderPath, file);
        const command = require(filePath);

        if ('data' in command && 'execute' in command) {
            commands.push(command.data.toJSON());
        }
    }
}

const rest = new REST().setToken(process.env.TOKEN);

(async () => {
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        if (process.env.GUILD_ID) {
            const data = await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
                { body: commands }
            );
            console.log(`Successfully reloaded ${data.length} guild commands.`);
        } else {
            const data = await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                { body: commands }
            );
            console.log(`Successfully reloaded ${data.length} global commands.`);
        }
    } catch (error) {
        console.error(error);
    }
})();
