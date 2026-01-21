const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField } = require('discord.js');
const { colors } = require('../config/config');
const { getGuild, getUserTickets, insertTicket, closeTicket, getTicket } = require('../utils/database');

module.exports = {
    async execute(interaction, client, args) {
        const action = args[0] || interaction.customId.split('_')[1];

        if (action === 'create' || interaction.customId === 'ticket_create') {
            const guildData = getGuild.get(interaction.guild.id);

            if (!guildData?.ticket_category) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.danger)
                            .setDescription('Ticket system is not configured.')
                    ],
                    ephemeral: true
                });
            }

            const existingTickets = getUserTickets.all(interaction.guild.id, interaction.user.id);
            if (existingTickets.length >= 3) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.warning)
                            .setDescription('You already have 3 open tickets. Please close one before creating a new one.')
                    ],
                    ephemeral: true
                });
            }

            const ticketNumber = Date.now().toString(36);
            const channel = await interaction.guild.channels.create({
                name: `ticket-${interaction.user.username}-${ticketNumber}`,
                type: ChannelType.GuildText,
                parent: guildData.ticket_category,
                permissionOverwrites: [
                    {
                        id: interaction.guild.id,
                        deny: [PermissionsBitField.Flags.ViewChannel]
                    },
                    {
                        id: interaction.user.id,
                        allow: [
                            PermissionsBitField.Flags.ViewChannel,
                            PermissionsBitField.Flags.SendMessages,
                            PermissionsBitField.Flags.ReadMessageHistory
                        ]
                    },
                    {
                        id: client.user.id,
                        allow: [
                            PermissionsBitField.Flags.ViewChannel,
                            PermissionsBitField.Flags.SendMessages,
                            PermissionsBitField.Flags.ManageChannels
                        ]
                    }
                ]
            });

            insertTicket.run(channel.id, interaction.guild.id, interaction.user.id, Date.now());

            const embed = new EmbedBuilder()
                .setColor(colors.success)
                .setTitle('🎫 Ticket Created')
                .setDescription(`Welcome ${interaction.user}!\n\nPlease describe your issue and our team will assist you shortly.`)
                .addFields(
                    { name: 'Ticket Owner', value: `${interaction.user}`, inline: true },
                    { name: 'Created At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                )
                .setFooter({ text: 'Use the buttons below to manage this ticket' });

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('ticket_close')
                        .setLabel('Close Ticket')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('🔒'),
                    new ButtonBuilder()
                        .setCustomId('ticket_claim')
                        .setLabel('Claim')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('✋')
                );

            await channel.send({ content: `${interaction.user}`, embeds: [embed], components: [row] });

            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.success)
                        .setDescription(`Your ticket has been created: ${channel}`)
                ],
                ephemeral: true
            });

            if (guildData.ticket_log_channel) {
                const logChannel = await interaction.guild.channels.fetch(guildData.ticket_log_channel).catch(() => null);
                if (logChannel) {
                    await logChannel.send({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(colors.info)
                                .setTitle('Ticket Created')
                                .addFields(
                                    { name: 'User', value: `${interaction.user} (${interaction.user.id})`, inline: true },
                                    { name: 'Channel', value: `${channel}`, inline: true }
                                )
                                .setTimestamp()
                        ]
                    });
                }
            }

        } else if (action === 'close' || interaction.customId === 'ticket_close') {
            const ticket = getTicket.get(interaction.channel.id);

            if (!ticket) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.danger)
                            .setDescription('This is not a ticket channel.')
                    ],
                    ephemeral: true
                });
            }

            const embed = new EmbedBuilder()
                .setColor(colors.warning)
                .setTitle('Close Ticket')
                .setDescription('Are you sure you want to close this ticket?\n\nThis channel will be deleted in 5 seconds after confirmation.');

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('ticket_confirm_close')
                        .setLabel('Confirm Close')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('ticket_cancel_close')
                        .setLabel('Cancel')
                        .setStyle(ButtonStyle.Secondary)
                );

            await interaction.reply({ embeds: [embed], components: [row] });

        } else if (action === 'confirm' || interaction.customId === 'ticket_confirm_close') {
            const ticket = getTicket.get(interaction.channel.id);
            const guildData = getGuild.get(interaction.guild.id);

            closeTicket.run(interaction.channel.id);

            await interaction.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.danger)
                        .setDescription('Ticket will be deleted in 5 seconds...')
                ],
                components: []
            });

            if (guildData?.ticket_log_channel) {
                const logChannel = await interaction.guild.channels.fetch(guildData.ticket_log_channel).catch(() => null);
                if (logChannel) {
                    const ticketUser = await client.users.fetch(ticket.user_id).catch(() => null);
                    await logChannel.send({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(colors.danger)
                                .setTitle('Ticket Closed')
                                .addFields(
                                    { name: 'Ticket Owner', value: ticketUser ? `${ticketUser.tag} (${ticketUser.id})` : ticket.user_id, inline: true },
                                    { name: 'Closed By', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
                                    { name: 'Duration', value: formatDuration(Date.now() - ticket.created_at), inline: true }
                                )
                                .setTimestamp()
                        ]
                    });
                }
            }

            setTimeout(async () => {
                await interaction.channel.delete().catch(() => {});
            }, 5000);

        } else if (action === 'cancel' || interaction.customId === 'ticket_cancel_close') {
            await interaction.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.info)
                        .setDescription('Ticket close cancelled.')
                ],
                components: []
            });

        } else if (action === 'claim' || interaction.customId === 'ticket_claim') {
            const ticket = getTicket.get(interaction.channel.id);

            if (!ticket) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.danger)
                            .setDescription('This is not a ticket channel.')
                    ],
                    ephemeral: true
                });
            }

            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.success)
                        .setDescription(`This ticket has been claimed by ${interaction.user}`)
                ]
            });
        }
    }
};

function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}
