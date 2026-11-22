const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { colors } = require('../../config/config');

const QUESTION_MAX_LENGTH = 253;
const OPTION_MAX_LENGTH = 800;
const DESCRIPTION_MAX_LENGTH = 4096;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('poll')
        .setDescription('Create a poll')
        .addStringOption(option =>
            option.setName('question')
                .setDescription('The poll question')
                .setMaxLength(QUESTION_MAX_LENGTH)
                .setRequired(true))
        .addStringOption(option =>
            option.setName('option1')
                .setDescription('First option')
                .setMaxLength(OPTION_MAX_LENGTH)
                .setRequired(true))
        .addStringOption(option =>
            option.setName('option2')
                .setDescription('Second option')
                .setMaxLength(OPTION_MAX_LENGTH)
                .setRequired(true))
        .addStringOption(option =>
            option.setName('option3')
                .setDescription('Third option')
                .setMaxLength(OPTION_MAX_LENGTH)
                .setRequired(false))
        .addStringOption(option =>
            option.setName('option4')
                .setDescription('Fourth option')
                .setMaxLength(OPTION_MAX_LENGTH)
                .setRequired(false))
        .addStringOption(option =>
            option.setName('option5')
                .setDescription('Fifth option')
                .setMaxLength(OPTION_MAX_LENGTH)
                .setRequired(false)),
    
    cooldown: 10,
    
    async execute(interaction) {
        const question = interaction.options.getString('question');
        const options = [];

        for (let i = 1; i <= 5; i++) {
            const option = interaction.options.getString(`option${i}`);
            if (option) options.push(option);
        }

        const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];

        if (question.length > QUESTION_MAX_LENGTH) {
            return interaction.reply({
                content: `The poll question must be ${QUESTION_MAX_LENGTH} characters or fewer.`,
                ephemeral: true
            });
        }

        const description = options
            .map((opt, i) => `${emojis[i]} ${opt}`)
            .join('\n\n');

        if (description.length > DESCRIPTION_MAX_LENGTH) {
            return interaction.reply({
                content: `The poll options are too long; the combined description must be ${DESCRIPTION_MAX_LENGTH} characters or fewer.`,
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setColor(colors.primary)
            .setTitle(`📊 ${question}`)
            .setDescription(description)
            .setFooter({ text: `Poll by ${interaction.user.tag}` })
            .setTimestamp();

        const message = await interaction.reply({ embeds: [embed], fetchReply: true });

        for (let i = 0; i < options.length; i++) {
            await message.react(emojis[i]);
        }
    }
};
