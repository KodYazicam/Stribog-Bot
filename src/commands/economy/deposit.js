const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { colors } = require('../../config/config');
const { ensureEconomy, depositToBank } = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('deposit')
        .setDescription('Deposit coins to your bank')
        .addStringOption(option =>
            option.setName('amount')
                .setDescription('Amount to deposit (number or "all")')
                .setRequired(true)),
    
    cooldown: 5,
    
    async execute(interaction) {
        const amountStr = interaction.options.getString('amount');
        
        if (!interaction.guild) {
            return interaction.reply({ content: 'Economy is per-server. Use this in a guild.', ephemeral: true });
        }
        const userData = ensureEconomy(interaction.user.id, interaction.guild.id);

        let amount;
        if (amountStr.toLowerCase() === 'all') {
            amount = userData.balance;
        } else {
            amount = parseInt(amountStr);
            if (isNaN(amount) || amount <= 0) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.danger)
                            .setDescription('Please enter a valid amount.')
                    ],
                    ephemeral: true
                });
            }
        }

        if (amount <= 0) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.danger)
                        .setDescription('Please enter a valid amount.')
                ],
                ephemeral: true
            });
        }

        if (amount > userData.balance) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.danger)
                        .setDescription(`You don't have enough coins. Your wallet: **${userData.balance.toLocaleString()}** coins`)
                ],
                ephemeral: true
            });
        }

        // One guarded statement: the bank is credited only in the same write
        // that debits the wallet, so a failure cannot swallow coins.
        if (!depositToBank(interaction.user.id, interaction.guild.id, amount)) {
            const latest = ensureEconomy(interaction.user.id, interaction.guild.id);
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.danger)
                        .setDescription(`You don't have enough coins. Your wallet: **${latest.balance.toLocaleString()}** coins`)
                ],
                ephemeral: true
            });
        }

        const updated = ensureEconomy(interaction.user.id, interaction.guild.id);
        const newBalance = updated.balance;
        const newBank = updated.bank;

        const embed = new EmbedBuilder()
            .setColor(colors.success)
            .setTitle('🏦 Deposit Successful')
            .setDescription(`You deposited **${amount.toLocaleString()}** coins to your bank.`)
            .addFields(
                { name: 'Wallet', value: `${newBalance.toLocaleString()} coins`, inline: true },
                { name: 'Bank', value: `${newBank.toLocaleString()} coins`, inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
