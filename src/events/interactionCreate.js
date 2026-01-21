const { Collection, EmbedBuilder } = require('discord.js');
const { colors, cooldown: defaultCooldown } = require('../config/config');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);

            if (!command) {
                return interaction.reply({
                    content: 'This command no longer exists.',
                    ephemeral: true
                });
            }

            const { cooldowns } = client;

            if (!cooldowns.has(command.data.name)) {
                cooldowns.set(command.data.name, new Collection());
            }

            const now = Date.now();
            const timestamps = cooldowns.get(command.data.name);
            const cooldownAmount = (command.cooldown ?? defaultCooldown) * 1000;

            if (timestamps.has(interaction.user.id)) {
                const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

                if (now < expirationTime) {
                    const expiredTimestamp = Math.round(expirationTime / 1000);
                    return interaction.reply({
                        content: `Please wait <t:${expiredTimestamp}:R> before using \`/${command.data.name}\` again.`,
                        ephemeral: true
                    });
                }
            }

            timestamps.set(interaction.user.id, now);
            setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

            try {
                await command.execute(interaction, client);
            } catch (error) {
                console.error(`Error executing ${interaction.commandName}:`, error);

                const errorEmbed = new EmbedBuilder()
                    .setColor(colors.danger)
                    .setTitle('Error')
                    .setDescription('An error occurred while executing this command.')
                    .setTimestamp();

                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
                } else {
                    await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                }
            }
        } else if (interaction.isAutocomplete()) {
            const command = client.commands.get(interaction.commandName);

            if (!command || !command.autocomplete) return;

            try {
                await command.autocomplete(interaction, client);
            } catch (error) {
                console.error(`Autocomplete error for ${interaction.commandName}:`, error);
            }
        } else if (interaction.isButton()) {
            const [action, ...args] = interaction.customId.split('_');
            
            try {
                const buttonHandler = require(`../buttons/${action}`);
                await buttonHandler.execute(interaction, client, args);
            } catch (error) {
                if (error.code !== 'MODULE_NOT_FOUND') {
                    console.error(`Button error for ${action}:`, error);
                }
            }
        } else if (interaction.isStringSelectMenu()) {
            const [action, ...args] = interaction.customId.split('_');
            
            try {
                const menuHandler = require(`../menus/${action}`);
                await menuHandler.execute(interaction, client, args);
            } catch (error) {
                if (error.code !== 'MODULE_NOT_FOUND') {
                    console.error(`Menu error for ${action}:`, error);
                }
            }
        } else if (interaction.isModalSubmit()) {
            const [action, ...args] = interaction.customId.split('_');
            
            try {
                const modalHandler = require(`../modals/${action}`);
                await modalHandler.execute(interaction, client, args);
            } catch (error) {
                if (error.code !== 'MODULE_NOT_FOUND') {
                    console.error(`Modal error for ${action}:`, error);
                }
            }
        }
    }
};
