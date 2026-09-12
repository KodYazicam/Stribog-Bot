const { EmbedBuilder } = require('discord.js');
const { colors } = require('../config/config');
const { getGuild, insertGuild } = require('../utils/database');

module.exports = {
    name: 'guildMemberAdd',
    async execute(member) {
        insertGuild.run(member.guild.id);
        const guildData = getGuild.get(member.guild.id);
        const channelId = guildData?.welcome_channel || member.guild.systemChannelId;
        if (!channelId) return;

        const welcomeChannel = await member.guild.channels.fetch(channelId).catch(() => null);
        if (!welcomeChannel) return;

        let description = guildData?.welcome_message || 'Welcome to **{server}**, {user}!';
        description = description
            .replace(/{user}/g, `${member}`)
            .replace(/{server}/g, member.guild.name)
            .replace(/{memberCount}/g, String(member.guild.memberCount));

        const embed = new EmbedBuilder()
            .setColor(colors.success)
            .setTitle('Welcome!')
            .setDescription(description)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields(
                { name: 'Member Count', value: `${member.guild.memberCount}`, inline: true },
                { name: 'Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true }
            )
            .setFooter({ text: `ID: ${member.id}` })
            .setTimestamp();

        try {
            await welcomeChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Failed to send welcome message:', error);
        }
    }
};
