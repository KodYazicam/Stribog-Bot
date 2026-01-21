const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { colors } = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('Unlock a channel')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel to unlock')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    
    cooldown: 5,
    
    async execute(interaction) {
        const channel = interaction.options.getChannel('channel') || interaction.channel;

        try {
            await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                SendMessages: null
            });

            const embed = new EmbedBuilder()
                .setColor(colors.success)
                .setTitle('🔓 Channel Unlocked')
                .setDescription(`${channel} has been unlocked.`)
                .addFields({ name: 'Moderator', value: `${interaction.user.tag}`, inline: true })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            if (channel.id !== interaction.channel.id) {
                await channel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.success)
                            .setTitle('🔓 Channel Unlocked')
                            .setDescription('This channel has been unlocked.')
                            .setTimestamp()
                    ]
                });
            }
        } catch (error) {
            console.error('Unlock error:', error);
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.danger)
                        .setDescription('Failed to unlock the channel.')
                ],
                ephemeral: true
            });
        }
    }
};
