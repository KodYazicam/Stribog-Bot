const { EmbedBuilder } = require('discord.js');
const { colors } = require('../config/config');

module.exports = {
    async execute(interaction, client, args) {
        const category = interaction.values[0];

        const commands = client.commands.filter(cmd => {
            const cmdCategory = cmd.category || 'Uncategorized';
            return cmdCategory.toLowerCase() === category.toLowerCase();
        });

        const categoryEmojis = {
            moderation: '🛡️',
            info: 'ℹ️',
            fun: '🎮',
            utility: '🔧'
        };

        const emoji = categoryEmojis[category.toLowerCase()] || '📁';

        const commandList = commands.map(cmd => {
            return `\`/${cmd.data.name}\` - ${cmd.data.description}`;
        }).join('\n');

        const embed = new EmbedBuilder()
            .setColor(colors.primary)
            .setTitle(`${emoji} ${category.charAt(0).toUpperCase() + category.slice(1)} Commands`)
            .setDescription(commandList || 'No commands in this category.')
            .setFooter({ text: `${commands.size} commands` })
            .setTimestamp();

        await interaction.update({ embeds: [embed] });
    }
};
