const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { colors } = require('../../config/config');

const activeGames = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rps')
        .setDescription('Play Rock Paper Scissors')
        .addUserOption(option =>
            option.setName('opponent')
                .setDescription('Challenge someone (leave empty to play against bot)')
                .setRequired(false)),

    cooldown: 5,

    async execute(interaction) {
        const opponent = interaction.options.getUser('opponent');

        if (opponent) {
            if (opponent.bot) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.danger)
                            .setDescription('You cannot challenge a bot!')
                    ],
                    ephemeral: true
                });
            }

            if (opponent.id === interaction.user.id) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.danger)
                            .setDescription('You cannot challenge yourself!')
                    ],
                    ephemeral: true
                });
            }

            const gameId = `${interaction.user.id}-${opponent.id}-${Date.now()}`;

            const embed = new EmbedBuilder()
                .setColor(colors.info)
                .setTitle('🎮 Rock Paper Scissors')
                .setDescription(`${interaction.user} has challenged ${opponent} to Rock Paper Scissors!\n\n${opponent}, do you accept?`);

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`rps_accept_${gameId}`)
                        .setLabel('Accept')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`rps_decline_${gameId}`)
                        .setLabel('Decline')
                        .setStyle(ButtonStyle.Danger)
                );

            const message = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

            activeGames.set(gameId, {
                challenger: interaction.user.id,
                opponent: opponent.id,
                challengerChoice: null,
                opponentChoice: null,
                messageId: message.id,
                channelId: interaction.channel.id
            });

            setTimeout(() => {
                if (activeGames.has(gameId)) {
                    activeGames.delete(gameId);
                }
            }, 60000);

        } else {
            const embed = new EmbedBuilder()
                .setColor(colors.info)
                .setTitle('🎮 Rock Paper Scissors')
                .setDescription('Choose your move!');

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('rps_bot_rock')
                        .setLabel('Rock')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🪨'),
                    new ButtonBuilder()
                        .setCustomId('rps_bot_paper')
                        .setLabel('Paper')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('📄'),
                    new ButtonBuilder()
                        .setCustomId('rps_bot_scissors')
                        .setLabel('Scissors')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('✂️')
                );

            await interaction.reply({ embeds: [embed], components: [row] });
        }
    }
};

module.exports.activeGames = activeGames;
