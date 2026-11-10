const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { colors } = require('../../config/config');
const { getWarnings, clearWarnings, deleteWarningById } = require('../../utils/database');

function truncate(value, maxLength = 1024) {
    if (value.length <= maxLength) return value;
    return `${value.slice(0, maxLength - 1)}…`;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warnings')
        .setDescription('View or manage warnings')
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('View a user\'s warnings')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user whose warnings to view')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a warning by id')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The warned user')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('id')
                        .setDescription('Warning id from /warnings list')
                        .setRequired(true)
                        .setMinValue(1)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('clear')
                .setDescription('Clear all warnings for a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The warned user')
                        .setRequired(true)))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    cooldown: 3,

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const target = interaction.options.getUser('user');

        if (subcommand === 'list') {
            const warnings = getWarnings.all(interaction.guild.id, target.id);

            if (warnings.length === 0) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.info)
                            .setDescription(`No warnings found for ${target.tag}.`)
                    ],
                    ephemeral: true
                });
            }

            const shown = warnings.slice(0, 10);
            const embed = new EmbedBuilder()
                .setColor(colors.warning)
                .setTitle('Warning History')
                .setDescription(`**${warnings.length}** warning${warnings.length === 1 ? '' : 's'} for ${target.tag}.`)
                .addFields(shown.map(warning => ({
                    name: `#${warning.id} • <t:${Math.floor(warning.timestamp / 1000)}:f>`,
                    value: truncate(`${warning.reason}\nBy <@${warning.moderator_id}>`)
                })))
                .setTimestamp();

            if (warnings.length > shown.length) {
                embed.setFooter({ text: `Showing the latest ${shown.length} of ${warnings.length} warnings.` });
            }

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (subcommand === 'remove') {
            const warningId = interaction.options.getInteger('id');
            const result = deleteWarningById.run(warningId, interaction.guild.id, target.id);

            if (result.changes === 0) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.danger)
                            .setDescription(`Warning #${warningId} was not found for ${target.tag}.`)
                    ],
                    ephemeral: true
                });
            }

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.success)
                        .setDescription(`Removed warning #${warningId} for ${target.tag}.`)
                ]
            });
        }

        if (subcommand === 'clear') {
            const warnings = getWarnings.all(interaction.guild.id, target.id);

            if (warnings.length === 0) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.info)
                            .setDescription(`No warnings found for ${target.tag}.`)
                    ],
                    ephemeral: true
                });
            }

            clearWarnings.run(interaction.guild.id, target.id);

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.success)
                        .setDescription(`Cleared **${warnings.length}** warning${warnings.length === 1 ? '' : 's'} for ${target.tag}.`)
                ]
            });
        }
    }
};
