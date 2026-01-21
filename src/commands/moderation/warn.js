const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { colors } = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Warn a member')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The member to warn')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the warning')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    
    cooldown: 3,
    
    async execute(interaction) {
        const target = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason');
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
                        .setDescription('You cannot warn yourself.')
                ],
                ephemeral: true
            });
        }

        if (member.user.bot) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.danger)
                        .setDescription('You cannot warn a bot.')
                ],
                ephemeral: true
            });
        }

        if (interaction.member.roles.highest.position <= member.roles.highest.position) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.danger)
                        .setDescription('You cannot warn this user. They have equal or higher role than you.')
                ],
                ephemeral: true
            });
        }

        try {
            await member.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.warning)
                        .setTitle('You have been warned')
                        .setDescription(`You have been warned in **${interaction.guild.name}**`)
                        .addFields({ name: 'Reason', value: reason })
                        .setTimestamp()
                ]
            }).catch(() => null);

            const embed = new EmbedBuilder()
                .setColor(colors.warning)
                .setTitle('Member Warned')
                .setThumbnail(target.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: 'User', value: `${target.tag}`, inline: true },
                    { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
                    { name: 'Reason', value: reason }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Warn error:', error);
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.danger)
                        .setDescription('Failed to warn this user.')
                ],
                ephemeral: true
            });
        }
    }
};
