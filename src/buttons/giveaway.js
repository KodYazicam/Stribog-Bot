const { EmbedBuilder } = require('discord.js');
const { colors } = require('../config/config');
const { getGiveaway, getGiveawayEntries, addGiveawayEntry, removeGiveawayEntry, checkGiveawayEntry } = require('../utils/database');

module.exports = {
    async execute(interaction, client, args) {
        const action = args[0];
        const giveawayId = args[1] || interaction.customId.split('_')[2];

        const giveaway = getGiveaway.get(giveawayId);

        if (!giveaway) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.danger)
                        .setDescription('This giveaway no longer exists.')
                ],
                ephemeral: true
            });
        }

        if (giveaway.status !== 'active') {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.warning)
                        .setDescription('This giveaway has already ended.')
                ],
                ephemeral: true
            });
        }

        if (action === 'enter' || interaction.customId.startsWith('giveaway_enter')) {
            const existingEntry = checkGiveawayEntry.get(giveawayId, interaction.user.id);

            if (existingEntry) {
                removeGiveawayEntry.run(giveawayId, interaction.user.id);

                const entries = getGiveawayEntries.all(giveawayId);

                await interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.warning)
                            .setDescription(`You have left the giveaway for **${giveaway.prize}**`)
                            .addFields({ name: 'Current Entries', value: `${entries.length}`, inline: true })
                    ],
                    ephemeral: true
                });
            } else {
                addGiveawayEntry.run(giveawayId, interaction.user.id, Date.now());

                const entries = getGiveawayEntries.all(giveawayId);

                await interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.success)
                            .setTitle('🎉 Entered!')
                            .setDescription(`You have entered the giveaway for **${giveaway.prize}**`)
                            .addFields({ name: 'Current Entries', value: `${entries.length}`, inline: true })
                    ],
                    ephemeral: true
                });
            }

            const entries = getGiveawayEntries.all(giveawayId);
            const channel = await client.channels.fetch(giveaway.channel_id).catch(() => null);
            if (channel) {
                const message = await channel.messages.fetch(giveaway.message_id).catch(() => null);
                if (message) {
                    const embed = EmbedBuilder.from(message.embeds[0]);
                    const entryField = embed.data.fields.find(f => f.name === 'Entries');
                    if (entryField) {
                        entryField.value = `${entries.length}`;
                    }
                    await message.edit({ embeds: [embed] });
                }
            }
        }
    }
};
