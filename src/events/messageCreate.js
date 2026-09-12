const { Events, EmbedBuilder } = require('discord.js');
const { colors } = require('../config/config');
const { getUserGuildData, updateUserXP, updateUserLevel, getGuild, insertGuild } = require('../utils/database');
const { xpRequiredForLevel, randomXpGain, xpCooldown } = require('../utils/leveling');

const xpCooldowns = new Map();
const antiSpamMap = new Map();

module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {
        if (message.author.bot || !message.guild) return;

        insertGuild.run(message.guild.id);

        try {
            await handleLeveling(message, client);
        } catch (error) {
            console.error('Leveling error:', error);
        }
        try {
            await handleAutoMod(message, client);
        } catch (error) {
            console.error('AutoMod error:', error);
        }
    }
};

async function handleLeveling(message, client) {
    const guildData = getGuild.get(message.guild.id);
    if (guildData?.leveling_enabled === 0) return;

    const key = `${message.guild.id}-${message.author.id}`;
    const now = Date.now();
    const cooldown = xpCooldowns.get(key);

    if (cooldown && now - cooldown < xpCooldown) return;

    xpCooldowns.set(key, now);

    let userData = getUserGuildData.get(message.author.id, message.guild.id);

    if (!userData) {
        const { insertUserGuildData } = require('../utils/database');
        insertUserGuildData.run(message.author.id, message.guild.id);
        userData = getUserGuildData.get(message.author.id, message.guild.id);
        if (!userData) return;
    }

    const xpGain = randomXpGain();
    const newXP = userData.xp + xpGain;
    const currentLevel = userData.level;
    const xpNeeded = xpRequiredForLevel(currentLevel + 1);

    updateUserXP.run(newXP, message.guild.id, message.author.id);

    if (newXP >= xpNeeded) {
        const newLevel = currentLevel + 1;
        updateUserLevel.run(newLevel, message.guild.id, message.author.id);

        if (guildData?.level_up_channel) {
            const channel = await message.guild.channels.fetch(guildData.level_up_channel).catch(() => null);
            if (channel) {
                await channel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.success)
                            .setTitle('🎉 Level Up!')
                            .setDescription(`Congratulations ${message.author}! You reached **Level ${newLevel}**!`)
                            .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
                            .setTimestamp()
                    ]
                });
            }
        } else {
            await message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.success)
                        .setTitle('🎉 Level Up!')
                        .setDescription(`Congratulations ${message.author}! You reached **Level ${newLevel}**!`)
                        .setTimestamp()
                ]
            }).catch(() => {});
        }

        if (guildData?.level_roles) {
            try {
                const levelRoles = JSON.parse(guildData.level_roles);
                const roleToAdd = levelRoles[newLevel.toString()];
                if (roleToAdd) {
                    const role = await message.guild.roles.fetch(roleToAdd).catch(() => null);
                    if (role) {
                        await message.member.roles.add(role).catch(() => {});
                    }
                }
            } catch {}
        }
    }
}

async function handleAutoMod(message, client) {
    const guildData = getGuild.get(message.guild.id);
    if (!guildData) return;

    if (!message.member) return;
    if (message.member.permissions.has('ManageMessages')) return;

    if (guildData.automod_antilink === 1) {
        const urlRegex = /(https?:\/\/[^\s]+)/gi;
        if (urlRegex.test(message.content)) {
            const whitelistedDomains = guildData.automod_whitelist ? JSON.parse(guildData.automod_whitelist) : [];
            const urls = message.content.match(urlRegex);
            
            let hasBlockedUrl = false;
            for (const url of urls) {
                const domain = new URL(url).hostname;
                if (!whitelistedDomains.some(d => domain.includes(d))) {
                    hasBlockedUrl = true;
                    break;
                }
            }

            if (hasBlockedUrl) {
                await message.delete().catch(() => {});
                const warning = await message.channel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.danger)
                            .setDescription(`${message.author}, links are not allowed in this server.`)
                    ]
                });
                setTimeout(() => warning.delete().catch(() => {}), 5000);
                return;
            }
        }
    }

    if (guildData.automod_antispam === 1) {
        const key = `${message.guild.id}-${message.author.id}`;
        const now = Date.now();
        
        if (!antiSpamMap.has(key)) {
            antiSpamMap.set(key, { count: 1, firstMessage: now });
        } else {
            const data = antiSpamMap.get(key);
            
            if (now - data.firstMessage < 5000) {
                data.count++;
                
                if (data.count >= 5) {
                    const messages = await message.channel.messages.fetch({ limit: 10 });
                    const userMessages = messages.filter(m => m.author.id === message.author.id);
                    await message.channel.bulkDelete(userMessages).catch(() => {});
                    
                    await message.member.timeout(60000, 'AutoMod: Spam detected').catch(() => {});
                    
                    const warning = await message.channel.send({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(colors.danger)
                                .setDescription(`${message.author} has been timed out for spamming.`)
                        ]
                    });
                    setTimeout(() => warning.delete().catch(() => {}), 5000);
                    
                    antiSpamMap.delete(key);
                    return;
                }
            } else {
                antiSpamMap.set(key, { count: 1, firstMessage: now });
            }
        }
    }

    if (guildData.automod_badwords === 1 && guildData.automod_wordlist) {
        try {
            const badWords = JSON.parse(guildData.automod_wordlist);
            const content = message.content.toLowerCase();
            
            for (const word of badWords) {
                if (content.includes(word.toLowerCase())) {
                    await message.delete().catch(() => {});
                    const warning = await message.channel.send({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(colors.danger)
                                .setDescription(`${message.author}, your message contained a prohibited word.`)
                        ]
                    });
                    setTimeout(() => warning.delete().catch(() => {}), 5000);
                    return;
                }
            }
        } catch {}
    }

    if (guildData.automod_caps === 1) {
        if (message.content.length > 10) {
            const upperCase = message.content.replace(/[^A-Z]/g, '').length;
            const totalLetters = message.content.replace(/[^a-zA-Z]/g, '').length;
            
            if (totalLetters > 0 && (upperCase / totalLetters) > 0.7) {
                await message.delete().catch(() => {});
                const warning = await message.channel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.danger)
                            .setDescription(`${message.author}, please avoid excessive caps.`)
                    ]
                });
                setTimeout(() => warning.delete().catch(() => {}), 5000);
                return;
            }
        }
    }

    if (guildData.automod_mentions === 1) {
        if (message.mentions.users.size > 5 || message.mentions.roles.size > 3) {
            await message.delete().catch(() => {});
            const warning = await message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.danger)
                        .setDescription(`${message.author}, please avoid mass mentions.`)
                ]
            });
            setTimeout(() => warning.delete().catch(() => {}), 5000);
        }
    }
}


