const { Events, EmbedBuilder, AuditLogEvent } = require('discord.js');
const { colors } = require('../config/config');
const { getGuild } = require('../utils/database');

function baseEmbed(member) {
    return new EmbedBuilder()
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setTimestamp();
}

function memberField(member) {
    return { name: 'Member', value: `${member.user.tag} (${member.id})`, inline: true };
}

function timeoutTimestamp(value) {
    return value?.getTime?.() ?? null;
}

async function roleExecutor(guild, member) {
    try {
        const auditLogs = await guild.fetchAuditLogs({
            type: AuditLogEvent.MemberRoleUpdate,
            limit: 1
        });
        const log = auditLogs.entries.first();
        if (log && log.target.id === member.id && Date.now() - log.createdTimestamp < 5000) {
            return log.executor;
        }
    } catch {}
    return null;
}

module.exports = {
    name: Events.GuildMemberUpdate,
    async execute(oldMember, newMember, client) {
        const guildData = getGuild.get(newMember.guild.id);
        if (!guildData?.log_channel) return;

        const logChannel = await newMember.guild.channels.fetch(guildData.log_channel).catch(() => null);
        if (!logChannel) return;

        if (oldMember.nickname !== newMember.nickname) {
            const embed = baseEmbed(newMember)
                .setColor(colors.info)
                .setTitle('Nickname Changed')
                .addFields(
                    memberField(newMember),
                    { name: 'Before', value: oldMember.nickname || 'None', inline: true },
                    { name: 'After', value: newMember.nickname || 'None', inline: true }
                );

            await logChannel.send({ embeds: [embed] }).catch(() => {});
        }

        const oldRoles = oldMember.roles.cache;
        const newRoles = newMember.roles.cache;

        const addedRoles = newRoles.filter(role => !oldRoles.has(role.id));
        const removedRoles = oldRoles.filter(role => !newRoles.has(role.id));

        if (addedRoles.size > 0) {
            const executor = await roleExecutor(newMember.guild, newMember);
            const embed = baseEmbed(newMember)
                .setColor(colors.success)
                .setTitle('Role Added')
                .addFields(
                    memberField(newMember),
                    { name: 'Role', value: addedRoles.map(role => role.toString()).join(', '), inline: true }
                );

            if (executor) {
                embed.addFields({ name: 'Added By', value: `${executor.tag} (${executor.id})`, inline: true });
            }

            await logChannel.send({ embeds: [embed] }).catch(() => {});
        }

        if (removedRoles.size > 0) {
            const executor = await roleExecutor(newMember.guild, newMember);
            const embed = baseEmbed(newMember)
                .setColor(colors.danger)
                .setTitle('Role Removed')
                .addFields(
                    memberField(newMember),
                    { name: 'Role', value: removedRoles.map(role => role.toString()).join(', '), inline: true }
                );

            if (executor) {
                embed.addFields({ name: 'Removed By', value: `${executor.tag} (${executor.id})`, inline: true });
            }

            await logChannel.send({ embeds: [embed] }).catch(() => {});
        }

        if (timeoutTimestamp(oldMember.communicationDisabledUntil) !== timeoutTimestamp(newMember.communicationDisabledUntil)) {
            if (newMember.communicationDisabledUntil) {
                const embed = baseEmbed(newMember)
                    .setColor(colors.warning)
                    .setTitle('Member Timed Out')
                    .addFields(
                        memberField(newMember),
                        {
                            name: 'Until',
                            value: `<t:${Math.floor(newMember.communicationDisabledUntil.getTime() / 1000)}:F>`,
                            inline: true
                        }
                    );

                await logChannel.send({ embeds: [embed] }).catch(() => {});
            } else {
                const embed = baseEmbed(newMember)
                    .setColor(colors.success)
                    .setTitle('Timeout Removed')
                    .addFields(memberField(newMember));

                await logChannel.send({ embeds: [embed] }).catch(() => {});
            }
        }
    }
};
