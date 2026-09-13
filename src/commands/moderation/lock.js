const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { colors } = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lock')
        .setDescription('Lock a channel')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel to lock')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for locking')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    
    cooldown: 5,
    
    async execute(interaction) {
        const channel = interaction.options.getChannel('channel') || interaction.channel;
        const reason = interaction.options.getString('reason') || 'No reason provided';

        try {
            await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                SendMessages: false
            });

            const embed = new EmbedBuilder()
                .setColor(colors.warning)
                .setTitle('🔒 Channel Locked')
                .setDescription(`${channel} has been locked.`)
                .addFields(
                    { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
                    { name: 'Reason', value: reason, inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
            const { sendModLog } = require('../../utils/modlog');
            await sendModLog(interaction.guild, {
                title: 'Channel Locked',
                moderator: interaction.user,
                fields: [
                    { name: 'Channel', value: `${channel}`, inline: true },
                    { name: 'Reason', value: reason }
                ]
            });

            if (channel.id !== interaction.channel.id) {
                await channel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.warning)
                            .setTitle('🔒 Channel Locked')
                            .setDescription('This channel has been locked by a moderator.')
                            .addFields({ name: 'Reason', value: reason })
                            .setTimestamp()
                    ]
                });
            }
        } catch (error) {
            console.error('Lock error:', error);
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.danger)
                        .setDescription('Failed to lock the channel.')
                ],
                ephemeral: true
            });
        }
    }
};
