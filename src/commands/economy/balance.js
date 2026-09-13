const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { colors } = require('../../config/config');
const { ensureEconomy } = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Check your or another user\'s balance')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to check')
                .setRequired(false)),
    
    cooldown: 3,
    
    async execute(interaction) {
        const target = interaction.options.getUser('user') || interaction.user;
        
        if (!interaction.guild) {
            return interaction.reply({ content: 'Economy is per-server. Use this in a guild.', ephemeral: true });
        }
        const userData = ensureEconomy(target.id, interaction.guild.id);

        const total = userData.balance + userData.bank;

        const embed = new EmbedBuilder()
            .setColor(colors.primary)
            .setTitle(`💰 ${target.username}'s Balance`)
            .setThumbnail(target.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '💵 Wallet', value: `${userData.balance.toLocaleString()} coins`, inline: true },
                { name: '🏦 Bank', value: `${userData.bank.toLocaleString()} coins`, inline: true },
                { name: '💎 Total', value: `${total.toLocaleString()} coins`, inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
