const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { colors } = require('../../config/config');
const { getGuild, insertGuild, updateGuildSetting } = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('automod')
        .setDescription('Configure automod settings')
        .addSubcommand(subcommand =>
            subcommand
                .setName('antilink')
                .setDescription('Toggle anti-link protection')
                .addBooleanOption(option =>
                    option.setName('enabled')
                        .setDescription('Enable or disable')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('antispam')
                .setDescription('Toggle anti-spam protection')
                .addBooleanOption(option =>
                    option.setName('enabled')
                        .setDescription('Enable or disable')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('badwords')
                .setDescription('Toggle bad words filter')
                .addBooleanOption(option =>
                    option.setName('enabled')
                        .setDescription('Enable or disable')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('caps')
                .setDescription('Toggle excessive caps filter')
                .addBooleanOption(option =>
                    option.setName('enabled')
                        .setDescription('Enable or disable')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('mentions')
                .setDescription('Toggle mass mentions filter')
                .addBooleanOption(option =>
                    option.setName('enabled')
                        .setDescription('Enable or disable')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('addword')
                .setDescription('Add a word to the filter list')
                .addStringOption(option =>
                    option.setName('word')
                        .setDescription('Word to add')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('removeword')
                .setDescription('Remove a word from the filter list')
                .addStringOption(option =>
                    option.setName('word')
                        .setDescription('Word to remove')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('whitelist')
                .setDescription('Add a domain to link whitelist')
                .addStringOption(option =>
                    option.setName('domain')
                        .setDescription('Domain to whitelist (e.g., youtube.com)')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('View current automod settings'))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    cooldown: 5,

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        insertGuild.run(interaction.guild.id);
        const guildData = getGuild.get(interaction.guild.id);

        if (subcommand === 'antilink') {
            const enabled = interaction.options.getBoolean('enabled');
            updateGuildSetting('automod_antilink').run(enabled ? 1 : 0, interaction.guild.id);

            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(enabled ? colors.success : colors.warning)
                        .setDescription(`Anti-link protection has been ${enabled ? 'enabled' : 'disabled'}.`)
                ]
            });

        } else if (subcommand === 'antispam') {
            const enabled = interaction.options.getBoolean('enabled');
            updateGuildSetting('automod_antispam').run(enabled ? 1 : 0, interaction.guild.id);

            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(enabled ? colors.success : colors.warning)
                        .setDescription(`Anti-spam protection has been ${enabled ? 'enabled' : 'disabled'}.`)
                ]
            });

        } else if (subcommand === 'badwords') {
            const enabled = interaction.options.getBoolean('enabled');
            updateGuildSetting('automod_badwords').run(enabled ? 1 : 0, interaction.guild.id);

            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(enabled ? colors.success : colors.warning)
                        .setDescription(`Bad words filter has been ${enabled ? 'enabled' : 'disabled'}.`)
                ]
            });

        } else if (subcommand === 'caps') {
            const enabled = interaction.options.getBoolean('enabled');
            updateGuildSetting('automod_caps').run(enabled ? 1 : 0, interaction.guild.id);

            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(enabled ? colors.success : colors.warning)
                        .setDescription(`Excessive caps filter has been ${enabled ? 'enabled' : 'disabled'}.`)
                ]
            });

        } else if (subcommand === 'mentions') {
            const enabled = interaction.options.getBoolean('enabled');
            updateGuildSetting('automod_mentions').run(enabled ? 1 : 0, interaction.guild.id);

            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(enabled ? colors.success : colors.warning)
                        .setDescription(`Mass mentions filter has been ${enabled ? 'enabled' : 'disabled'}.`)
                ]
            });

        } else if (subcommand === 'addword') {
            const word = interaction.options.getString('word').toLowerCase();
            let wordList = [];
            
            if (guildData?.automod_wordlist) {
                try {
                    wordList = JSON.parse(guildData.automod_wordlist);
                } catch {}
            }

            if (wordList.includes(word)) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.warning)
                            .setDescription('This word is already in the filter list.')
                    ],
                    ephemeral: true
                });
            }

            wordList.push(word);
            updateGuildSetting('automod_wordlist').run(JSON.stringify(wordList), interaction.guild.id);

            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.success)
                        .setDescription(`Added **${word}** to the filter list.`)
                        .addFields({ name: 'Total Words', value: `${wordList.length}`, inline: true })
                ]
            });

        } else if (subcommand === 'removeword') {
            const word = interaction.options.getString('word').toLowerCase();
            let wordList = [];
            
            if (guildData?.automod_wordlist) {
                try {
                    wordList = JSON.parse(guildData.automod_wordlist);
                } catch {}
            }

            if (!wordList.includes(word)) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.warning)
                            .setDescription('This word is not in the filter list.')
                    ],
                    ephemeral: true
                });
            }

            wordList = wordList.filter(w => w !== word);
            updateGuildSetting('automod_wordlist').run(JSON.stringify(wordList), interaction.guild.id);

            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.success)
                        .setDescription(`Removed **${word}** from the filter list.`)
                        .addFields({ name: 'Total Words', value: `${wordList.length}`, inline: true })
                ]
            });

        } else if (subcommand === 'whitelist') {
            const domain = interaction.options.getString('domain').toLowerCase();
            let whitelist = [];
            
            if (guildData?.automod_whitelist) {
                try {
                    whitelist = JSON.parse(guildData.automod_whitelist);
                } catch {}
            }

            if (whitelist.includes(domain)) {
                whitelist = whitelist.filter(d => d !== domain);
                updateGuildSetting('automod_whitelist').run(JSON.stringify(whitelist), interaction.guild.id);

                await interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.warning)
                            .setDescription(`Removed **${domain}** from the whitelist.`)
                    ]
                });
            } else {
                whitelist.push(domain);
                updateGuildSetting('automod_whitelist').run(JSON.stringify(whitelist), interaction.guild.id);

                await interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.success)
                            .setDescription(`Added **${domain}** to the whitelist.`)
                    ]
                });
            }

        } else if (subcommand === 'status') {
            const embed = new EmbedBuilder()
                .setColor(colors.info)
                .setTitle('AutoMod Settings')
                .addFields(
                    { name: 'Anti-Link', value: guildData?.automod_antilink ? '✅ Enabled' : '❌ Disabled', inline: true },
                    { name: 'Anti-Spam', value: guildData?.automod_antispam ? '✅ Enabled' : '❌ Disabled', inline: true },
                    { name: 'Bad Words', value: guildData?.automod_badwords ? '✅ Enabled' : '❌ Disabled', inline: true },
                    { name: 'Caps Filter', value: guildData?.automod_caps ? '✅ Enabled' : '❌ Disabled', inline: true },
                    { name: 'Mass Mentions', value: guildData?.automod_mentions ? '✅ Enabled' : '❌ Disabled', inline: true }
                )
                .setTimestamp();

            if (guildData?.automod_wordlist) {
                try {
                    const words = JSON.parse(guildData.automod_wordlist);
                    embed.addFields({ name: 'Filtered Words', value: `${words.length} words`, inline: true });
                } catch {}
            }

            if (guildData?.automod_whitelist) {
                try {
                    const whitelist = JSON.parse(guildData.automod_whitelist);
                    if (whitelist.length > 0) {
                        embed.addFields({
                            name: 'Whitelisted Domains',
                            value: whitelist.join(', '),
                            inline: false
                        });
                    }
                } catch {}
            }

            await interaction.reply({ embeds: [embed] });
        }
    }
};
