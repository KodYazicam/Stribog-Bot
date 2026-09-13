const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { colors } = require('../../config/config');
const { ensureEconomy, updateEconomyBalance, updateEconomyBank } = require('../../utils/database');

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

        const newBalance = userData.balance - amount;
        const newBank = userData.bank + amount;

        updateEconomyBalance.run(newBalance, interaction.user.id, interaction.guild.id);
        updateEconomyBank.run(newBank, interaction.user.id, interaction.guild.id);

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
