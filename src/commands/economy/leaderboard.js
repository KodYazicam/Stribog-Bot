const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { colors } = require('../../config/config');
const { getEconomyLeaderboard } = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View the economy leaderboard')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Leaderboard type')
                .setRequired(false)
                .addChoices(
                    { name: 'Economy', value: 'economy' },
                    { name: 'Levels', value: 'levels' }
                )),
    
    cooldown: 10,
    
    async execute(interaction, client) {
        const type = interaction.options.getString('type') || 'economy';

        await interaction.deferReply();

        if (type === 'economy') {
            if (!interaction.guild) {
                return interaction.editReply({ content: 'Economy is per-server. Use this in a guild.' });
            }
            const leaderboard = getEconomyLeaderboard.all(interaction.guild.id, 10);

            if (leaderboard.length === 0) {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.warning)
                            .setDescription('No data available yet.')
                    ]
                });
            }

            const leaderboardEntries = await Promise.all(
                leaderboard.map(async (entry, index) => {
                    const user = await client.users.fetch(entry.user_id).catch(() => null);
                    const username = user ? user.username : 'Unknown User';
                    const total = entry.balance + entry.bank;
                    const medals = ['🥇', '🥈', '🥉'];
                    const position = medals[index] || `**${index + 1}.**`;
                    return `${position} ${username} - **${total.toLocaleString()}** coins`;
                })
            );

            const embed = new EmbedBuilder()
                .setColor(colors.primary)
                .setTitle('💰 Economy Leaderboard')
                .setDescription(leaderboardEntries.join('\n'))
                .setFooter({ text: `Top 10 in ${interaction.guild.name}` })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } else {
            const { getLeaderboard } = require('../../utils/database');
            const leaderboard = getLeaderboard.all(interaction.guild.id, 10);

            if (leaderboard.length === 0) {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.warning)
                            .setDescription('No data available yet.')
                    ]
                });
            }

            const leaderboardEntries = await Promise.all(
                leaderboard.map(async (entry, index) => {
                    const user = await client.users.fetch(entry.user_id).catch(() => null);
                    const username = user ? user.username : 'Unknown User';
                    const medals = ['🥇', '🥈', '🥉'];
                    const position = medals[index] || `**${index + 1}.**`;
                    return `${position} ${username} - Level **${entry.level}** (${entry.xp.toLocaleString()} XP)`;
                })
            );

            const embed = new EmbedBuilder()
                .setColor(colors.primary)
                .setTitle('⭐ Level Leaderboard')
                .setDescription(leaderboardEntries.join('\n'))
                .setFooter({ text: `Top 10 in ${interaction.guild.name}` })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        }
    }
};
