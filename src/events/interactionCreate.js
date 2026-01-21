const { Collection, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { colors, cooldown: defaultCooldown } = require('../config/config');
const { getCommandPermissions, isCommandDisabled } = require('../utils/database');

function checkPermissions(interaction, commandName) {
    if (!interaction.guild) return { allowed: true };
    
    if (interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return { allowed: true };
    }

    const disabled = isCommandDisabled.get(interaction.guild.id, commandName, interaction.channel.id);
    if (disabled) {
        return { allowed: false, reason: 'disabled' };
    }

    const permissions = getCommandPermissions.all(interaction.guild.id, commandName);
    
    if (permissions.length === 0) {
        return { allowed: true };
    }

    const memberRoles = interaction.member.roles.cache.map(r => r.id);
    
    for (const perm of permissions) {
        if (memberRoles.includes(perm.role_id)) {
            if (perm.permission_type === 'deny') {
                return { allowed: false, reason: 'denied' };
            }
        }
    }

    const hasAllowedRole = permissions.some(p =>
        p.permission_type === 'allow' && memberRoles.includes(p.role_id)
    );

    const hasAnyAllowRule = permissions.some(p => p.permission_type === 'allow');

    if (hasAnyAllowRule && !hasAllowedRole) {
        return { allowed: false, reason: 'not_allowed' };
    }

    return { allowed: true };
}

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

            const permCheck = checkPermissions(interaction, interaction.commandName);
            if (!permCheck.allowed) {
                let message = 'You do not have permission to use this command.';
                if (permCheck.reason === 'disabled') {
                    message = 'This command is disabled in this channel/server.';
                } else if (permCheck.reason === 'denied') {
                    message = 'Your role is denied from using this command.';
                }

                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.danger)
                            .setDescription(`❌ ${message}`)
                    ],
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
