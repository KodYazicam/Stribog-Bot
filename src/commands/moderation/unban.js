const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { colors } = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Unban a user from the server')
        .addStringOption(option =>
            option.setName('userid')
                .setDescription('The ID of the user to unban')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the unban')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    
    cooldown: 5,
    
    async execute(interaction) {
        const userId = interaction.options.getString('userid');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        if (!/^\d{17,19}$/.test(userId)) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.danger)
                        .setDescription('Invalid user ID format.')
                ],
                ephemeral: true
            });
        }

        try {
            const banList = await interaction.guild.bans.fetch();
            const bannedUser = banList.get(userId);

            if (!bannedUser) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.danger)
                            .setDescription('This user is not banned.')
                    ],
                    ephemeral: true
                });
            }

            await interaction.guild.members.unban(userId, `${reason} | Unbanned by ${interaction.user.tag}`);

            const embed = new EmbedBuilder()
                .setColor(colors.success)
                .setTitle('User Unbanned')
                .setThumbnail(bannedUser.user.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: 'User', value: `${bannedUser.user.tag}`, inline: true },
                    { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
                    { name: 'Reason', value: reason }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Unban error:', error);
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.danger)
                        .setDescription('Failed to unban this user.')
                ],
                ephemeral: true
            });
        }
    }
};
