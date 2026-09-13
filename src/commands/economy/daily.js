const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { colors } = require('../../config/config');
const { ensureEconomy, updateEconomyBalance, updateEconomyDaily } = require('../../utils/database');
const { economy } = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Claim your daily reward'),
    
    cooldown: 5,
    
    async execute(interaction) {
        if (!interaction.guild) {
            return interaction.reply({ content: 'Economy is per-server. Use this in a guild.', ephemeral: true });
        }
        const userData = ensureEconomy(interaction.user.id, interaction.guild.id);

        const now = Date.now();
        const lastClaimed = userData.daily_claimed || 0;
        const cooldown = economy.dailyCooldown;

        if (now - lastClaimed < cooldown) {
            const timeLeft = cooldown - (now - lastClaimed);
            const hours = Math.floor(timeLeft / (60 * 60 * 1000));
            const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.warning)
                        .setDescription(`You've already claimed your daily reward!\nCome back in **${hours}h ${minutes}m**`)
                ],
                ephemeral: true
            });
        }

        const baseReward = economy.dailyAmount;
        const bonusReward = Math.floor(Math.random() * 100);
        const totalReward = baseReward + bonusReward;

        const newBalance = userData.balance + totalReward;
        updateEconomyBalance.run(newBalance, interaction.user.id, interaction.guild.id);
        updateEconomyDaily.run(now, interaction.user.id, interaction.guild.id);

        const embed = new EmbedBuilder()
            .setColor(colors.success)
            .setTitle('🎁 Daily Reward Claimed!')
            .setDescription(`You received **${totalReward.toLocaleString()}** coins!`)
            .addFields(
                { name: 'Base Reward', value: `${baseReward} coins`, inline: true },
                { name: 'Bonus', value: `${bonusReward} coins`, inline: true },
                { name: 'New Balance', value: `${newBalance.toLocaleString()} coins`, inline: true }
            )
            .setFooter({ text: 'Come back tomorrow for more!' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
