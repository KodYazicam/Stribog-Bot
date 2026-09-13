const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { colors } = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('role')
        .setDescription('Manage roles for a user')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a role to a user')
                .addUserOption(option =>
                    option.setName('target')
                        .setDescription('The user')
                        .setRequired(true))
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('The role to add')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a role from a user')
                .addUserOption(option =>
                    option.setName('target')
                        .setDescription('The user')
                        .setRequired(true))
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('The role to remove')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('Get information about a role')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('The role')
                        .setRequired(true)))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
    
    cooldown: 3,
    
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'add') {
            const target = interaction.options.getUser('target');
            const role = interaction.options.getRole('role');
            const member = await interaction.guild.members.fetch(target.id).catch(() => null);

            if (!member) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.danger)
                            .setDescription('User not found.')
                    ],
                    ephemeral: true
                });
            }

            if (role.position >= interaction.guild.members.me.roles.highest.position) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.danger)
                            .setDescription('I cannot manage this role. It is higher than or equal to my highest role.')
                    ],
                    ephemeral: true
                });
            }

            if (role.position >= interaction.member.roles.highest.position) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.danger)
                            .setDescription('You cannot manage this role. It is higher than or equal to your highest role.')
                    ],
                    ephemeral: true
                });
            }

            if (member.roles.cache.has(role.id)) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.warning)
                            .setDescription(`${target} already has ${role}.`)
                    ],
                    ephemeral: true
                });
            }

            try {
                await member.roles.add(role);

                const embed = new EmbedBuilder()
                    .setColor(colors.success)
                    .setTitle('Role Added')
                    .addFields(
                        { name: 'User', value: `${target}`, inline: true },
                        { name: 'Role', value: `${role}`, inline: true },
                        { name: 'Moderator', value: `${interaction.user}`, inline: true }
                    )
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
                const { sendModLog } = require('../../utils/modlog');
                await sendModLog(interaction.guild, {
                    title: 'Role Added',
                    moderator: interaction.user,
                    target,
                    fields: [{ name: 'Role', value: `${role}` }]
                });
            } catch (error) {
                console.error('Role add error:', error);
                await interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.danger)
                            .setDescription('Failed to add the role.')
                    ],
                    ephemeral: true
                });
            }
        } else if (subcommand === 'remove') {
            const target = interaction.options.getUser('target');
            const role = interaction.options.getRole('role');
            const member = await interaction.guild.members.fetch(target.id).catch(() => null);

            if (!member) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.danger)
                            .setDescription('User not found.')
                    ],
                    ephemeral: true
                });
            }

            if (role.position >= interaction.guild.members.me.roles.highest.position) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.danger)
                            .setDescription('I cannot manage this role.')
                    ],
                    ephemeral: true
                });
            }

            if (role.position >= interaction.member.roles.highest.position) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.danger)
                            .setDescription('You cannot manage this role.')
                    ],
                    ephemeral: true
                });
            }

            if (!member.roles.cache.has(role.id)) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.warning)
                            .setDescription(`${target} does not have ${role}.`)
                    ],
                    ephemeral: true
                });
            }

            try {
                await member.roles.remove(role);

                const embed = new EmbedBuilder()
                    .setColor(colors.success)
                    .setTitle('Role Removed')
                    .addFields(
                        { name: 'User', value: `${target}`, inline: true },
                        { name: 'Role', value: `${role}`, inline: true },
                        { name: 'Moderator', value: `${interaction.user}`, inline: true }
                    )
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
                const { sendModLog } = require('../../utils/modlog');
                await sendModLog(interaction.guild, {
                    title: 'Role Removed',
                    moderator: interaction.user,
                    target,
                    fields: [{ name: 'Role', value: `${role}` }]
                });
            } catch (error) {
                console.error('Role remove error:', error);
                await interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.danger)
                            .setDescription('Failed to remove the role.')
                    ],
                    ephemeral: true
                });
            }
        } else if (subcommand === 'info') {
            const role = interaction.options.getRole('role');

            const permissions = role.permissions.toArray();
            const permList = permissions.length > 0 
                ? permissions.slice(0, 10).join(', ') + (permissions.length > 10 ? ` +${permissions.length - 10} more` : '')
                : 'None';

            const embed = new EmbedBuilder()
                .setColor(role.color || colors.primary)
                .setTitle(`Role: ${role.name}`)
                .addFields(
                    { name: 'ID', value: role.id, inline: true },
                    { name: 'Color', value: role.hexColor, inline: true },
                    { name: 'Position', value: `${role.position}`, inline: true },
                    { name: 'Mentionable', value: role.mentionable ? 'Yes' : 'No', inline: true },
                    { name: 'Hoisted', value: role.hoist ? 'Yes' : 'No', inline: true },
                    { name: 'Managed', value: role.managed ? 'Yes' : 'No', inline: true },
                    { name: 'Members', value: `${role.members.size}`, inline: true },
                    { name: 'Created', value: `<t:${Math.floor(role.createdTimestamp / 1000)}:R>`, inline: true },
                    { name: 'Permissions', value: permList }
                )
                .setTimestamp();

            if (role.icon) {
                embed.setThumbnail(role.iconURL({ size: 256 }));
            }

            await interaction.reply({ embeds: [embed] });
        }
    }
};
