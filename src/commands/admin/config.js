const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
    AttachmentBuilder
} = require('discord.js');
const { colors } = require('../../config/config');
const { buildGuildConfig, validateGuildConfig, applyGuildConfig } = require('../../utils/guildConfig');

const MAX_IMPORT_BYTES = 1024 * 1024;

function summaryDescription(config) {
    return [
        `Settings: **${Object.keys(config.settings).length}**`,
        `Permission rules: **${config.command_permissions.length}**`,
        `Disabled-command rules: **${config.disabled_commands.length}**`
    ].join('\n');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('config')
        .setDescription('Export or import this server\'s configuration')
        .addSubcommand(subcommand =>
            subcommand
                .setName('export')
                .setDescription('Download a JSON backup of this server\'s configuration'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('import')
                .setDescription('Restore configuration from a JSON backup')
                .addAttachmentOption(option =>
                    option.setName('file')
                        .setDescription('JSON file created by /config export')
                        .setRequired(true))
                .addBooleanOption(option =>
                    option.setName('confirm')
                        .setDescription('Apply the import. Omit for a dry run')
                        .setRequired(false)))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    cooldown: 10,

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'export') {
            const config = buildGuildConfig(interaction.guild.id);
            const file = new AttachmentBuilder(Buffer.from(JSON.stringify(config, null, 2)), {
                name: `stribog-config-${interaction.guild.id}.json`
            });

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.success)
                        .setTitle('Configuration Exported')
                        .setDescription(summaryDescription(config))
                        .setFooter({ text: 'Keep this file private. It contains server configuration, not secrets.' })
                ],
                files: [file],
                ephemeral: true
            });
        }

        const attachment = interaction.options.getAttachment('file');
        const confirm = interaction.options.getBoolean('confirm') ?? false;

        if (attachment.size > MAX_IMPORT_BYTES) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.danger)
                        .setDescription('Config file is too large. Maximum size is 1 MB.')
                ],
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const response = await fetch(attachment.url);
            if (!response.ok) throw new Error('Could not download the config file.');

            const text = await response.text();
            if (Buffer.byteLength(text, 'utf8') > MAX_IMPORT_BYTES) {
                throw new Error('Config file is too large. Maximum size is 1 MB.');
            }

            let payload;
            try {
                payload = JSON.parse(text);
            } catch {
                throw new Error('Config file is not valid JSON.');
            }

            const config = validateGuildConfig(payload, interaction.guild.id);

            if (!confirm) {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.warning)
                            .setTitle('Import Dry Run')
                            .setDescription(`${summaryDescription(config)}\n\nNo changes were made. Re-run with \`confirm:true\` to apply.`)
                    ]
                });
            }

            const applied = applyGuildConfig(interaction.guild.id, payload);

            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.success)
                        .setTitle('Configuration Imported')
                        .setDescription([
                            `Settings: **${applied.settings}**`,
                            `Permission rules: **${applied.command_permissions}**`,
                            `Disabled-command rules: **${applied.disabled_commands}**`
                        ].join('\n'))
                ]
            });
        } catch (error) {
            console.error('Config import error:', error);
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.danger)
                        .setDescription(error.message || 'Failed to import configuration.')
                ]
            });
        }
    }
};
