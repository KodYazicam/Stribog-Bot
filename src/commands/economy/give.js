const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { colors } = require('../../config/config');
const { getUser, insertUser, updateUserBalance } = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('give')
        .setDescription('Give coins to another user')
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

        insertUser.run(interaction.user.id);
        insertUser.run(target.id);

        const senderData = getUser.get(interaction.user.id);
        const receiverData = getUser.get(target.id);

        if (senderData.balance < amount) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.danger)
                        .setDescription(`You don't have enough coins. Your balance: **${senderData.balance.toLocaleString()}** coins`)
                ],
                ephemeral: true
            });
        }

        const newSenderBalance = senderData.balance - amount;
        const newReceiverBalance = receiverData.balance + amount;

        updateUserBalance.run(newSenderBalance, interaction.user.id);
        updateUserBalance.run(newReceiverBalance, target.id);

        const embed = new EmbedBuilder()
            .setColor(colors.success)
            .setTitle('💸 Transfer Complete')
            .setDescription(`You gave **${amount.toLocaleString()}** coins to ${target}`)
            .addFields(
                { name: 'Your New Balance', value: `${newSenderBalance.toLocaleString()} coins`, inline: true },
                { name: `${target.username}'s New Balance`, value: `${newReceiverBalance.toLocaleString()} coins`, inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
