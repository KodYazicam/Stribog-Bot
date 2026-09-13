const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, OAuth2Scopes, PermissionFlagsBits } = require('discord.js');
const { colors } = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invite')
        .setDescription('Get bot invite link'),
    
    cooldown: 5,
    
    async execute(interaction, client) {
        const inviteLink = client.generateInvite({
            scopes: [OAuth2Scopes.Bot, OAuth2Scopes.ApplicationsCommands],
            permissions: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.EmbedLinks,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.UseExternalEmojis,
                PermissionFlagsBits.AddReactions,
                PermissionFlagsBits.ManageMessages,
                PermissionFlagsBits.ModerateMembers,
                PermissionFlagsBits.KickMembers,
                PermissionFlagsBits.BanMembers,
                PermissionFlagsBits.ManageChannels,
                PermissionFlagsBits.ManageRoles
            ]
        });

        const embed = new EmbedBuilder()
            .setColor(colors.primary)
            .setTitle('Invite Me!')
            .setDescription('Click the button below to add me to your server. The invite asks for moderation permissions, not Administrator.')
            .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Invite Bot')
                    .setStyle(ButtonStyle.Link)
                    .setURL(inviteLink)
                    .setEmoji('🔗')
            );

        await interaction.reply({ embeds: [embed], components: [row] });
    }
};
