const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { colors } = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Get information about a user')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user to get information about')
                .setRequired(false)),
    
    cooldown: 5,
    
    async execute(interaction) {
        const target = interaction.options.getUser('target') || interaction.user;
        const member = await interaction.guild.members.fetch(target.id).catch(() => null);

        const badges = {
            Staff: '<:staff:1234567890>',
            Partner: '<:partner:1234567890>',
            Hypesquad: '<:hypesquad:1234567890>',
            BugHunterLevel1: '🐛',
            BugHunterLevel2: '🐛',
            HypeSquadOnlineHouse1: '🏠',
            HypeSquadOnlineHouse2: '🏠',
            HypeSquadOnlineHouse3: '🏠',
            PremiumEarlySupporter: '👑',
            VerifiedDeveloper: '👨‍💻',
            CertifiedModerator: '🛡️',
            ActiveDeveloper: '💻'
        };

        const userFlags = target.flags?.toArray() || [];
        const badgeList = userFlags.map(flag => badges[flag] || flag).join(' ') || 'None';

        const embed = new EmbedBuilder()
            .setColor(member?.displayHexColor || colors.primary)
            .setTitle(`${target.tag}`)
            .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 512 }))
            .addFields(
                { name: 'ID', value: target.id, inline: true },
                { name: 'Bot', value: target.bot ? 'Yes' : 'No', inline: true },
                { name: 'Badges', value: badgeList, inline: true },
                { name: 'Account Created', value: `<t:${Math.floor(target.createdTimestamp / 1000)}:F>\n(<t:${Math.floor(target.createdTimestamp / 1000)}:R>)`, inline: true }
            )
            .setTimestamp();

        if (member) {
            const roles = member.roles.cache
                .filter(role => role.id !== interaction.guild.id)
                .sort((a, b) => b.position - a.position)
                .map(role => role.toString());

            const displayRoles = roles.length > 10 
                ? [...roles.slice(0, 10), `+${roles.length - 10} more`].join(', ')
                : roles.join(', ') || 'None';

            embed.addFields(
                { name: 'Joined Server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>\n(<t:${Math.floor(member.joinedTimestamp / 1000)}:R>)`, inline: true },
                { name: 'Nickname', value: member.nickname || 'None', inline: true },
                { name: `Roles [${roles.length}]`, value: displayRoles }
            );

            if (member.premiumSince) {
                embed.addFields({
                    name: 'Boosting Since',
                    value: `<t:${Math.floor(member.premiumSinceTimestamp / 1000)}:F>`,
                    inline: true
                });
            }
        }

        await interaction.reply({ embeds: [embed] });
    }
};
