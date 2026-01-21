const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { colors } = require('../../config/config');

const categories = {
    general: 9,
    science: 17,
    history: 23,
    geography: 22,
    sports: 21,
    music: 12,
    games: 15,
    anime: 31
};

const activeTrivia = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('trivia')
        .setDescription('Play a trivia game')
        .addStringOption(option =>
            option.setName('category')
                .setDescription('Trivia category')
                .setRequired(false)
                .addChoices(
                    { name: 'General Knowledge', value: 'general' },
                    { name: 'Science & Nature', value: 'science' },
                    { name: 'History', value: 'history' },
                    { name: 'Geography', value: 'geography' },
                    { name: 'Sports', value: 'sports' },
                    { name: 'Music', value: 'music' },
                    { name: 'Video Games', value: 'games' },
                    { name: 'Anime & Manga', value: 'anime' }
                ))
        .addStringOption(option =>
            option.setName('difficulty')
                .setDescription('Question difficulty')
                .setRequired(false)
                .addChoices(
                    { name: 'Easy', value: 'easy' },
                    { name: 'Medium', value: 'medium' },
                    { name: 'Hard', value: 'hard' }
                )),

    cooldown: 10,

    async execute(interaction) {
        const category = interaction.options.getString('category');
        const difficulty = interaction.options.getString('difficulty');

        await interaction.deferReply();

        try {
            let url = 'https://opentdb.com/api.php?amount=1&type=multiple';
            if (category) url += `&category=${categories[category]}`;
            if (difficulty) url += `&difficulty=${difficulty}`;

            const response = await fetch(url);
            const data = await response.json();

            if (data.response_code !== 0 || !data.results.length) {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.danger)
                            .setDescription('Failed to fetch trivia question. Please try again.')
                    ]
                });
            }

            const question = data.results[0];
            const correctAnswer = decodeHTML(question.correct_answer);
            const incorrectAnswers = question.incorrect_answers.map(a => decodeHTML(a));
            
            const allAnswers = [...incorrectAnswers, correctAnswer]
                .sort(() => Math.random() - 0.5);

            const correctIndex = allAnswers.indexOf(correctAnswer);

            const difficultyColors = {
                easy: colors.success,
                medium: colors.warning,
                hard: colors.danger
            };

            const embed = new EmbedBuilder()
                .setColor(difficultyColors[question.difficulty] || colors.info)
                .setTitle('🧠 Trivia Question')
                .setDescription(decodeHTML(question.question))
                .addFields(
                    { name: 'Category', value: decodeHTML(question.category), inline: true },
                    { name: 'Difficulty', value: capitalize(question.difficulty), inline: true }
                )
                .setFooter({ text: 'You have 30 seconds to answer!' });

            const row = new ActionRowBuilder();
            const labels = ['A', 'B', 'C', 'D'];
            
            allAnswers.forEach((answer, index) => {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`trivia_${index}`)
                        .setLabel(labels[index])
                        .setStyle(ButtonStyle.Primary)
                );
                embed.addFields({ name: `${labels[index]}`, value: answer, inline: true });
            });

            const message = await interaction.editReply({ embeds: [embed], components: [row] });

            const triviaId = message.id;
            activeTrivia.set(triviaId, {
                correctIndex,
                correctAnswer,
                allAnswers,
                answered: new Set(),
                question: question.question,
                difficulty: question.difficulty
            });

            setTimeout(async () => {
                const trivia = activeTrivia.get(triviaId);
                if (trivia) {
                    activeTrivia.delete(triviaId);

                    const timeoutEmbed = EmbedBuilder.from(embed)
                        .setColor(colors.danger)
                        .setFooter({ text: `Time's up! The correct answer was: ${correctAnswer}` });

                    const disabledRow = new ActionRowBuilder();
                    allAnswers.forEach((answer, index) => {
                        disabledRow.addComponents(
                            new ButtonBuilder()
                                .setCustomId(`trivia_${index}`)
                                .setLabel(labels[index])
                                .setStyle(index === correctIndex ? ButtonStyle.Success : ButtonStyle.Secondary)
                                .setDisabled(true)
                        );
                    });

                    await interaction.editReply({ embeds: [timeoutEmbed], components: [disabledRow] }).catch(() => {});
                }
            }, 30000);

        } catch (error) {
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.danger)
                        .setDescription('An error occurred while fetching the trivia question.')
                ]
            });
        }
    }
};

module.exports.activeTrivia = activeTrivia;

function decodeHTML(html) {
    const entities = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#039;': "'",
        '&apos;': "'",
        '&nbsp;': ' ',
        '&ldquo;': '"',
        '&rdquo;': '"',
        '&lsquo;': "'",
        '&rsquo;': "'"
    };
    return html.replace(/&[^;]+;/g, match => entities[match] || match);
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
