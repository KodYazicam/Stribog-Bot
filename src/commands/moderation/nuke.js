const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { colors } = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nuke')
        .setDescription('Delete all messages in a channel by cloning it')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    cooldown: 30,
    
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor(colors.danger)
            .setTitle('⚠️ Channel Nuke Confirmation')
            .setDescription('This will delete **ALL** messages in this channel by cloning it.\n\nAre you sure you want to continue?')
            .setFooter({ text: 'This action cannot be undone!' });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('nuke_confirm')
                    .setLabel('Confirm')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('💥'),
                new ButtonBuilder()
                    .setCustomId('nuke_cancel')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary)
            );

        const response = await interaction.reply({
            embeds: [embed],
            components: [row],
            fetchReply: true
        });

        const collector = response.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 30000,
            max: 1
        });

        collector.on('collect', async i => {
            if (i.customId === 'nuke_confirm') {
                try {
                    const channel = interaction.channel;
                    const position = channel.position;
                    const newChannel = await channel.clone({
                        reason: `Channel nuked by ${interaction.user.tag}`
                    });

                    await newChannel.setPosition(position);
                    await channel.delete(`Nuked by ${interaction.user.tag}`);

                    const nukedEmbed = new EmbedBuilder()
                        .setColor(colors.success)
                        .setTitle('💥 Channel Nuked')
                        .setDescription('This channel has been nuked.')
                        .addFields({ name: 'Moderator', value: `${interaction.user.tag}` })
                        .setImage('https://media.giphy.com/media/HhTXt43pk1I1W/giphy.gif')
                        .setTimestamp();

                    await newChannel.send({ embeds: [nukedEmbed] });
                    const { sendModLog } = require('../../utils/modlog');
                    await sendModLog(interaction.guild, {
                        title: 'Channel Nuked',
                        moderator: interaction.user,
                        fields: [
                            { name: 'Old Channel', value: `#${channel.name}`, inline: true },
                            { name: 'New Channel', value: `${newChannel}`, inline: true }
                        ]
                    });
                } catch (error) {
                    console.error('Nuke error:', error);
                }
            } else {
                await i.update({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.info)
                            .setDescription('Nuke cancelled.')
                    ],
                    components: []
                });
            }
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.warning)
                            .setDescription('Nuke confirmation timed out.')
                    ],
                    components: []
                }).catch(() => {});
            }
        });
    }
};
