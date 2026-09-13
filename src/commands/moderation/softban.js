const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { colors } = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('softban')
        .setDescription('Ban and immediately unban a user to delete their messages')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user to softban')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('days')
                .setDescription('Number of days of messages to delete (1-7)')
                .setMinValue(1)
                .setMaxValue(7)
                .setRequired(false))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the softban')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    
    cooldown: 5,
    
    async execute(interaction) {
        const target = interaction.options.getUser('target');
        const days = interaction.options.getInteger('days') || 1;
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const member = await interaction.guild.members.fetch(target.id).catch(() => null);

        if (member) {
            if (member.id === interaction.user.id) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.danger)
                            .setDescription('You cannot softban yourself.')
                    ],
                    ephemeral: true
                });
            }

            if (member.id === interaction.client.user.id) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.danger)
                            .setDescription('I cannot softban myself.')
                    ],
                    ephemeral: true
                });
            }

            if (!member.bannable) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.danger)
                            .setDescription('I cannot softban this user.')
                    ],
                    ephemeral: true
                });
            }

            if (interaction.member.roles.highest.position <= member.roles.highest.position) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.danger)
                            .setDescription('You cannot softban this user.')
                    ],
                    ephemeral: true
                });
            }
        }

        try {
            await interaction.guild.members.ban(target.id, {
                deleteMessageDays: days,
                reason: `[Softban] ${reason} | By ${interaction.user.tag}`
            });

            await interaction.guild.members.unban(target.id, `Softban by ${interaction.user.tag}`);

            const embed = new EmbedBuilder()
                .setColor(colors.success)
                .setTitle('User Softbanned')
                .setThumbnail(target.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: 'User', value: `${target.tag}`, inline: true },
                    { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
                    { name: 'Messages Deleted', value: `${days} day(s)`, inline: true },
                    { name: 'Reason', value: reason }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
            const { sendModLog } = require('../../utils/modlog');
            await sendModLog(interaction.guild, {
                title: 'Member Softbanned',
                moderator: interaction.user,
                target,
                fields: [
                    { name: 'Messages Deleted', value: `${days} day(s)`, inline: true },
                    { name: 'Reason', value: reason }
                ]
            });
        } catch (error) {
            console.error('Softban error:', error);
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.danger)
                        .setDescription('Failed to softban this user.')
                ],
                ephemeral: true
            });
        }
    }
};
