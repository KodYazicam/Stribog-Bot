const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { colors } = require('../../config/config');
const { insertGiveaway, getGiveaway, getGiveawayEntries, endGiveaway } = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Manage giveaways')
        .addSubcommand(subcommand =>
            subcommand
                .setName('start')
                .setDescription('Start a new giveaway')
                .addStringOption(option =>
                    option.setName('prize')
                        .setDescription('What are you giving away?')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('duration')
                        .setDescription('Duration (e.g., 1h, 1d, 1w)')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('winners')
                        .setDescription('Number of winners')
                        .setMinValue(1)
                        .setMaxValue(20)
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('end')
                .setDescription('End a giveaway early')
                .addStringOption(option =>
                    option.setName('message_id')
                        .setDescription('The giveaway message ID')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reroll')
                .setDescription('Reroll a giveaway')
                .addStringOption(option =>
                    option.setName('message_id')
                        .setDescription('The giveaway message ID')
                        .setRequired(true)))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    
    cooldown: 5,
    
    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'start') {
            const prize = interaction.options.getString('prize');
            const durationStr = interaction.options.getString('duration');
            const winners = interaction.options.getInteger('winners') || 1;

            const duration = parseDuration(durationStr);
            if (!duration) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.danger)
                            .setDescription('Invalid duration format. Use: 1m, 1h, 1d, 1w')
                    ],
                    ephemeral: true
                });
            }

            const endTime = Date.now() + duration;

            const embed = new EmbedBuilder()
                .setColor(colors.primary)
                .setTitle('🎉 GIVEAWAY 🎉')
                .setDescription(`**Prize:** ${prize}\n\n**Winners:** ${winners}\n**Ends:** <t:${Math.floor(endTime / 1000)}:R>\n**Hosted by:** ${interaction.user}`)
                .setFooter({ text: 'Click the button below to enter!' })
                .setTimestamp(endTime);

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('giveaway_enter')
                        .setLabel('Enter (0)')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('🎉')
                );

            const message = await interaction.channel.send({ embeds: [embed], components: [row] });

            insertGiveaway.run(
                message.id,
                interaction.channel.id,
                interaction.guild.id,
                prize,
                winners,
                endTime,
                interaction.user.id
            );

            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.success)
                        .setDescription(`Giveaway started! [Jump to message](${message.url})`)
                ],
                ephemeral: true
            });

        } else if (subcommand === 'end') {
            const messageId = interaction.options.getString('message_id');
            const giveaway = getGiveaway.get(messageId);

            if (!giveaway) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.danger)
                            .setDescription('Giveaway not found.')
                    ],
                    ephemeral: true
                });
            }

            if (giveaway.ended) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.warning)
                            .setDescription('This giveaway has already ended.')
                    ],
                    ephemeral: true
                });
            }

            await endGiveawayNow(client, giveaway);

            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.success)
                        .setDescription('Giveaway ended!')
                ],
                ephemeral: true
            });

        } else if (subcommand === 'reroll') {
            const messageId = interaction.options.getString('message_id');
            const giveaway = getGiveaway.get(messageId);

            if (!giveaway) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.danger)
                            .setDescription('Giveaway not found.')
                    ],
                    ephemeral: true
                });
            }

            if (!giveaway.ended) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.warning)
                            .setDescription('This giveaway has not ended yet.')
                    ],
                    ephemeral: true
                });
            }

            const channel = await client.channels.fetch(giveaway.channel_id).catch(() => null);
            if (!channel) return;

            const message = await channel.messages.fetch(messageId).catch(() => null);
            if (!message) return;

            const entries = getGiveawayEntries.all(giveaway.id);
            if (entries.length === 0) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.warning)
                            .setDescription('No valid entries.')
                    ],
                    ephemeral: true
                });
            }

            const winner = entries[Math.floor(Math.random() * entries.length)];

            await channel.send({
                content: `🎉 Congratulations <@${winner.user_id}>! You won the reroll for **${giveaway.prize}**!`
            });

            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.success)
                        .setDescription(`Rerolled! New winner: <@${winner.user_id}>`)
                ],
                ephemeral: true
            });
        }
    }
};

function parseDuration(str) {
    const match = str.match(/^(\d+)(m|h|d|w)$/);
    if (!match) return null;

    const value = parseInt(match[1]);
    const unit = match[2];

    const multipliers = {
        'm': 60 * 1000,
        'h': 60 * 60 * 1000,
        'd': 24 * 60 * 60 * 1000,
        'w': 7 * 24 * 60 * 60 * 1000
    };

    return value * multipliers[unit];
}

async function endGiveawayNow(client, giveaway) {
    const channel = await client.channels.fetch(giveaway.channel_id).catch(() => null);
    if (!channel) return;

    const message = await channel.messages.fetch(giveaway.message_id).catch(() => null);
    if (!message) return;

    endGiveaway.run(giveaway.message_id);

    const embed = EmbedBuilder.from(message.embeds[0])
        .setColor(colors.danger)
        .setTitle('🎉 GIVEAWAY ENDED 🎉')
        .setFooter({ text: 'Giveaway ended' });

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('giveaway_ended')
                .setLabel('Giveaway Ended')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true)
        );

    await message.edit({ embeds: [embed], components: [row] });

    const entries = getGiveawayEntries.all(giveaway.id);

    if (entries.length === 0) {
        await channel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor(colors.warning)
                    .setDescription(`No one entered the giveaway for **${giveaway.prize}**`)
            ]
        });
        return;
    }

    const shuffled = [...entries].sort(() => Math.random() - 0.5);
    const winners = shuffled.slice(0, Math.min(giveaway.winners, shuffled.length));
    const winnerMentions = winners.map(w => `<@${w.user_id}>`).join(', ');

    await channel.send({
        content: `🎉 Congratulations ${winnerMentions}! You won **${giveaway.prize}**!`,
        embeds: [
            new EmbedBuilder()
                .setColor(colors.success)
                .setTitle('🎊 Winners!')
                .setDescription(`**Prize:** ${giveaway.prize}\n**Winners:** ${winnerMentions}`)
                .setTimestamp()
        ]
    });
}

module.exports.endGiveawayNow = endGiveawayNow;
