const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { colors } = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a member from the server')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The member to kick')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the kick')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    
    cooldown: 5,
    
    async execute(interaction) {
        const target = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason') || 'No reason provided';
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
                        .setDescription('You cannot kick yourself.')
                ],
                ephemeral: true
            });
        }

        if (member.id === interaction.client.user.id) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.danger)
                        .setDescription('I cannot kick myself.')
                ],
                ephemeral: true
            });
        }

        if (!member.kickable) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.danger)
                        .setDescription('I cannot kick this user. They may have higher permissions than me.')
                ],
                ephemeral: true
            });
        }

        if (interaction.member.roles.highest.position <= member.roles.highest.position) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.danger)
                        .setDescription('You cannot kick this user. They have equal or higher role than you.')
                ],
                ephemeral: true
            });
        }

        try {
            await member.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.warning)
                        .setTitle('You have been kicked')
                        .setDescription(`You have been kicked from **${interaction.guild.name}**`)
                        .addFields({ name: 'Reason', value: reason })
                        .setTimestamp()
                ]
            }).catch(() => null);

            await member.kick(`${reason} | Kicked by ${interaction.user.tag}`);

            const embed = new EmbedBuilder()
                .setColor(colors.success)
                .setTitle('Member Kicked')
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
                title: 'Member Kicked',
                moderator: interaction.user,
                target,
                fields: [{ name: 'Reason', value: reason }]
            });
        } catch (error) {
            console.error('Kick error:', error);
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.danger)
                        .setDescription('Failed to kick this user.')
                ],
                ephemeral: true
            });
        }
    }
};
