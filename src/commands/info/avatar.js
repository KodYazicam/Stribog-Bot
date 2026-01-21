const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { colors } = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Get the avatar of a user')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user to get avatar from')
                .setRequired(false)),
    
    cooldown: 3,
    
    async execute(interaction) {
        const target = interaction.options.getUser('target') || interaction.user;
        const member = await interaction.guild.members.fetch(target.id).catch(() => null);

        const globalAvatar = target.displayAvatarURL({ dynamic: true, size: 4096 });
        const serverAvatar = member?.displayAvatarURL({ dynamic: true, size: 4096 });

        const embed = new EmbedBuilder()
            .setColor(colors.primary)
            .setTitle(`${target.tag}'s Avatar`)
            .setImage(globalAvatar)
            .setTimestamp();

        const row = new ActionRowBuilder();

        row.addComponents(
            new ButtonBuilder()
                .setLabel('PNG')
                .setStyle(ButtonStyle.Link)
                .setURL(target.displayAvatarURL({ extension: 'png', size: 4096 })),
            new ButtonBuilder()
                .setLabel('JPG')
                .setStyle(ButtonStyle.Link)
                .setURL(target.displayAvatarURL({ extension: 'jpg', size: 4096 })),
            new ButtonBuilder()
                .setLabel('WEBP')
                .setStyle(ButtonStyle.Link)
                .setURL(target.displayAvatarURL({ extension: 'webp', size: 4096 }))
        );

        if (target.avatar?.startsWith('a_')) {
            row.addComponents(
                new ButtonBuilder()
                    .setLabel('GIF')
                    .setStyle(ButtonStyle.Link)
                    .setURL(target.displayAvatarURL({ extension: 'gif', size: 4096 }))
            );
        }

        const response = { embeds: [embed], components: [row] };

        if (serverAvatar && serverAvatar !== globalAvatar) {
            const serverEmbed = new EmbedBuilder()
                .setColor(colors.primary)
                .setTitle(`${target.tag}'s Server Avatar`)
                .setImage(serverAvatar)
                .setTimestamp();

            const serverRow = new ActionRowBuilder();
            serverRow.addComponents(
                new ButtonBuilder()
                    .setLabel('Server PNG')
                    .setStyle(ButtonStyle.Link)
                    .setURL(member.displayAvatarURL({ extension: 'png', size: 4096 })),
                new ButtonBuilder()
                    .setLabel('Server JPG')
                    .setStyle(ButtonStyle.Link)
                    .setURL(member.displayAvatarURL({ extension: 'jpg', size: 4096 }))
            );

            response.embeds.push(serverEmbed);
            response.components.push(serverRow);
        }

        await interaction.reply(response);
    }
};
