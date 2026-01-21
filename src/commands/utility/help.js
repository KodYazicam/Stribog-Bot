const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { colors } = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('View all commands')
        .addStringOption(option =>
            option.setName('command')
                .setDescription('Get info about a specific command')
                .setRequired(false)),
    
    cooldown: 3,
    
    async execute(interaction, client) {
        const commandName = interaction.options.getString('command');

        if (commandName) {
            const command = client.commands.get(commandName.toLowerCase());

            if (!command) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.danger)
                            .setDescription(`Command \`${commandName}\` not found.`)
                    ],
                    ephemeral: true
                });
            }

            const embed = new EmbedBuilder()
                .setColor(colors.primary)
                .setTitle(`/${command.data.name}`)
                .setDescription(command.data.description)
                .addFields({ name: 'Cooldown', value: `${command.cooldown || 3} seconds`, inline: true });

            if (command.data.options?.length > 0) {
                const options = command.data.options.map(opt => {
                    const required = opt.required ? '(required)' : '(optional)';
                    return `\`${opt.name}\` - ${opt.description} ${required}`;
                }).join('\n');
                embed.addFields({ name: 'Options', value: options });
            }

            return interaction.reply({ embeds: [embed] });
        }

        const categories = new Map();

        client.commands.forEach(cmd => {
            const category = cmd.category || 'Uncategorized';
            if (!categories.has(category)) {
                categories.set(category, []);
            }
            categories.get(category).push(cmd);
        });

        const categoryEmojis = {
            moderation: '🛡️',
            info: 'ℹ️',
            fun: '🎮',
            utility: '🔧'
        };

        const embed = new EmbedBuilder()
            .setColor(colors.primary)
            .setTitle('📚 Help Menu')
            .setDescription('Select a category from the dropdown menu below to view commands.')
            .setFooter({ text: `Total Commands: ${client.commands.size}` })
            .setTimestamp();

        const categoryList = [];
        categories.forEach((commands, category) => {
            const emoji = categoryEmojis[category.toLowerCase()] || '📁';
            categoryList.push(`${emoji} **${category}** - ${commands.length} commands`);
        });

        embed.addFields({ name: 'Categories', value: categoryList.join('\n') });

        const options = [];
        categories.forEach((commands, category) => {
            const emoji = categoryEmojis[category.toLowerCase()] || '📁';
            options.push({
                label: category.charAt(0).toUpperCase() + category.slice(1),
                description: `View ${category} commands`,
                value: category,
                emoji: emoji
            });
        });

        const row = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('help_category')
                    .setPlaceholder('Select a category')
                    .addOptions(options)
            );

        await interaction.reply({ embeds: [embed], components: [row] });
    }
};
