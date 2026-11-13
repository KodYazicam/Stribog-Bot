const { EmbedBuilder } = require('discord.js');
const { colors } = require('../config/config');
const { getGuild } = require('./database');

async function sendModLog(guild, { title, description, fields = [], color = colors.danger, moderator, target, channelId }) {
    const guildData = getGuild.get(guild.id);
    const targetChannelId = channelId ?? guildData?.mod_log_channel;
    if (!targetChannelId) return;
    const channel = await guild.channels.fetch(targetChannelId).catch(() => null);
    if (!channel) return;
    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(description || null)
        .setTimestamp();
    if (moderator) embed.addFields({ name: 'Moderator', value: `${moderator.tag} (${moderator.id})`, inline: true });
    if (target) embed.addFields({ name: 'Target', value: `${target.tag || target.id} (${target.id})`, inline: true });
    for (const field of fields) embed.addFields(field);
    await channel.send({ embeds: [embed] }).catch(() => {});
}

module.exports = { sendModLog };
