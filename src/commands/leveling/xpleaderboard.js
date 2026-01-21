const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { colors } = require('../../config/config');
const { getLeaderboard } = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('xpleaderboard')
        .setDescription('View the XP leaderboard')
        .addIntegerOption(option =>
            option.setName('page')
                .setDescription('Page number')
                .setMinValue(1)
                .setRequired(false)),

    cooldown: 10,

    async execute(interaction) {
        const page = interaction.options.getInteger('page') || 1;
        const perPage = 10;
        const offset = (page - 1) * perPage;

        const leaderboard = getLeaderboard.all(interaction.guild.id, perPage + offset);
        const pageData = leaderboard.slice(offset, offset + perPage);

        if (pageData.length === 0) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.info)
                        .setDescription('No data available yet. Start chatting to earn XP!')
                ],
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setColor(colors.primary)
            .setTitle('📊 XP Leaderboard')
            .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
            .setFooter({ text: `Page ${page}` })
            .setTimestamp();

        const descriptions = await Promise.all(pageData.map(async (entry, index) => {
            const rank = offset + index + 1;
            const user = await interaction.client.users.fetch(entry.user_id).catch(() => null);
            const username = user ? user.username : 'Unknown User';
            
            let medal = '';
            if (rank === 1) medal = '🥇';
            else if (rank === 2) medal = '🥈';
            else if (rank === 3) medal = '🥉';
            else medal = `**${rank}.**`;

            return `${medal} ${username}\n   Level ${entry.level} • ${entry.xp.toLocaleString()} XP • ${entry.messages.toLocaleString()} messages`;
        }));

        embed.setDescription(descriptions.join('\n\n'));

        await interaction.reply({ embeds: [embed] });
    }
};
