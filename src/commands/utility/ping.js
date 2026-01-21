const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { colors } = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check bot latency'),
    
    cooldown: 5,
    
    async execute(interaction, client) {
        const sent = await interaction.deferReply({ fetchReply: true });
        const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
        const wsLatency = client.ws.ping;

        let status;
        let color;

        if (wsLatency < 100) {
            status = 'Excellent';
            color = colors.success;
        } else if (wsLatency < 200) {
            status = 'Good';
            color = colors.primary;
        } else if (wsLatency < 400) {
            status = 'Moderate';
            color = colors.warning;
        } else {
            status = 'Poor';
            color = colors.danger;
        }

        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle('🏓 Pong!')
            .addFields(
                { name: 'Bot Latency', value: `${roundtrip}ms`, inline: true },
                { name: 'API Latency', value: `${wsLatency}ms`, inline: true },
                { name: 'Status', value: status, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }
};
