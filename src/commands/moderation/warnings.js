const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { colors } = require('../../config/config');
const { getWarnings, clearWarnings, deleteWarningById } = require('../../utils/database');
const { sendModLog } = require('../../utils/modlog');

function truncate(value, maxLength = 1024) {
    if (value.length <= maxLength) return value;
    return `${value.slice(0, maxLength - 1)}…`;
}

function warningCount(count) {
    return `${count} warning${count === 1 ? '' : 's'}`;
}

function guildLabel(guild) {
    return `${guild.name} (${guild.id})`;
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
            const warnings = getWarnings.all(interaction.guild.id, target.id);
            const warning = warnings.find(row => row.id === warningId);
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

            await sendModLog(interaction.guild, {
                title: 'Warning Removed',
                description: `Removed warning #${warningId} from <@${target.id}>.`,
                color: colors.warning,
                moderator: interaction.user,
                target,
                fields: [
                    { name: 'Guild', value: guildLabel(interaction.guild) },
                    { name: 'Warning ID', value: String(warningId), inline: true },
                    { name: 'Reason', value: truncate(warning?.reason || 'Unknown') },
                    { name: 'Before', value: warningCount(warnings.length), inline: true },
                    { name: 'After', value: warningCount(warnings.length - result.changes), inline: true }
                ]
            });

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

            await sendModLog(interaction.guild, {
                title: 'Warnings Cleared',
                description: `Cleared **${warnings.length}** warning${warnings.length === 1 ? '' : 's'} for <@${target.id}>.`,
                color: colors.warning,
                moderator: interaction.user,
                target,
                fields: [
                    { name: 'Guild', value: guildLabel(interaction.guild) },
                    { name: 'Cleared Warnings', value: String(warnings.length), inline: true },
                    { name: 'Before', value: warningCount(warnings.length), inline: true },
                    { name: 'After', value: warningCount(0), inline: true }
                ]
            });

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
