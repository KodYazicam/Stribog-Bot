const { Events, EmbedBuilder, AuditLogEvent } = require('discord.js');
const { colors } = require('../config/config');
const { getGuild } = require('../utils/database');

module.exports = {
    name: Events.GuildMemberUpdate,
    async execute(oldMember, newMember, client) {
        const guildData = getGuild.get(newMember.guild.id);
        if (!guildData?.log_channel) return;

        const logChannel = await newMember.guild.channels.fetch(guildData.log_channel).catch(() => null);
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }))
            .setTimestamp();

        if (oldMember.nickname !== newMember.nickname) {
            embed
                .setColor(colors.info)
                .setTitle('Nickname Changed')
                .addFields(
                    { name: 'Member', value: `${newMember.user.tag} (${newMember.id})`, inline: false },
                    { name: 'Before', value: oldMember.nickname || 'None', inline: true },
                    { name: 'After', value: newMember.nickname || 'None', inline: true }
                );

            await logChannel.send({ embeds: [embed] }).catch(() => {});
            return;
        }

        const oldRoles = oldMember.roles.cache;
        const newRoles = newMember.roles.cache;

        const addedRoles = newRoles.filter(role => !oldRoles.has(role.id));
        const removedRoles = oldRoles.filter(role => !newRoles.has(role.id));

        if (addedRoles.size > 0) {
            let executor = null;
            try {
                const auditLogs = await newMember.guild.fetchAuditLogs({
                    type: AuditLogEvent.MemberRoleUpdate,
                    limit: 1
                });
                const log = auditLogs.entries.first();
                if (log && log.target.id === newMember.id && Date.now() - log.createdTimestamp < 5000) {
                    executor = log.executor;
                }
            } catch {}

            embed
                .setColor(colors.success)
                .setTitle('Role Added')
                .addFields(
                    { name: 'Member', value: `${newMember.user.tag} (${newMember.id})`, inline: true },
                    { name: 'Role', value: addedRoles.map(r => r.toString()).join(', '), inline: true }
                );

            if (executor) {
                embed.addFields({ name: 'Added By', value: `${executor.tag} (${executor.id})`, inline: true });
            }

            await logChannel.send({ embeds: [embed] }).catch(() => {});
        }

        if (removedRoles.size > 0) {
            let executor = null;
            try {
                const auditLogs = await newMember.guild.fetchAuditLogs({
                    type: AuditLogEvent.MemberRoleUpdate,
                    limit: 1
                });
                const log = auditLogs.entries.first();
                if (log && log.target.id === newMember.id && Date.now() - log.createdTimestamp < 5000) {
                    executor = log.executor;
                }
            } catch {}

            embed
                .setColor(colors.danger)
                .setTitle('Role Removed')
                .addFields(
                    { name: 'Member', value: `${newMember.user.tag} (${newMember.id})`, inline: true },
                    { name: 'Role', value: removedRoles.map(r => r.toString()).join(', '), inline: true }
                );

            if (executor) {
                embed.addFields({ name: 'Removed By', value: `${executor.tag} (${executor.id})`, inline: true });
            }

            await logChannel.send({ embeds: [embed] }).catch(() => {});
        }

        if (oldMember.communicationDisabledUntil !== newMember.communicationDisabledUntil) {
            if (newMember.communicationDisabledUntil) {
                embed
                    .setColor(colors.warning)
                    .setTitle('Member Timed Out')
                    .addFields(
                        { name: 'Member', value: `${newMember.user.tag} (${newMember.id})`, inline: true },
                        { name: 'Until', value: `<t:${Math.floor(newMember.communicationDisabledUntil.getTime() / 1000)}:F>`, inline: true }
                    );
            } else {
                embed
                    .setColor(colors.success)
                    .setTitle('Timeout Removed')
                    .addFields(
                        { name: 'Member', value: `${newMember.user.tag} (${newMember.id})`, inline: true }
                    );
            }

            await logChannel.send({ embeds: [embed] }).catch(() => {});
        }
    }
};
