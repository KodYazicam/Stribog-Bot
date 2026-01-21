const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { colors } = require('../../config/config');
const { 
    getCommandPermissions, 
    getAllCommandPermissions, 
    addCommandPermission, 
    removeCommandPermission, 
    clearCommandPermissions,
    getDisabledCommands,
    isCommandDisabled,
    disableCommand,
    enableCommand
} = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('permissions')
        .setDescription('Manage command permissions')
        .addSubcommand(subcommand =>
            subcommand
                .setName('allow')
                .setDescription('Allow a role to use a command')
                .addStringOption(option =>
                    option.setName('command')
                        .setDescription('Command name')
                        .setRequired(true)
                        .setAutocomplete(true))
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('Role to allow')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('deny')
                .setDescription('Deny a role from using a command')
                .addStringOption(option =>
                    option.setName('command')
                        .setDescription('Command name')
                        .setRequired(true)
                        .setAutocomplete(true))
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('Role to deny')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove permission override for a role')
                .addStringOption(option =>
                    option.setName('command')
                        .setDescription('Command name')
                        .setRequired(true)
                        .setAutocomplete(true))
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('Role')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('Reset all permissions for a command')
                .addStringOption(option =>
                    option.setName('command')
                        .setDescription('Command name')
                        .setRequired(true)
                        .setAutocomplete(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('disable')
                .setDescription('Disable a command server-wide or in a channel')
                .addStringOption(option =>
                    option.setName('command')
                        .setDescription('Command name')
                        .setRequired(true)
                        .setAutocomplete(true))
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel (leave empty for server-wide)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('enable')
                .setDescription('Enable a previously disabled command')
                .addStringOption(option =>
                    option.setName('command')
                        .setDescription('Command name')
                        .setRequired(true)
                        .setAutocomplete(true))
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel (leave empty for server-wide)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View permissions for a command')
                .addStringOption(option =>
                    option.setName('command')
                        .setDescription('Command name (leave empty to see all)')
                        .setRequired(false)
                        .setAutocomplete(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all permission overrides'))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    cooldown: 3,

    async autocomplete(interaction, client) {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        const commands = [...client.commands.keys()];
        
        const filtered = commands
            .filter(cmd => cmd.toLowerCase().includes(focusedValue))
            .slice(0, 25);

        await interaction.respond(
            filtered.map(cmd => ({ name: cmd, value: cmd }))
        );
    },

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'allow') {
            const command = interaction.options.getString('command');
            const role = interaction.options.getRole('role');

            if (!client.commands.has(command)) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.danger)
                            .setDescription(`Command \`${command}\` not found.`)
                    ],
                    ephemeral: true
                });
            }

            addCommandPermission.run(interaction.guild.id, command, role.id, 'allow');

            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.success)
                        .setTitle('Permission Added')
                        .setDescription(`${role} can now use \`/${command}\``)
                ]
            });

        } else if (subcommand === 'deny') {
            const command = interaction.options.getString('command');
            const role = interaction.options.getRole('role');

            if (!client.commands.has(command)) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.danger)
                            .setDescription(`Command \`${command}\` not found.`)
                    ],
                    ephemeral: true
                });
            }

            addCommandPermission.run(interaction.guild.id, command, role.id, 'deny');

            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.warning)
                        .setTitle('Permission Denied')
                        .setDescription(`${role} can no longer use \`/${command}\``)
                ]
            });

        } else if (subcommand === 'remove') {
            const command = interaction.options.getString('command');
            const role = interaction.options.getRole('role');

            removeCommandPermission.run(interaction.guild.id, command, role.id);

            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.info)
                        .setDescription(`Removed permission override for ${role} on \`/${command}\``)
                ]
            });

        } else if (subcommand === 'reset') {
            const command = interaction.options.getString('command');

            clearCommandPermissions.run(interaction.guild.id, command);

            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.success)
                        .setDescription(`Reset all permission overrides for \`/${command}\``)
                ]
            });

        } else if (subcommand === 'disable') {
            const command = interaction.options.getString('command');
            const channel = interaction.options.getChannel('channel');

            if (!client.commands.has(command)) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.danger)
                            .setDescription(`Command \`${command}\` not found.`)
                    ],
                    ephemeral: true
                });
            }

            if (command === 'permissions') {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.danger)
                            .setDescription('You cannot disable the permissions command.')
                    ],
                    ephemeral: true
                });
            }

            disableCommand.run(interaction.guild.id, command, channel?.id || null);

            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.warning)
                        .setTitle('Command Disabled')
                        .setDescription(channel 
                            ? `\`/${command}\` has been disabled in ${channel}`
                            : `\`/${command}\` has been disabled server-wide`)
                ]
            });

        } else if (subcommand === 'enable') {
            const command = interaction.options.getString('command');
            const channel = interaction.options.getChannel('channel');

            enableCommand.run(interaction.guild.id, command, channel?.id || null);

            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.success)
                        .setTitle('Command Enabled')
                        .setDescription(channel 
                            ? `\`/${command}\` has been enabled in ${channel}`
                            : `\`/${command}\` has been enabled server-wide`)
                ]
            });

        } else if (subcommand === 'view') {
            const command = interaction.options.getString('command');

            if (command) {
                const permissions = getCommandPermissions.all(interaction.guild.id, command);
                const disabled = isCommandDisabled.get(interaction.guild.id, command, null);

                const embed = new EmbedBuilder()
                    .setColor(colors.info)
                    .setTitle(`Permissions for /${command}`)
                    .setDescription(disabled ? '⚠️ This command is currently disabled' : '');

                if (permissions.length > 0) {
                    const allowed = permissions.filter(p => p.permission_type === 'allow');
                    const denied = permissions.filter(p => p.permission_type === 'deny');

                    if (allowed.length > 0) {
                        embed.addFields({
                            name: '✅ Allowed Roles',
                            value: allowed.map(p => `<@&${p.role_id}>`).join('\n'),
                            inline: true
                        });
                    }

                    if (denied.length > 0) {
                        embed.addFields({
                            name: '❌ Denied Roles',
                            value: denied.map(p => `<@&${p.role_id}>`).join('\n'),
                            inline: true
                        });
                    }
                } else {
                    embed.addFields({
                        name: 'No Overrides',
                        value: 'Using default Discord permissions'
                    });
                }

                await interaction.reply({ embeds: [embed] });

            } else {
                const allPerms = getAllCommandPermissions.all(interaction.guild.id);
                const disabledCmds = getDisabledCommands.all(interaction.guild.id);

                const embed = new EmbedBuilder()
                    .setColor(colors.info)
                    .setTitle('Command Permissions Overview');

                if (allPerms.length === 0 && disabledCmds.length === 0) {
                    embed.setDescription('No permission overrides configured.');
                } else {
                    const grouped = {};
                    for (const perm of allPerms) {
                        if (!grouped[perm.command_name]) {
                            grouped[perm.command_name] = { allowed: [], denied: [] };
                        }
                        if (perm.permission_type === 'allow') {
                            grouped[perm.command_name].allowed.push(perm.role_id);
                        } else {
                            grouped[perm.command_name].denied.push(perm.role_id);
                        }
                    }

                    const lines = [];
                    for (const [cmd, data] of Object.entries(grouped)) {
                        let line = `**/${cmd}**:`;
                        if (data.allowed.length > 0) {
                            line += ` ✅ ${data.allowed.length} allowed`;
                        }
                        if (data.denied.length > 0) {
                            line += ` ❌ ${data.denied.length} denied`;
                        }
                        lines.push(line);
                    }

                    if (lines.length > 0) {
                        embed.addFields({
                            name: 'Permission Overrides',
                            value: lines.join('\n').slice(0, 1024)
                        });
                    }

                    if (disabledCmds.length > 0) {
                        const disabledLines = disabledCmds.map(d => 
                            d.channel_id ? `/${d.command_name} (in <#${d.channel_id}>)` : `/${d.command_name} (server-wide)`
                        );
                        embed.addFields({
                            name: '🚫 Disabled Commands',
                            value: disabledLines.join('\n').slice(0, 1024)
                        });
                    }
                }

                await interaction.reply({ embeds: [embed] });
            }

        } else if (subcommand === 'list') {
            const allPerms = getAllCommandPermissions.all(interaction.guild.id);
            const disabledCmds = getDisabledCommands.all(interaction.guild.id);

            const embed = new EmbedBuilder()
                .setColor(colors.info)
                .setTitle('All Permission Configurations');

            if (allPerms.length === 0 && disabledCmds.length === 0) {
                embed.setDescription('No configurations found.');
            } else {
                let description = '';

                if (allPerms.length > 0) {
                    description += '**Role Permissions:**\n';
                    for (const perm of allPerms.slice(0, 20)) {
                        const emoji = perm.permission_type === 'allow' ? '✅' : '❌';
                        description += `${emoji} \`/${perm.command_name}\` - <@&${perm.role_id}>\n`;
                    }
                    if (allPerms.length > 20) {
                        description += `\n*...and ${allPerms.length - 20} more*\n`;
                    }
                }

                if (disabledCmds.length > 0) {
                    description += '\n**Disabled Commands:**\n';
                    for (const cmd of disabledCmds.slice(0, 10)) {
                        if (cmd.channel_id) {
                            description += `🚫 \`/${cmd.command_name}\` in <#${cmd.channel_id}>\n`;
                        } else {
                            description += `🚫 \`/${cmd.command_name}\` (server-wide)\n`;
                        }
                    }
                }

                embed.setDescription(description.slice(0, 4096));
            }

            await interaction.reply({ embeds: [embed] });
        }
    }
};
