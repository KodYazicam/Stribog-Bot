module.exports = {
    colors: {
        primary: 0x5865F2,
        success: 0x57F287,
        warning: 0xFEE75C,
        danger: 0xED4245,
        info: 0x5865F2
    },
    emojis: {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        loading: '⏳',
        info: 'ℹ️'
    },
    cooldown: 3,
    owner: process.env.OWNER_ID || null,
    economy: {
        dailyAmount: 100,
        workMinAmount: 50,
        workMaxAmount: 200,
        workCooldown: 30 * 60 * 1000,
        dailyCooldown: 24 * 60 * 60 * 1000
    },
    leveling: {
        xpPerMessage: [10, 20],
        xpCooldown: 60 * 1000,
        baseXP: 100,
        xpMultiplier: 1.5
    }
};
