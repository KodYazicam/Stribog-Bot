const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { colors } = require('../config/config');

module.exports = {
    async execute(interaction, client, args) {
        const { activeTrivia } = require('../commands/fun/trivia');
        const triviaId = interaction.message.id;
        const trivia = activeTrivia.get(triviaId);

        if (!trivia) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.danger)
                        .setDescription('This trivia question has expired.')
                ],
                ephemeral: true
            });
        }

        if (trivia.answered.has(interaction.user.id)) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.warning)
                        .setDescription('You have already answered this question!')
                ],
                ephemeral: true
            });
        }

        const selectedIndex = parseInt(interaction.customId.split('_')[1]);
        trivia.answered.add(interaction.user.id);

        const isCorrect = selectedIndex === trivia.correctIndex;
        const labels = ['A', 'B', 'C', 'D'];

        const pointsMap = {
            easy: 10,
            medium: 20,
            hard: 30
        };
        const points = pointsMap[trivia.difficulty] || 10;

        if (isCorrect) {
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.success)
                        .setTitle('✅ Correct!')
                        .setDescription(`Well done! The answer was **${trivia.correctAnswer}**`)
                        .addFields({ name: 'Points Earned', value: `+${points}`, inline: true })
                ],
                ephemeral: true
            });

            try {
                const { updateUserCoins, getUserGuildData, insertUserGuildData } = require('../utils/database');
                let userData = getUserGuildData.get(interaction.guild.id, interaction.user.id);
                if (!userData) {
                    insertUserGuildData.run(interaction.user.id, interaction.guild.id, 0, 0, 0);
                }
                updateUserCoins.run(points, interaction.guild.id, interaction.user.id);
            } catch {}

        } else {
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.danger)
                        .setTitle('❌ Wrong!')
                        .setDescription(`The correct answer was **${trivia.correctAnswer}**`)
                ],
                ephemeral: true
            });
        }

        activeTrivia.delete(triviaId);

        const originalEmbed = interaction.message.embeds[0];
        const updatedEmbed = EmbedBuilder.from(originalEmbed)
            .setFooter({ text: `Answered by ${interaction.user.tag} | Correct answer: ${trivia.correctAnswer}` });

        const disabledRow = new ActionRowBuilder();
        trivia.allAnswers.forEach((answer, index) => {
            disabledRow.addComponents(
                new ButtonBuilder()
                    .setCustomId(`trivia_disabled_${index}`)
                    .setLabel(labels[index])
                    .setStyle(
                        index === trivia.correctIndex 
                            ? ButtonStyle.Success 
                            : (index === selectedIndex ? ButtonStyle.Danger : ButtonStyle.Secondary)
                    )
                    .setDisabled(true)
            );
        });

        await interaction.message.edit({ embeds: [updatedEmbed], components: [disabledRow] });
    }
};
