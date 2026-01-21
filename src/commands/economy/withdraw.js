const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { colors } = require('../../config/config');
const { getUser, insertUser, updateUserBalance, updateUserBank } = require('../../utils/database');

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
        
        insertUser.run(interaction.user.id);
        const userData = getUser.get(interaction.user.id);

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

        const newBalance = userData.balance + amount;
        const newBank = userData.bank - amount;

        updateUserBalance.run(newBalance, interaction.user.id);
        updateUserBank.run(newBank, interaction.user.id);

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
