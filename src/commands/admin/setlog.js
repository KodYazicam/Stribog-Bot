const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { colors } = require('../../config/config');
const { insertGuild, updateGuildSetting, getGuild } = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setlog')
        .setDescription('Configure logging channels')
        .addSubcommand(subcommand =>
            subcommand
                .setName('all')
                .setDescription('Set the main log channel for all events')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Log channel')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('modlog')
                .setDescription('Set the moderation log channel')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Mod log channel')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('welcome')
                .setDescription('Set the welcome channel')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Welcome channel')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('goodbye')
                .setDescription('Set the goodbye channel')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Goodbye channel')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('levelup')
                .setDescription('Set the level up notification channel')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Level up channel')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('disable')
                .setDescription('Disable a logging channel')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Log type to disable')
                        .setRequired(true)
                        .addChoices(
                            { name: 'All Logs', value: 'log_channel' },
                            { name: 'Mod Logs', value: 'mod_log_channel' },
                            { name: 'Welcome', value: 'welcome_channel' },
                            { name: 'Goodbye', value: 'goodbye_channel' },
                            { name: 'Level Up', value: 'level_up_channel' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('View current logging settings'))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    cooldown: 5,

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        insertGuild.run(interaction.guild.id);

        if (subcommand === 'all') {
            const channel = interaction.options.getChannel('channel');
            updateGuildSetting('log_channel').run(channel.id, interaction.guild.id);

            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.success)
                        .setDescription(`Log channel set to ${channel}`)
                ]
            });

        } else if (subcommand === 'modlog') {
            const channel = interaction.options.getChannel('channel');
            updateGuildSetting('mod_log_channel').run(channel.id, interaction.guild.id);

            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.success)
                        .setDescription(`Mod log channel set to ${channel}`)
                ]
            });

        } else if (subcommand === 'welcome') {
            const channel = interaction.options.getChannel('channel');
            updateGuildSetting('welcome_channel').run(channel.id, interaction.guild.id);

            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.success)
                        .setDescription(`Welcome channel set to ${channel}`)
                ]
            });

        } else if (subcommand === 'goodbye') {
            const channel = interaction.options.getChannel('channel');
            updateGuildSetting('goodbye_channel').run(channel.id, interaction.guild.id);

            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.success)
                        .setDescription(`Goodbye channel set to ${channel}`)
                ]
            });

        } else if (subcommand === 'levelup') {
            const channel = interaction.options.getChannel('channel');
            updateGuildSetting('level_up_channel').run(channel.id, interaction.guild.id);

            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.success)
                        .setDescription(`Level up channel set to ${channel}`)
                ]
            });

        } else if (subcommand === 'disable') {
            const type = interaction.options.getString('type');
            updateGuildSetting(type).run(null, interaction.guild.id);

            const typeNames = {
                'log_channel': 'All logs',
                'mod_log_channel': 'Mod logs',
                'welcome_channel': 'Welcome messages',
                'goodbye_channel': 'Goodbye messages',
                'level_up_channel': 'Level up notifications'
            };

            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.warning)
                        .setDescription(`${typeNames[type]} have been disabled.`)
                ]
            });

        } else if (subcommand === 'status') {
            const guildData = getGuild.get(interaction.guild.id);

            const getChannelMention = (channelId) => {
                if (!channelId) return '❌ Not set';
                return `<#${channelId}>`;
            };

            const embed = new EmbedBuilder()
                .setColor(colors.info)
                .setTitle('Logging Settings')
                .addFields(
                    { name: 'All Logs', value: getChannelMention(guildData?.log_channel), inline: true },
                    { name: 'Mod Logs', value: getChannelMention(guildData?.mod_log_channel), inline: true },
                    { name: 'Welcome', value: getChannelMention(guildData?.welcome_channel), inline: true },
                    { name: 'Goodbye', value: getChannelMention(guildData?.goodbye_channel), inline: true },
                    { name: 'Level Up', value: getChannelMention(guildData?.level_up_channel), inline: true },
                    { name: 'Ticket Logs', value: getChannelMention(guildData?.ticket_log_channel), inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        }
    }
};
