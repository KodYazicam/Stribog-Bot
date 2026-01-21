const { Events, EmbedBuilder } = require('discord.js');
const { colors } = require('../config/config');
const { getGuild } = require('../utils/database');

module.exports = {
    name: Events.MessageUpdate,
    async execute(oldMessage, newMessage, client) {
        if (!newMessage.guild || newMessage.author?.bot) return;
        if (oldMessage.content === newMessage.content) return;

        const guildData = getGuild.get(newMessage.guild.id);
        if (!guildData?.log_channel) return;

        const logChannel = await newMessage.guild.channels.fetch(guildData.log_channel).catch(() => null);
        if (!logChannel) return;

        const oldContent = oldMessage.content
            ? (oldMessage.content.length > 1024 ? oldMessage.content.slice(0, 1021) + '...' : oldMessage.content)
            : 'No content (embed or attachment)';
        
        const newContent = newMessage.content
            ? (newMessage.content.length > 1024 ? newMessage.content.slice(0, 1021) + '...' : newMessage.content)
            : 'No content (embed or attachment)';

        const embed = new EmbedBuilder()
            .setColor(colors.warning)
            .setTitle('Message Edited')
            .addFields(
                { name: 'Author', value: `${newMessage.author.tag} (${newMessage.author.id})`, inline: true },
                { name: 'Channel', value: `${newMessage.channel} (${newMessage.channel.id})`, inline: true },
                { name: 'Before', value: oldContent, inline: false },
                { name: 'After', value: newContent, inline: false }
            )
            .setThumbnail(newMessage.author.displayAvatarURL({ dynamic: true }))
            .setTimestamp();

        embed.addFields({
            name: 'Jump to Message',
            value: `[Click here](${newMessage.url})`,
            inline: false
        });

        await logChannel.send({ embeds: [embed] }).catch(() => {});
    }
};
