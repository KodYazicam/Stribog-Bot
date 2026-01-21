const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { colors } = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('8ball')
        .setDescription('Ask the magic 8ball a question')
        .addStringOption(option =>
            option.setName('question')
                .setDescription('Your question')
                .setRequired(true)),
    
    cooldown: 3,
    
    async execute(interaction) {
        const question = interaction.options.getString('question');

        const responses = [
            { text: 'It is certain.', type: 'positive' },
            { text: 'It is decidedly so.', type: 'positive' },
            { text: 'Without a doubt.', type: 'positive' },
            { text: 'Yes, definitely.', type: 'positive' },
            { text: 'You may rely on it.', type: 'positive' },
            { text: 'As I see it, yes.', type: 'positive' },
            { text: 'Most likely.', type: 'positive' },
            { text: 'Outlook good.', type: 'positive' },
            { text: 'Yes.', type: 'positive' },
            { text: 'Signs point to yes.', type: 'positive' },
            { text: 'Reply hazy, try again.', type: 'neutral' },
            { text: 'Ask again later.', type: 'neutral' },
            { text: 'Better not tell you now.', type: 'neutral' },
            { text: 'Cannot predict now.', type: 'neutral' },
            { text: 'Concentrate and ask again.', type: 'neutral' },
            { text: "Don't count on it.", type: 'negative' },
            { text: 'My reply is no.', type: 'negative' },
            { text: 'My sources say no.', type: 'negative' },
            { text: 'Outlook not so good.', type: 'negative' },
            { text: 'Very doubtful.', type: 'negative' }
        ];

        const response = responses[Math.floor(Math.random() * responses.length)];

        const colorMap = {
            positive: colors.success,
            neutral: colors.warning,
            negative: colors.danger
        };

        const embed = new EmbedBuilder()
            .setColor(colorMap[response.type])
            .setTitle('🎱 Magic 8Ball')
            .addFields(
                { name: 'Question', value: question },
                { name: 'Answer', value: response.text }
            )
            .setFooter({ text: `Asked by ${interaction.user.tag}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
