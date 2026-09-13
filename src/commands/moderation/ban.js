const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { colors } = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a member from the server')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The member to ban')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the ban')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('days')
                .setDescription('Number of days to delete messages (0-7)')
                .setMinValue(0)
                .setMaxValue(7)
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    
    cooldown: 5,
    
    async execute(interaction) {
        const target = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const days = interaction.options.getInteger('days') || 0;
        const member = await interaction.guild.members.fetch(target.id).catch(() => null);

        if (!member) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.danger)
                        .setDescription('User not found in this server.')
                ],
                ephemeral: true
            });
        }

        if (member.id === interaction.user.id) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.danger)
                        .setDescription('You cannot ban yourself.')
                ],
                ephemeral: true
            });
        }

        if (member.id === interaction.client.user.id) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.danger)
                        .setDescription('I cannot ban myself.')
                ],
                ephemeral: true
            });
        }

        if (!member.bannable) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.danger)
                        .setDescription('I cannot ban this user. They may have higher permissions than me.')
                ],
                ephemeral: true
            });
        }

        if (interaction.member.roles.highest.position <= member.roles.highest.position) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.danger)
                        .setDescription('You cannot ban this user. They have equal or higher role than you.')
                ],
                ephemeral: true
            });
        }

        try {
            await member.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.danger)
                        .setTitle('You have been banned')
                        .setDescription(`You have been banned from **${interaction.guild.name}**`)
                        .addFields({ name: 'Reason', value: reason })
                        .setTimestamp()
                ]
            }).catch(() => null);

            await member.ban({ deleteMessageDays: days, reason: `${reason} | Banned by ${interaction.user.tag}` });

            const embed = new EmbedBuilder()
                .setColor(colors.success)
                .setTitle('Member Banned')
                .setThumbnail(target.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: 'User', value: `${target.tag}`, inline: true },
                    { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
                    { name: 'Reason', value: reason }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
            const { sendModLog } = require('../../utils/modlog');
            await sendModLog(interaction.guild, {
                title: 'Member Banned',
                moderator: interaction.user,
                target,
                fields: [{ name: 'Reason', value: reason }]
            });
        } catch (error) {
            console.error('Ban error:', error);
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.danger)
                        .setDescription('Failed to ban this user.')
                ],
                ephemeral: true
            });
        }
    }
};
