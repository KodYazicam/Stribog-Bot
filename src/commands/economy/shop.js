const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { colors } = require('../../config/config');
const { getShopItems, getShopItem, insertShopItem, deleteShopItem, getUser, insertUser, updateUserBalance } = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('View and manage the server shop')
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View available items'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('buy')
                .setDescription('Buy an item from the shop')
                .addIntegerOption(option =>
                    option.setName('id')
                        .setDescription('Item ID to buy')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add an item to the shop (Admin)')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Item name')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('price')
                        .setDescription('Item price')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('Item description')
                        .setRequired(false))
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('Role to give when purchased')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove an item from the shop (Admin)')
                .addIntegerOption(option =>
                    option.setName('id')
                        .setDescription('Item ID to remove')
                        .setRequired(true))),

    cooldown: 5,

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'view') {
            const items = getShopItems.all(interaction.guild.id);

            if (items.length === 0) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.info)
                            .setTitle('🛒 Server Shop')
                            .setDescription('The shop is empty. Ask an admin to add items!')
                    ]
                });
            }

            const embed = new EmbedBuilder()
                .setColor(colors.primary)
                .setTitle('🛒 Server Shop')
                .setDescription('Use `/shop buy <id>` to purchase an item!')
                .setFooter({ text: `${items.length} items available` });

            items.forEach(item => {
                let itemDesc = item.description || 'No description';
                if (item.role_id) {
                    itemDesc += `\n🎭 Grants role: <@&${item.role_id}>`;
                }
                embed.addFields({
                    name: `#${item.id} - ${item.name}`,
                    value: `💰 **${item.price.toLocaleString()}** coins\n${itemDesc}`,
                    inline: true
                });
            });

            await interaction.reply({ embeds: [embed] });

        } else if (subcommand === 'buy') {
            const itemId = interaction.options.getInteger('id');
            const item = getShopItem.get(itemId, interaction.guild.id);

            if (!item) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.danger)
                            .setDescription('Item not found!')
                    ],
                    ephemeral: true
                });
            }

            insertUser.run(interaction.user.id);
            const user = getUser.get(interaction.user.id);

            if (user.balance < item.price) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.danger)
                            .setDescription(`You don't have enough coins! You need **${item.price.toLocaleString()}** but only have **${user.balance.toLocaleString()}**.`)
                    ],
                    ephemeral: true
                });
            }

            updateUserBalance.run(user.balance - item.price, interaction.user.id);

            let rewardMessage = '';
            if (item.role_id) {
                const role = await interaction.guild.roles.fetch(item.role_id).catch(() => null);
                if (role) {
                    await interaction.member.roles.add(role).catch(() => {});
                    rewardMessage = `\nYou received the ${role} role!`;
                }
            }

            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.success)
                        .setTitle('🛍️ Purchase Successful!')
                        .setDescription(`You bought **${item.name}** for **${item.price.toLocaleString()}** coins!${rewardMessage}`)
                ]
            });

        } else if (subcommand === 'add') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.danger)
                            .setDescription('You need Administrator permission to add items!')
                    ],
                    ephemeral: true
                });
            }

            const name = interaction.options.getString('name');
            const price = interaction.options.getInteger('price');
            const description = interaction.options.getString('description');
            const role = interaction.options.getRole('role');

            if (price < 1) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.danger)
                            .setDescription('Price must be at least 1 coin!')
                    ],
                    ephemeral: true
                });
            }

            insertShopItem.run(
                interaction.guild.id,
                name,
                description || null,
                price,
                role?.id || null
            );

            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.success)
                        .setTitle('Item Added!')
                        .addFields(
                            { name: 'Name', value: name, inline: true },
                            { name: 'Price', value: `${price.toLocaleString()} coins`, inline: true }
                        )
                ]
            });

        } else if (subcommand === 'remove') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.danger)
                            .setDescription('You need Administrator permission to remove items!')
                    ],
                    ephemeral: true
                });
            }

            const itemId = interaction.options.getInteger('id');
            const item = getShopItem.get(itemId, interaction.guild.id);

            if (!item) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.danger)
                            .setDescription('Item not found!')
                    ],
                    ephemeral: true
                });
            }

            deleteShopItem.run(itemId, interaction.guild.id);

            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.success)
                        .setDescription(`Removed **${item.name}** from the shop.`)
                ]
            });
        }
    }
};
