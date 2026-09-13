const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField } = require('discord.js');
const { colors } = require('../../config/config');
const { getGuild, insertGuild, updateGuildSetting, getTicket, getUserTickets, insertTicket, closeTicket } = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Manage tickets')
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Setup the ticket system')
                .addChannelOption(option =>
                    option.setName('category')
                        .setDescription('Category for tickets')
                        .addChannelTypes(ChannelType.GuildCategory)
                        .setRequired(true))
                .addChannelOption(option =>
                    option.setName('log_channel')
                        .setDescription('Channel for ticket logs')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(false))
                .addRoleOption(option =>
                    option.setName('support_role')
                        .setDescription('Staff role that can see tickets')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('panel')
                .setDescription('Send a ticket panel'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('close')
                .setDescription('Close the current ticket'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a user to the ticket')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to add')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a user from the ticket')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to remove')
                        .setRequired(true)))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    
    cooldown: 5,
    
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        insertGuild.run(interaction.guild.id);

        if (subcommand === 'setup') {
            const category = interaction.options.getChannel('category');
            const logChannel = interaction.options.getChannel('log_channel');
            const supportRole = interaction.options.getRole('support_role');

            updateGuildSetting('ticket_category').run(category.id, interaction.guild.id);
            
            if (logChannel) {
                updateGuildSetting('ticket_log_channel').run(logChannel.id, interaction.guild.id);
            }
            if (supportRole) {
                updateGuildSetting('support_role').run(supportRole.id, interaction.guild.id);
            }

            const embed = new EmbedBuilder()
                .setColor(colors.success)
                .setTitle('Ticket System Setup')
                .addFields(
                    { name: 'Category', value: `${category}`, inline: true },
                    { name: 'Log Channel', value: logChannel ? `${logChannel}` : 'Not set', inline: true },
                    { name: 'Support Role', value: supportRole ? `${supportRole}` : 'Not set', inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } else if (subcommand === 'panel') {
            const guildData = getGuild.get(interaction.guild.id);

            if (!guildData?.ticket_category) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.danger)
                            .setDescription('Please setup the ticket system first using `/ticket setup`')
                    ],
                    ephemeral: true
                });
            }

            const embed = new EmbedBuilder()
                .setColor(colors.primary)
                .setTitle('🎫 Support Tickets')
                .setDescription('Click the button below to create a support ticket.\n\nOur team will assist you as soon as possible.')
                .setFooter({ text: 'Please be patient after creating a ticket' });

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('ticket_create')
                        .setLabel('Create Ticket')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🎫')
                );

            await interaction.channel.send({ embeds: [embed], components: [row] });

            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.success)
                        .setDescription('Ticket panel sent!')
                ],
                ephemeral: true
            });

        } else if (subcommand === 'close') {
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
                .setDescription('Are you sure you want to close this ticket?');

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('ticket_confirm_close')
                        .setLabel('Close')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('ticket_cancel_close')
                        .setLabel('Cancel')
                        .setStyle(ButtonStyle.Secondary)
                );

            await interaction.reply({ embeds: [embed], components: [row] });

        } else if (subcommand === 'add') {
            const user = interaction.options.getUser('user');
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

            await interaction.channel.permissionOverwrites.edit(user.id, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true
            });

            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.success)
                        .setDescription(`${user} has been added to this ticket.`)
                ]
            });

        } else if (subcommand === 'remove') {
            const user = interaction.options.getUser('user');
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

            if (user.id === ticket.user_id) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.danger)
                            .setDescription('You cannot remove the ticket creator.')
                    ],
                    ephemeral: true
                });
            }

            await interaction.channel.permissionOverwrites.delete(user.id);

            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.success)
                        .setDescription(`${user} has been removed from this ticket.`)
                ]
            });
        }
    }
};
