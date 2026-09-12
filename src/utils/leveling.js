const { leveling } = require('../config/config');

function xpRequiredForLevel(level) {
    if (level <= 1) return 0;
    return Math.floor(leveling.baseXP * Math.pow(leveling.xpMultiplier, level - 1));
}

function levelFromTotalXp(xp) {
    let level = 1;
    while (xp >= xpRequiredForLevel(level + 1)) {
        level += 1;
        if (level >= 999) break;
    }
    return level;
}

function randomXpGain() {
    const [min, max] = leveling.xpPerMessage;
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = {
    xpRequiredForLevel,
    levelFromTotalXp,
    randomXpGain,
    xpCooldown: leveling.xpCooldown
};
