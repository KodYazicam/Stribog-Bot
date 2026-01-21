const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { colors } = require('../../config/config');
const { getUserGuildData, insertUserGuildData, getLeaderboard } = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('View your or another user\'s rank')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to check')
                .setRequired(false)),
    
    cooldown: 5,
    
    async execute(interaction) {
        const target = interaction.options.getUser('user') || interaction.user;
        
        insertUserGuildData.run(target.id, interaction.guild.id);
        const userData = getUserGuildData.get(target.id, interaction.guild.id);

        const leaderboard = getLeaderboard.all(interaction.guild.id, 1000);
        const rank = leaderboard.findIndex(u => u.user_id === target.id) + 1;

        const xpForNextLevel = userData.level * 100;
        const progress = Math.floor((userData.xp / xpForNextLevel) * 100);
        const progressBar = createProgressBar(progress);

        const embed = new EmbedBuilder()
            .setColor(colors.primary)
            .setTitle(`${target.username}'s Rank`)
            .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields(
                { name: '🏆 Rank', value: `#${rank || 'N/A'}`, inline: true },
                { name: '⭐ Level', value: `${userData.level}`, inline: true },
                { name: '✨ XP', value: `${userData.xp.toLocaleString()} / ${xpForNextLevel.toLocaleString()}`, inline: true },
                { name: '💬 Messages', value: `${userData.messages.toLocaleString()}`, inline: true },
                { name: 'Progress', value: `${progressBar} ${progress}%` }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};

function createProgressBar(percent) {
    const filled = Math.floor(percent / 10);
    const empty = 10 - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
}
