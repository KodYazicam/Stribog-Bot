const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { colors } = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Timeout a member')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The member to timeout')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('duration')
                .setDescription('Duration in minutes')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(40320))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the timeout')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    
    cooldown: 5,
    
    async execute(interaction) {
        const target = interaction.options.getUser('target');
        const duration = interaction.options.getInteger('duration');
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
                        .setDescription('You cannot timeout yourself.')
                ],
                ephemeral: true
            });
        }

        if (member.id === interaction.client.user.id) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.danger)
                        .setDescription('I cannot timeout myself.')
                ],
                ephemeral: true
            });
        }

        if (!member.moderatable) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.danger)
                        .setDescription('I cannot timeout this user. They may have higher permissions than me.')
                ],
                ephemeral: true
            });
        }

        if (interaction.member.roles.highest.position <= member.roles.highest.position) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.danger)
                        .setDescription('You cannot timeout this user. They have equal or higher role than you.')
                ],
                ephemeral: true
            });
        }

        const durationMs = duration * 60 * 1000;

        try {
            await member.timeout(durationMs, `${reason} | Timed out by ${interaction.user.tag}`);

            await member.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.warning)
                        .setTitle('You have been timed out')
                        .setDescription(`You have been timed out in **${interaction.guild.name}**`)
                        .addFields(
                            { name: 'Duration', value: `${duration} minutes`, inline: true },
                            { name: 'Reason', value: reason }
                        )
                        .setTimestamp()
                ]
            }).catch(() => null);

            const embed = new EmbedBuilder()
                .setColor(colors.success)
                .setTitle('Member Timed Out')
                .setThumbnail(target.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: 'User', value: `${target.tag}`, inline: true },
                    { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
                    { name: 'Duration', value: `${duration} minutes`, inline: true },
                    { name: 'Reason', value: reason }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
            const { sendModLog } = require('../../utils/modlog');
            await sendModLog(interaction.guild, {
                title: 'Member Timed Out',
                moderator: interaction.user,
                target,
                fields: [
                    { name: 'Duration', value: `${duration} minutes`, inline: true },
                    { name: 'Reason', value: reason }
                ]
            });
        } catch (error) {
            console.error('Timeout error:', error);
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.danger)
                        .setDescription('Failed to timeout this user.')
                ],
                ephemeral: true
            });
        }
    }
};
