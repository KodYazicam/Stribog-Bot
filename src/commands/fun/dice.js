const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { colors } = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dice')
        .setDescription('Roll dice')
        .addIntegerOption(option =>
            option.setName('sides')
                .setDescription('Number of sides (default: 6)')
                .setMinValue(2)
                .setMaxValue(100)
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('count')
                .setDescription('Number of dice to roll (default: 1)')
                .setMinValue(1)
                .setMaxValue(10)
                .setRequired(false)),
    
    cooldown: 2,
    
    async execute(interaction) {
        const sides = interaction.options.getInteger('sides') || 6;
        const count = interaction.options.getInteger('count') || 1;

        const results = [];
        let total = 0;

        for (let i = 0; i < count; i++) {
            const roll = Math.floor(Math.random() * sides) + 1;
            results.push(roll);
            total += roll;
        }

        const diceEmojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
        
        const resultsDisplay = results.map(r => {
            if (sides === 6 && r <= 6) {
                return `${diceEmojis[r - 1]} (${r})`;
            }
            return `🎲 ${r}`;
        }).join('\n');

        const embed = new EmbedBuilder()
            .setColor(colors.primary)
            .setTitle('🎲 Dice Roll')
            .addFields(
                { name: 'Dice', value: `${count}d${sides}`, inline: true },
                { name: 'Results', value: resultsDisplay, inline: true }
            )
            .setFooter({ text: `Rolled by ${interaction.user.tag}` })
            .setTimestamp();

        if (count > 1) {
            embed.addFields({ name: 'Total', value: `${total}`, inline: true });
        }

        await interaction.reply({ embeds: [embed] });
    }
};
