const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { colors } = require('../../config/config');
const { ensureEconomy, withdrawFromBank } = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('withdraw')
        .setDescription('Withdraw coins from your bank')
        .addStringOption(option =>
            option.setName('amount')
                .setDescription('Amount to withdraw (number or "all")')
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
            amount = userData.bank;
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

        if (amount > userData.bank) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.danger)
                        .setDescription(`You don't have enough coins in your bank. Bank: **${userData.bank.toLocaleString()}** coins`)
                ],
                ephemeral: true
            });
        }

        // One guarded statement: the wallet is credited only in the same write
        // that debits the bank, so a failure cannot create coins.
        if (!withdrawFromBank(interaction.user.id, interaction.guild.id, amount)) {
            const latest = ensureEconomy(interaction.user.id, interaction.guild.id);
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.danger)
                        .setDescription(`You don't have enough coins in your bank. Bank: **${latest.bank.toLocaleString()}** coins`)
                ],
                ephemeral: true
            });
        }

        const updated = ensureEconomy(interaction.user.id, interaction.guild.id);
        const newBalance = updated.balance;
        const newBank = updated.bank;

        const embed = new EmbedBuilder()
            .setColor(colors.success)
            .setTitle('🏦 Withdrawal Successful')
            .setDescription(`You withdrew **${amount.toLocaleString()}** coins from your bank.`)
            .addFields(
                { name: 'Wallet', value: `${newBalance.toLocaleString()} coins`, inline: true },
                { name: 'Bank', value: `${newBank.toLocaleString()} coins`, inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
