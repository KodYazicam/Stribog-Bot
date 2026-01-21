const { Events, EmbedBuilder, AuditLogEvent } = require('discord.js');
const { colors } = require('../config/config');
const { getGuild } = require('../utils/database');

module.exports = {
    name: Events.GuildMemberRemove,
    async execute(member, client) {
        const guildData = getGuild.get(member.guild.id);

        if (guildData?.goodbye_channel) {
            const goodbyeChannel = await member.guild.channels.fetch(guildData.goodbye_channel).catch(() => null);
            if (goodbyeChannel) {
                let message = guildData.goodbye_message || 'Goodbye {user}! We hope to see you again.';
                message = message
                    .replace(/{user}/g, member.user.username)
                    .replace(/{server}/g, member.guild.name)
                    .replace(/{memberCount}/g, member.guild.memberCount);

                await goodbyeChannel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.danger)
                            .setDescription(message)
                            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                            .setTimestamp()
                    ]
                }).catch(() => {});
            }
        }

        if (!guildData?.log_channel) return;

        const logChannel = await member.guild.channels.fetch(guildData.log_channel).catch(() => null);
        if (!logChannel) return;

        let action = 'Left';
        let executor = null;
        let reason = null;

        try {
            const kickLogs = await member.guild.fetchAuditLogs({
                type: AuditLogEvent.MemberKick,
                limit: 1
            });
            const kickLog = kickLogs.entries.first();
            if (kickLog && kickLog.target.id === member.id && Date.now() - kickLog.createdTimestamp < 5000) {
                action = 'Kicked';
                executor = kickLog.executor;
                reason = kickLog.reason;
            }
        } catch {}

        if (action === 'Left') {
            try {
                const banLogs = await member.guild.fetchAuditLogs({
                    type: AuditLogEvent.MemberBanAdd,
                    limit: 1
                });
                const banLog = banLogs.entries.first();
                if (banLog && banLog.target.id === member.id && Date.now() - banLog.createdTimestamp < 5000) {
                    action = 'Banned';
                    executor = banLog.executor;
                    reason = banLog.reason;
                }
            } catch {}
        }

        const embed = new EmbedBuilder()
            .setColor(action === 'Left' ? colors.warning : colors.danger)
            .setTitle(`Member ${action}`)
            .addFields(
                { name: 'User', value: `${member.user.tag} (${member.id})`, inline: true },
                { name: 'Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true }
            )
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .setTimestamp();

        if (member.joinedTimestamp) {
            embed.addFields({
                name: 'Joined Server',
                value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`,
                inline: true
            });
        }

        if (member.roles.cache.size > 1) {
            const roles = member.roles.cache
                .filter(r => r.id !== member.guild.id)
                .map(r => r.toString())
                .join(', ');
            if (roles) {
                embed.addFields({
                    name: 'Roles',
                    value: roles.length > 1024 ? roles.slice(0, 1021) + '...' : roles,
                    inline: false
                });
            }
        }

        if (executor) {
            embed.addFields({
                name: action === 'Kicked' ? 'Kicked By' : 'Banned By',
                value: `${executor.tag} (${executor.id})`,
                inline: true
            });
        }

        if (reason) {
            embed.addFields({ name: 'Reason', value: reason, inline: false });
        }

        await logChannel.send({ embeds: [embed] }).catch(() => {});
    }
};
