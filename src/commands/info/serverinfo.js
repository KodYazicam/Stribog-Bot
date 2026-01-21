const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');
const { colors } = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Get information about the server'),
    
    cooldown: 5,
    
    async execute(interaction) {
        const { guild } = interaction;
        
        await guild.members.fetch();

        const verificationLevels = {
            0: 'None',
            1: 'Low',
            2: 'Medium',
            3: 'High',
            4: 'Very High'
        };

        const boostTiers = {
            0: 'None',
            1: 'Tier 1',
            2: 'Tier 2',
            3: 'Tier 3'
        };

        const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
        const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
        const categories = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size;
        const forumChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildForum).size;
        const stageChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildStageVoice).size;

        const onlineMembers = guild.members.cache.filter(m => m.presence?.status !== 'offline').size;
        const botCount = guild.members.cache.filter(m => m.user.bot).size;
        const humanCount = guild.memberCount - botCount;

        const embed = new EmbedBuilder()
            .setColor(colors.primary)
            .setTitle(guild.name)
            .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
            .addFields(
                { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
                { name: 'Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
                { name: 'Server ID', value: guild.id, inline: true },
                { 
                    name: `Members [${guild.memberCount}]`, 
                    value: `👤 Humans: ${humanCount}\n🤖 Bots: ${botCount}\n🟢 Online: ${onlineMembers}`, 
                    inline: true 
                },
                { 
                    name: `Channels [${guild.channels.cache.size}]`, 
                    value: `💬 Text: ${textChannels}\n🔊 Voice: ${voiceChannels}\n📁 Categories: ${categories}\n📋 Forum: ${forumChannels}\n🎭 Stage: ${stageChannels}`, 
                    inline: true 
                },
                { name: 'Roles', value: `${guild.roles.cache.size}`, inline: true },
                { name: 'Emojis', value: `${guild.emojis.cache.size}`, inline: true },
                { name: 'Stickers', value: `${guild.stickers.cache.size}`, inline: true },
                { name: 'Verification', value: verificationLevels[guild.verificationLevel], inline: true },
                { name: 'Boost Tier', value: boostTiers[guild.premiumTier], inline: true },
                { name: 'Boosts', value: `${guild.premiumSubscriptionCount || 0}`, inline: true }
            )
            .setTimestamp();

        if (guild.banner) {
            embed.setImage(guild.bannerURL({ size: 1024 }));
        }

        if (guild.description) {
            embed.setDescription(guild.description);
        }

        await interaction.reply({ embeds: [embed] });
    }
};
