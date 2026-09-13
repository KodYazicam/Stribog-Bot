const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { colors } = require('../../config/config');
const { transferCoins, ensureEconomy } = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('give')
        .setDescription('Give coins to another user in this server')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to give coins to')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Amount of coins to give')
                .setRequired(true)
                .setMinValue(1)),
    
    cooldown: 5,
    
    async execute(interaction) {
        if (!interaction.guild) {
            return interaction.reply({ content: 'Economy is per-server. Use this in a guild.', ephemeral: true });
        }
        const target = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');

        if (target.id === interaction.user.id) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.danger)
                        .setDescription('You cannot give coins to yourself.')
                ],
                ephemeral: true
            });
        }

        if (target.bot) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.danger)
                        .setDescription('You cannot give coins to a bot.')
                ],
                ephemeral: true
            });
        }

        const ok = transferCoins(interaction.user.id, target.id, interaction.guild.id, amount);
        if (!ok) {
            const senderData = ensureEconomy(interaction.user.id, interaction.guild.id);
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.danger)
                        .setDescription(`You don't have enough coins. Your balance: **${senderData.balance.toLocaleString()}** coins`)
                ],
                ephemeral: true
            });
        }

        const senderData = ensureEconomy(interaction.user.id, interaction.guild.id);
        const receiverData = ensureEconomy(target.id, interaction.guild.id);

        const embed = new EmbedBuilder()
            .setColor(colors.success)
            .setTitle('💸 Transfer Complete')
            .setDescription(`You gave **${amount.toLocaleString()}** coins to ${target}`)
            .addFields(
                { name: 'Your New Balance', value: `${senderData.balance.toLocaleString()} coins`, inline: true },
                { name: `${target.username}'s New Balance`, value: `${receiverData.balance.toLocaleString()} coins`, inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
