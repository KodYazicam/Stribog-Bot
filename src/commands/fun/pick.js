const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { colors } = require('../../config/config');

function parseChoices(input) {
    if (typeof input !== 'string' || !input.trim()) {
        return { error: 'empty' };
    }
    const choices = input
        .split(',')
        .map((choice) => choice.trim())
        .filter(Boolean);
    if (choices.length < 2) {
        return { error: 'need-two' };
    }
    if (choices.length > 20) {
        return { error: 'too-many', max: 20 };
    }
    return { choices };
}

function pickRandom(choices) {
    return choices[Math.floor(Math.random() * choices.length)];
}

module.exports = {
    parseChoices,
    pickRandom,

    data: new SlashCommandBuilder()
        .setName('pick')
        .setDescription('Let the bot pick one option for you')
        .addStringOption(option =>
            option.setName('options')
                .setDescription('Comma-separated options, e.g. pizza, sushi, burgers')
                .setRequired(true)),

    cooldown: 3,

    async execute(interaction) {
        const input = interaction.options.getString('options');
        const parsed = parseChoices(input);

        if (parsed.error === 'empty') {
            return interaction.reply({ content: 'Give me at least two comma-separated options.', ephemeral: true });
        }
        if (parsed.error === 'need-two') {
            return interaction.reply({ content: 'I need at least **two** options to choose from. Separate them with commas.', ephemeral: true });
        }
        if (parsed.error === 'too-many') {
            return interaction.reply({ content: `Too many options — the limit is **${parsed.max}**.`, ephemeral: true });
        }

        const winner = pickRandom(parsed.choices);
        const listing = parsed.choices.map((choice) => `• ${choice}`).join('\n');

        const embed = new EmbedBuilder()
            .setColor(colors.primary)
            .setTitle('🎯 Random pick')
            .addFields(
                { name: 'Options', value: listing.slice(0, 1024) },
                { name: 'Winner', value: `**${winner}**` }
            )
            .setFooter({ text: `Picked by ${interaction.user.tag}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
