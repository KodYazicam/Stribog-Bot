const { Events, EmbedBuilder } = require('discord.js');
const { colors } = require('../config/config');
const { getUserGuildData, updateUserXP, updateUserLevel, getGuild, insertGuild } = require('../utils/database');
const { xpRequiredForLevel, randomXpGain, xpCooldown } = require('../utils/leveling');
const { handlePrefixMessage } = require('../utils/prefix');
const { logAutoModAction } = require('../utils/automodAudit');

const xpCooldowns = new Map();
const antiSpamMap = new Map();

module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {
        if (message.author.bot || !message.guild) return;

        insertGuild.run(message.guild.id);

        try {
            if (await handlePrefixMessage(message, client)) return;
        } catch (error) {
            console.error('Prefix command error:', error);
        }

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

function unrefTimer(timer) {
    if (timer && typeof timer.unref === 'function') timer.unref();
    return timer;
}

async function safeDelete(message) {
    try {
        await message.delete();
        return true;
    } catch {
        return false;
    }
}

async function deleteRecentUserMessages(message) {
    try {
        const messages = await message.channel.messages.fetch({ limit: 10 });
        const userMessages = messages.filter(item => item.author?.id === message.author.id);
        if (userMessages.size === 0) return 0;
        await message.channel.bulkDelete(userMessages);
        return userMessages.size;
    } catch {
        return 0;
    }
}

async function timeoutMember(member, duration, reason) {
    try {
        if (typeof member?.timeout !== 'function') return false;
        await member.timeout(duration, reason);
        return true;
    } catch {
        return false;
    }
}

async function sendAutoModWarning(message, description) {
    try {
        if (typeof message.channel?.send !== 'function') return false;
        const warning = await message.channel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor(colors.danger)
                    .setDescription(description)
            ]
        });
        const timer = setTimeout(() => {
            Promise.resolve()
                .then(() => warning?.delete?.())
                .catch(() => {});
        }, 5000);
        unrefTimer(timer);
        return true;
    } catch {
        return false;
    }
}

async function writeAutoModAudit(message, details) {
    try {
        await logAutoModAction(message.guild, {
            user: message.author,
            channel: message.channel,
            messageId: message.id,
            ...details
        });
    } catch (error) {
        console.error('AutoMod audit error:', error);
    }
}

