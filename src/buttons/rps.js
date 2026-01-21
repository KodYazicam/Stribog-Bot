const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { colors } = require('../config/config');

const choices = ['rock', 'paper', 'scissors'];
const emojis = { rock: '🪨', paper: '📄', scissors: '✂️' };
const playerChoices = new Map();

module.exports = {
    async execute(interaction, client, args) {
        const customId = interaction.customId;

        if (customId.startsWith('rps_bot_')) {
            const playerChoice = customId.replace('rps_bot_', '');
            const botChoice = choices[Math.floor(Math.random() * 3)];
            const result = getResult(playerChoice, botChoice);

            let resultText, resultColor;
            if (result === 'win') {
                resultText = '🎉 You Win!';
                resultColor = colors.success;
            } else if (result === 'lose') {
                resultText = '😔 You Lose!';
                resultColor = colors.danger;
            } else {
                resultText = '🤝 It\'s a Tie!';
                resultColor = colors.warning;
            }

            const embed = new EmbedBuilder()
                .setColor(resultColor)
                .setTitle(resultText)
                .addFields(
                    { name: 'Your Choice', value: `${emojis[playerChoice]} ${capitalize(playerChoice)}`, inline: true },
                    { name: 'Bot\'s Choice', value: `${emojis[botChoice]} ${capitalize(botChoice)}`, inline: true }
                );

            await interaction.update({ embeds: [embed], components: [] });

        } else if (customId.startsWith('rps_accept_')) {
            const gameId = customId.replace('rps_accept_', '');
            const { activeGames } = require('../commands/fun/rps');
            const game = activeGames.get(gameId);

            if (!game) {
                return interaction.reply({
                    embeds: [new EmbedBuilder().setColor(colors.danger).setDescription('This game has expired.')],
                    ephemeral: true
                });
            }

            if (interaction.user.id !== game.opponent) {
                return interaction.reply({
                    embeds: [new EmbedBuilder().setColor(colors.danger).setDescription('You are not the challenged player.')],
                    ephemeral: true
                });
            }

            const embed = new EmbedBuilder()
                .setColor(colors.info)
                .setTitle('🎮 Rock Paper Scissors')
                .setDescription('Both players, make your choice! Click one of the buttons below.\n\n⏳ Waiting for both players...');

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`rps_choice_rock_${gameId}`)
                        .setLabel('Rock')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🪨'),
                    new ButtonBuilder()
                        .setCustomId(`rps_choice_paper_${gameId}`)
                        .setLabel('Paper')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('📄'),
                    new ButtonBuilder()
                        .setCustomId(`rps_choice_scissors_${gameId}`)
                        .setLabel('Scissors')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('✂️')
                );

            await interaction.update({ embeds: [embed], components: [row] });

        } else if (customId.startsWith('rps_decline_')) {
            const gameId = customId.replace('rps_decline_', '');
            const { activeGames } = require('../commands/fun/rps');
            const game = activeGames.get(gameId);

            if (!game) {
                return interaction.reply({
                    embeds: [new EmbedBuilder().setColor(colors.danger).setDescription('This game has expired.')],
                    ephemeral: true
                });
            }

            if (interaction.user.id !== game.opponent) {
                return interaction.reply({
                    embeds: [new EmbedBuilder().setColor(colors.danger).setDescription('You are not the challenged player.')],
                    ephemeral: true
                });
            }

            activeGames.delete(gameId);

            const embed = new EmbedBuilder()
                .setColor(colors.danger)
                .setTitle('🎮 Challenge Declined')
                .setDescription(`${interaction.user} declined the challenge.`);

            await interaction.update({ embeds: [embed], components: [] });

        } else if (customId.startsWith('rps_choice_')) {
            const parts = customId.split('_');
            const choice = parts[2];
            const gameId = parts.slice(3).join('_');

            const { activeGames } = require('../commands/fun/rps');
            const game = activeGames.get(gameId);

            if (!game) {
                return interaction.reply({
                    embeds: [new EmbedBuilder().setColor(colors.danger).setDescription('This game has expired.')],
                    ephemeral: true
                });
            }

            if (interaction.user.id !== game.challenger && interaction.user.id !== game.opponent) {
                return interaction.reply({
                    embeds: [new EmbedBuilder().setColor(colors.danger).setDescription('You are not part of this game.')],
                    ephemeral: true
                });
            }

            if (interaction.user.id === game.challenger) {
                if (game.challengerChoice) {
                    return interaction.reply({
                        embeds: [new EmbedBuilder().setColor(colors.warning).setDescription('You already made your choice!')],
                        ephemeral: true
                    });
                }
                game.challengerChoice = choice;
            } else {
                if (game.opponentChoice) {
                    return interaction.reply({
                        embeds: [new EmbedBuilder().setColor(colors.warning).setDescription('You already made your choice!')],
                        ephemeral: true
                    });
                }
                game.opponentChoice = choice;
            }

            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.success)
                        .setDescription(`You chose ${emojis[choice]} **${capitalize(choice)}**!`)
                ],
                ephemeral: true
            });

            if (game.challengerChoice && game.opponentChoice) {
                const result = getResult(game.challengerChoice, game.opponentChoice);
                const challenger = await client.users.fetch(game.challenger);
                const opponent = await client.users.fetch(game.opponent);

                let resultText, resultColor, winner;
                if (result === 'win') {
                    resultText = `🎉 ${challenger} Wins!`;
                    resultColor = colors.success;
                    winner = challenger;
                } else if (result === 'lose') {
                    resultText = `🎉 ${opponent} Wins!`;
                    resultColor = colors.success;
                    winner = opponent;
                } else {
                    resultText = '🤝 It\'s a Tie!';
                    resultColor = colors.warning;
                }

                const embed = new EmbedBuilder()
                    .setColor(resultColor)
                    .setTitle(resultText)
                    .addFields(
                        { name: `${challenger.username}'s Choice`, value: `${emojis[game.challengerChoice]} ${capitalize(game.challengerChoice)}`, inline: true },
                        { name: `${opponent.username}'s Choice`, value: `${emojis[game.opponentChoice]} ${capitalize(game.opponentChoice)}`, inline: true }
                    );

                const channel = await client.channels.fetch(game.channelId);
                const message = await channel.messages.fetch(game.messageId);
                await message.edit({ embeds: [embed], components: [] });

                activeGames.delete(gameId);
            }
        }
    }
};

function getResult(player, opponent) {
    if (player === opponent) return 'tie';
    if (
        (player === 'rock' && opponent === 'scissors') ||
        (player === 'paper' && opponent === 'rock') ||
        (player === 'scissors' && opponent === 'paper')
    ) {
        return 'win';
    }
    return 'lose';
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
