const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { colors } = require('../../config/config');
const { getUserReminders, insertReminder, deleteReminder } = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reminder')
        .setDescription('Manage reminders')
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Set a reminder')
                .addStringOption(option =>
                    option.setName('time')
                        .setDescription('Time (e.g., 1h, 30m, 2d, 1w)')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('message')
                        .setDescription('Reminder message')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List your reminders'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Delete a reminder')
                .addIntegerOption(option =>
                    option.setName('id')
                        .setDescription('Reminder ID')
                        .setRequired(true))),

    cooldown: 5,

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'set') {
            const timeStr = interaction.options.getString('time');
            const message = interaction.options.getString('message');

            const duration = parseTime(timeStr);
            if (!duration || duration < 60000) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.danger)
                            .setDescription('Invalid time format. Use: 1m, 1h, 1d, 1w (minimum 1 minute)')
                    ],
                    ephemeral: true
                });
            }

            if (duration > 30 * 24 * 60 * 60 * 1000) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.danger)
                            .setDescription('Maximum reminder duration is 30 days.')
                    ],
                    ephemeral: true
                });
            }

            const userReminders = getUserReminders.all(interaction.user.id);
            if (userReminders.length >= 10) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.warning)
                            .setDescription('You can only have 10 active reminders.')
                    ],
                    ephemeral: true
                });
            }

            const endTime = Date.now() + duration;

            insertReminder.run(
                interaction.user.id,
                interaction.channel.id,
                interaction.guild?.id || null,
                message,
                endTime
            );

            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.success)
                        .setTitle('⏰ Reminder Set')
                        .addFields(
                            { name: 'Message', value: message, inline: false },
                            { name: 'Time', value: `<t:${Math.floor(endTime / 1000)}:R>`, inline: true }
                        )
                        .setTimestamp()
                ]
            });

        } else if (subcommand === 'list') {
            const reminders = getUserReminders.all(interaction.user.id);

            if (reminders.length === 0) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.info)
                            .setDescription('You have no active reminders.')
                    ],
                    ephemeral: true
                });
            }

            const embed = new EmbedBuilder()
                .setColor(colors.info)
                .setTitle('⏰ Your Reminders')
                .setDescription(
                    reminders.map((r, i) => {
                        const message = r.message.length > 50 ? r.message.slice(0, 47) + '...' : r.message;
                        return `**${r.id}.** ${message}\n└ <t:${Math.floor(r.remind_at / 1000)}:R>`;
                    }).join('\n\n')
                )
                .setFooter({ text: `${reminders.length}/10 reminders` });

            await interaction.reply({ embeds: [embed], ephemeral: true });

        } else if (subcommand === 'delete') {
            const id = interaction.options.getInteger('id');
            const reminders = getUserReminders.all(interaction.user.id);
            const reminder = reminders.find(r => r.id === id);

            if (!reminder) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.danger)
                            .setDescription('Reminder not found or does not belong to you.')
                    ],
                    ephemeral: true
                });
            }

            deleteReminder.run(id);

            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.success)
                        .setDescription(`Reminder **#${id}** has been deleted.`)
                ],
                ephemeral: true
            });
        }
    }
};

function parseTime(timeStr) {
    const regex = /^(\d+)([smhdw])$/i;
    const match = timeStr.match(regex);

    if (!match) return null;

    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    const multipliers = {
        's': 1000,
        'm': 60 * 1000,
        'h': 60 * 60 * 1000,
        'd': 24 * 60 * 60 * 1000,
        'w': 7 * 24 * 60 * 60 * 1000
    };

    return value * multipliers[unit];
}