async function handleAutoMod(message, client) {
    const guildData = getGuild.get(message.guild.id);
    if (!guildData) return;

    if (!message.member) return;
    if (message.member.permissions.has('ManageMessages')) return;

    if (guildData.automod_antilink === 1) {
        const urlRegex = /(https?:\/\/[^\s]+)/gi;
        const urls = message.content.match(urlRegex) || [];

        if (urls.length > 0) {
            let whitelistedDomains = [];
            try {
                const parsedWhitelist = guildData.automod_whitelist
                    ? JSON.parse(guildData.automod_whitelist)
                    : [];
                whitelistedDomains = Array.isArray(parsedWhitelist)
                    ? parsedWhitelist.filter(entry => typeof entry === 'string')
                    : [];
            } catch {
                whitelistedDomains = [];
            }

            let blockedUrls = 0;
            for (const url of urls) {
                let domain = '';
                try {
                    domain = new URL(url).hostname;
                } catch {
                    blockedUrls += 1;
                    continue;
                }
                if (!whitelistedDomains.some(entry => domain.includes(entry))) {
                    blockedUrls += 1;
                }
            }

            if (blockedUrls > 0) {
                const deleted = await safeDelete(message);
                const warningPosted = await sendAutoModWarning(
                    message,
                    `${message.author}, links are not allowed in this server.`
                );
                await writeAutoModAudit(message, {
                    rule: 'antilink',
                    actions: [
                        deleted ? 'Message deleted' : 'Message deletion failed',
                        warningPosted ? 'Warning posted' : 'Warning unavailable'
                    ],
                    before: 'Link message present',
                    after: deleted ? 'Link message removed' : 'Link message still present',
                    metadata: `Blocked links: ${blockedUrls}`
                });
                return;
            }
        }
    }

    if (guildData.automod_antispam === 1) {
        const key = `${message.guild.id}-${message.author.id}`;
        const now = Date.now();

        if (antiSpamMap.size > 5000) {
            for (const [mapKey, entry] of antiSpamMap) {
                if (now - entry.firstMessage > 60000) antiSpamMap.delete(mapKey);
            }
        }
        if (!antiSpamMap.has(key)) {
            antiSpamMap.set(key, { count: 1, firstMessage: now });
        } else {
            const data = antiSpamMap.get(key);

            if (now - data.firstMessage < 5000) {
                data.count += 1;

                if (data.count >= 5) {
                    const windowSeconds = Math.max(1, Math.round((now - data.firstMessage) / 1000));
                    const deletedCount = await deleteRecentUserMessages(message);
                    const timedOut = await timeoutMember(message.member, 60000, 'AutoMod: Spam detected');
                    const warningPosted = await sendAutoModWarning(
                        message,
                        `${message.author} has been timed out for spamming.`
                    );

                    await writeAutoModAudit(message, {
                        rule: 'antispam',
                        actions: [
                            deletedCount > 0
                                ? `Bulk deleted ${deletedCount} message(s)`
                                : 'No recent messages deleted',
                            timedOut ? 'Member timed out for 60s' : 'Timeout failed',
                            warningPosted ? 'Warning posted' : 'Warning unavailable'
                        ],
                        before: `${data.count} messages in ${windowSeconds}s`,
                        after: [
                            deletedCount > 0
                                ? `${deletedCount} recent messages removed`
                                : 'No recent messages removed',
                            timedOut ? 'member timed out for 60s' : 'timeout unavailable'
                        ].join('; '),
                        metadata: `Messages in window: ${data.count}`
                    });

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
            const matched = Array.isArray(badWords)
                && badWords.some(word => content.includes(String(word).toLowerCase()));

            if (matched) {
                const deleted = await safeDelete(message);
                const warningPosted = await sendAutoModWarning(
                    message,
                    `${message.author}, your message contained a prohibited word.`
                );
                await writeAutoModAudit(message, {
                    rule: 'badwords',
                    actions: [
                        deleted ? 'Message deleted' : 'Message deletion failed',
                        warningPosted ? 'Warning posted' : 'Warning unavailable'
                    ],
                    before: 'Message matched a prohibited word',
                    after: deleted ? 'Message removed' : 'Message still present',
                    metadata: 'Filter match: prohibited word'
                });
                return;
            }
        } catch {}
    }

    if (guildData.automod_caps === 1) {
        if (message.content.length > 10) {
            const upperCase = message.content.replace(/[^A-Z]/g, '').length;
            const totalLetters = message.content.replace(/[^a-zA-Z]/g, '').length;

            if (totalLetters > 0 && (upperCase / totalLetters) > 0.7) {
                const ratio = Math.round((upperCase / totalLetters) * 100);
                const deleted = await safeDelete(message);
                const warningPosted = await sendAutoModWarning(
                    message,
                    `${message.author}, please avoid excessive caps.`
                );
                await writeAutoModAudit(message, {
                    rule: 'caps',
                    actions: [
                        deleted ? 'Message deleted' : 'Message deletion failed',
                        warningPosted ? 'Warning posted' : 'Warning unavailable'
                    ],
                    before: `Uppercase ratio: ${ratio}%`,
                    after: deleted ? 'Message removed' : 'Message still present',
                    metadata: 'Threshold: 70%'
                });
                return;
            }
        }
    }

    if (guildData.automod_mentions === 1) {
        const userMentions = message.mentions.users.size;
        const roleMentions = message.mentions.roles.size;

        if (userMentions > 5 || roleMentions > 3) {
            const deleted = await safeDelete(message);
            const warningPosted = await sendAutoModWarning(
                message,
                `${message.author}, please avoid mass mentions.`
            );
            await writeAutoModAudit(message, {
                rule: 'mentions',
                actions: [
                    deleted ? 'Message deleted' : 'Message deletion failed',
                    warningPosted ? 'Warning posted' : 'Warning unavailable'
                ],
                before: 'Mass mention threshold exceeded',
                after: deleted ? 'Message removed' : 'Message still present',
                metadata: `Mentions: ${userMentions} users, ${roleMentions} roles`
            });
        }
    }
}

module.exports.handleAutoMod = handleAutoMod;


