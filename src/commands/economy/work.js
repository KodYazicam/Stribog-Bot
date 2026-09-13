const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { colors } = require('../../config/config');
const { ensureEconomy, updateEconomyBalance, updateEconomyWork } = require('../../utils/database');
const { economy } = require('../../config/config');

const jobs = [
    { name: 'Developer', emoji: '💻', min: 50, max: 150 },
    { name: 'Designer', emoji: '🎨', min: 40, max: 120 },
    { name: 'Chef', emoji: '👨‍🍳', min: 30, max: 100 },
    { name: 'Doctor', emoji: '👨‍⚕️', min: 80, max: 200 },
    { name: 'Teacher', emoji: '👨‍🏫', min: 35, max: 90 },
    { name: 'Mechanic', emoji: '🔧', min: 40, max: 110 },
    { name: 'Pilot', emoji: '✈️', min: 70, max: 180 },
    { name: 'Artist', emoji: '🖼️', min: 25, max: 130 },
    { name: 'Streamer', emoji: '🎮', min: 20, max: 200 },
    { name: 'Musician', emoji: '🎸', min: 30, max: 150 }
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('work')
        .setDescription('Work to earn some coins'),
    
    cooldown: 5,
    
    async execute(interaction) {
        if (!interaction.guild) {
            return interaction.reply({ content: 'Economy is per-server. Use this in a guild.', ephemeral: true });
        }
        const userData = ensureEconomy(interaction.user.id, interaction.guild.id);

        const now = Date.now();
        const lastWork = userData.work_cooldown || 0;
        const cooldown = economy.workCooldown;

        if (now - lastWork < cooldown) {
            const timeLeft = cooldown - (now - lastWork);
            const minutes = Math.floor(timeLeft / (60 * 1000));
            const seconds = Math.floor((timeLeft % (60 * 1000)) / 1000);

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.warning)
                        .setDescription(`You're tired! Rest for **${minutes}m ${seconds}s** before working again.`)
                ],
                ephemeral: true
            });
        }

        const job = jobs[Math.floor(Math.random() * jobs.length)];
        const earnings = Math.floor(Math.random() * (job.max - job.min + 1)) + job.min;

        const newBalance = userData.balance + earnings;
        updateEconomyBalance.run(newBalance, interaction.user.id, interaction.guild.id);
        updateEconomyWork.run(now, interaction.user.id, interaction.guild.id);

        const embed = new EmbedBuilder()
            .setColor(colors.success)
            .setTitle(`${job.emoji} Work Complete!`)
            .setDescription(`You worked as a **${job.name}** and earned **${earnings.toLocaleString()}** coins!`)
            .addFields({ name: 'New Balance', value: `${newBalance.toLocaleString()} coins`, inline: true })
            .setFooter({ text: 'You can work again in 30 minutes' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
