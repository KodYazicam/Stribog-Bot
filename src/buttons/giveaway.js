const { EmbedBuilder } = require('discord.js');
const { colors } = require('../config/config');
const { getGiveaway, getGiveawayEntries, addGiveawayEntry, removeGiveawayEntry, checkGiveawayEntry } = require('../utils/database');

module.exports = {
    async execute(interaction) {
        const messageId = interaction.message?.id;
        const giveaway = messageId ? getGiveaway.get(messageId) : null;

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

        const existingEntry = checkGiveawayEntry.get(giveaway.id, interaction.user.id);

        if (existingEntry) {
            removeGiveawayEntry.run(giveaway.id, interaction.user.id);
            const entries = getGiveawayEntries.all(giveaway.id);
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.warning)
                        .setDescription(`You have left the giveaway for **${giveaway.prize}**`)
                        .addFields({ name: 'Current Entries', value: `${entries.length}`, inline: true })
                ],
                ephemeral: true
            });
            await updateEntryCount(interaction, entries.length);
            return;
        }

        addGiveawayEntry.run(giveaway.id, interaction.user.id, Date.now());
        const entries = getGiveawayEntries.all(giveaway.id);
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
        await updateEntryCount(interaction, entries.length);
    }
};

async function updateEntryCount(interaction, count) {
    try {
        const row = interaction.message.components[0];
        if (!row) return;
        const button = row.components[0];
        button.setLabel(`Enter (${count})`);
        await interaction.message.edit({ components: [row] });
    } catch {}
}
