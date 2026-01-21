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
    owner: process.env.OWNER_ID || null
};
