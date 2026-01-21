const { Events, EmbedBuilder, AuditLogEvent } = require('discord.js');
const { colors } = require('../config/config');
const { getGuild } = require('../utils/database');

module.exports = {
    name: Events.MessageDelete,
    async execute(message, client) {
        if (!message.guild || message.author?.bot) return;

        const guildData = getGuild.get(message.guild.id);
        if (!guildData?.log_channel) return;

        const logChannel = await message.guild.channels.fetch(guildData.log_channel).catch(() => null);
        if (!logChannel) return;

        let executor = null;
        try {
            const auditLogs = await message.guild.fetchAuditLogs({
                type: AuditLogEvent.MessageDelete,
                limit: 1
            });
            const log = auditLogs.entries.first();
            if (log && log.target.id === message.author?.id && Date.now() - log.createdTimestamp < 5000) {
                executor = log.executor;
            }
        } catch {}

        const embed = new EmbedBuilder()
            .setColor(colors.danger)
            .setTitle('Message Deleted')
            .addFields(
                { name: 'Author', value: message.author ? `${message.author.tag} (${message.author.id})` : 'Unknown', inline: true },
                { name: 'Channel', value: `${message.channel} (${message.channel.id})`, inline: true }
            )
            .setTimestamp();

        if (executor) {
            embed.addFields({ name: 'Deleted By', value: `${executor.tag} (${executor.id})`, inline: true });
        }

        if (message.content) {
            const content = message.content.length > 1024 ? message.content.slice(0, 1021) + '...' : message.content;
            embed.addFields({ name: 'Content', value: content, inline: false });
        }

        if (message.attachments.size > 0) {
            const attachments = message.attachments.map(a => a.url).join('\n');
            embed.addFields({ name: 'Attachments', value: attachments.slice(0, 1024), inline: false });
        }

        if (message.author) {
            embed.setThumbnail(message.author.displayAvatarURL({ dynamic: true }));
        }

        await logChannel.send({ embeds: [embed] }).catch(() => {});
    }
};
