const { EmbedBuilder } = require('discord.js');
const { colors } = require('../config/config');

module.exports = {
    name: 'guildMemberAdd',
    async execute(member, client) {
        const welcomeChannel = member.guild.systemChannel;
        
        if (!welcomeChannel) return;

        const embed = new EmbedBuilder()
            .setColor(colors.success)
            .setTitle('Welcome!')
            .setDescription(`Welcome to **${member.guild.name}**, ${member}!`)
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
