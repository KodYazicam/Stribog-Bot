const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DEFAULT_DB_PATH = path.join(__dirname, '../../data', 'bot.db');
const dbPath = process.env.STRIBOG_DB_PATH || DEFAULT_DB_PATH;

if (dbPath !== ':memory:') {
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        balance INTEGER DEFAULT 0,
        bank INTEGER DEFAULT 0,
        xp INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        daily_claimed INTEGER DEFAULT 0,
        work_cooldown INTEGER DEFAULT 0,
        warnings INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS guilds (
        id TEXT PRIMARY KEY,
        welcome_channel TEXT,
        welcome_message TEXT,
        goodbye_channel TEXT,
        goodbye_message TEXT,
        log_channel TEXT,
        mod_log_channel TEXT,
        ticket_category TEXT,
        ticket_log_channel TEXT,
        automod_enabled INTEGER DEFAULT 0,
        automod_antilink INTEGER DEFAULT 0,
        automod_antispam INTEGER DEFAULT 0,
        automod_badwords INTEGER DEFAULT 0,
        automod_caps INTEGER DEFAULT 0,
        automod_mentions INTEGER DEFAULT 0,
        automod_wordlist TEXT,
        automod_whitelist TEXT,
        leveling_enabled INTEGER DEFAULT 1,
        level_up_channel TEXT,
        level_up_message TEXT DEFAULT 'Congratulations {user}! You reached level {level}!',
        level_roles TEXT
    );

    CREATE TABLE IF NOT EXISTS warnings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        moderator_id TEXT NOT NULL,
        reason TEXT NOT NULL,
        timestamp INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS giveaways (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id TEXT UNIQUE NOT NULL,
        channel_id TEXT NOT NULL,
        guild_id TEXT NOT NULL,
        prize TEXT NOT NULL,
        winners INTEGER DEFAULT 1,
        end_time INTEGER NOT NULL,
        ended INTEGER DEFAULT 0,
        host_id TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        channel_id TEXT UNIQUE NOT NULL,
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        closed INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        message TEXT NOT NULL,
        remind_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_guild_data (
        user_id TEXT NOT NULL,
        guild_id TEXT NOT NULL,
        xp INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        messages INTEGER DEFAULT 0,
        PRIMARY KEY (user_id, guild_id)
    );

    CREATE TABLE IF NOT EXISTS shop_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        price INTEGER NOT NULL,
        role_id TEXT
    );

    CREATE TABLE IF NOT EXISTS inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        guild_id TEXT NOT NULL,
        item_id INTEGER NOT NULL,
        quantity INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS giveaway_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        giveaway_id INTEGER NOT NULL,
        user_id TEXT NOT NULL,
        entered_at INTEGER NOT NULL,
        UNIQUE(giveaway_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS command_permissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        command_name TEXT NOT NULL,
        role_id TEXT NOT NULL,
        permission_type TEXT DEFAULT 'allow',
        UNIQUE(guild_id, command_name, role_id)
    );

    CREATE TABLE IF NOT EXISTS disabled_commands (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        command_name TEXT NOT NULL,
        channel_id TEXT,
        UNIQUE(guild_id, command_name, channel_id)
    );

    CREATE TABLE IF NOT EXISTS guild_economy (
        user_id TEXT NOT NULL,
        guild_id TEXT NOT NULL,
        balance INTEGER DEFAULT 0,
        bank INTEGER DEFAULT 0,
        daily_claimed INTEGER DEFAULT 0,
        work_cooldown INTEGER DEFAULT 0,
        PRIMARY KEY (user_id, guild_id)
    );
`);

try {
    db.exec('ALTER TABLE guilds ADD COLUMN support_role TEXT');
} catch {
    // already migrated
}

const getUser = db.prepare('SELECT * FROM users WHERE id = ?');
const insertUser = db.prepare('INSERT OR IGNORE INTO users (id) VALUES (?)');
const updateUserBalance = db.prepare('UPDATE users SET balance = ? WHERE id = ?');
const updateUserBank = db.prepare('UPDATE users SET bank = ? WHERE id = ?');
const updateUserDaily = db.prepare('UPDATE users SET daily_claimed = ? WHERE id = ?');
const updateUserWork = db.prepare('UPDATE users SET work_cooldown = ? WHERE id = ?');

const getEconomy = db.prepare('SELECT * FROM guild_economy WHERE user_id = ? AND guild_id = ?');
const insertEconomy = db.prepare('INSERT OR IGNORE INTO guild_economy (user_id, guild_id) VALUES (?, ?)');
const updateEconomyBalance = db.prepare('UPDATE guild_economy SET balance = ? WHERE user_id = ? AND guild_id = ?');
const updateEconomyBank = db.prepare('UPDATE guild_economy SET bank = ? WHERE user_id = ? AND guild_id = ?');
const updateEconomyDaily = db.prepare('UPDATE guild_economy SET daily_claimed = ? WHERE user_id = ? AND guild_id = ?');
const updateEconomyWork = db.prepare('UPDATE guild_economy SET work_cooldown = ? WHERE user_id = ? AND guild_id = ?');
const incrementEconomyBalance = db.prepare('UPDATE guild_economy SET balance = balance + ? WHERE user_id = ? AND guild_id = ?');

const ensureEconomy = (userId, guildId) => {
    insertEconomy.run(userId, guildId);
    return getEconomy.get(userId, guildId);
};

// Wallet <-> bank moves must be one guarded statement. Writing the wallet and
// the bank separately let a failed second write mint coins (withdraw kept the
// credit) or destroy them (deposit lost the debit).
const withdrawBankStatement = db.prepare(
    'UPDATE guild_economy SET balance = balance + ?, bank = bank - ? WHERE user_id = ? AND guild_id = ? AND bank >= ?'
);
const depositBankStatement = db.prepare(
    'UPDATE guild_economy SET balance = balance - ?, bank = bank + ? WHERE user_id = ? AND guild_id = ? AND balance >= ?'
);

function validBankAmount(amount) {
    return Number.isInteger(amount) && amount > 0;
}

// Returns false when the amount is invalid or the source side cannot cover it,
// in which case no row is written at all.
const moveBank = (statement) => (userId, guildId, amount) => {
    if (!validBankAmount(amount)) return false;
    ensureEconomy(userId, guildId);
    return statement.run(amount, amount, userId, guildId, amount).changes === 1;
};

const withdrawFromBank = moveBank(withdrawBankStatement);
const depositToBank = moveBank(depositBankStatement);

const transferCoins = db.transaction((fromId, toId, guildId, amount) => {
    ensureEconomy(fromId, guildId);
    ensureEconomy(toId, guildId);
    const from = getEconomy.get(fromId, guildId);
    if (!from || from.balance < amount) return false;
    updateEconomyBalance.run(from.balance - amount, fromId, guildId);
    const to = getEconomy.get(toId, guildId);
    updateEconomyBalance.run(to.balance + amount, toId, guildId);
    return true;
});

// Spending must not be based on a balance read earlier: another command can
// credit or debit the same row before the write lands (for example while
// /shop buy awaits roles.fetch). One guarded statement keeps the debit and the
// affordability check atomic, so a stale read cannot create or destroy coins.
const chargeEconomyBalance = db.prepare(
    'UPDATE guild_economy SET balance = balance - ? WHERE user_id = ? AND guild_id = ? AND balance >= ?'
);

const spendEconomyCoins = (userId, guildId, amount) => {
    if (!Number.isInteger(amount) || amount <= 0) return false;
    ensureEconomy(userId, guildId);
    return chargeEconomyBalance.run(amount, userId, guildId, amount).changes === 1;
};

// Atomic credit for rewards. A read-modify-write here would lose updates when
// two rewards land together, so the balance moves inside a single statement.
const addEconomyCoins = db.transaction((userId, guildId, amount) => {
    if (!Number.isInteger(amount) || amount <= 0) {
        throw new RangeError('amount must be a positive integer');
    }
    ensureEconomy(userId, guildId);
    incrementEconomyBalance.run(amount, userId, guildId);
    return getEconomy.get(userId, guildId);
});

const getGuild = db.prepare('SELECT * FROM guilds WHERE id = ?');
const insertGuild = db.prepare('INSERT OR IGNORE INTO guilds (id) VALUES (?)');
const GUILD_COLUMNS = new Set([
    'welcome_channel', 'welcome_message', 'goodbye_channel', 'goodbye_message',
    'log_channel', 'mod_log_channel', 'ticket_category', 'ticket_log_channel',
    'support_role', 'automod_enabled', 'automod_antilink', 'automod_antispam',
    'automod_badwords', 'automod_caps', 'automod_mentions', 'automod_wordlist',
    'automod_whitelist', 'leveling_enabled', 'level_up_channel', 'level_up_message',
    'level_roles'
]);
const updateGuildSetting = (setting) => {
    if (!GUILD_COLUMNS.has(setting)) {
        throw new Error(`Invalid guild setting: ${setting}`);
    }
    return db.prepare(`UPDATE guilds SET ${setting} = ? WHERE id = ?`);
};

const getUserGuildData = db.prepare('SELECT * FROM user_guild_data WHERE user_id = ? AND guild_id = ?');
const insertUserGuildData = db.prepare('INSERT OR IGNORE INTO user_guild_data (user_id, guild_id) VALUES (?, ?)');
// Every ordinary chat message is counted, whether or not it is eligible for
// XP; the XP cooldown only gates XP and level-ups.
const recordUserMessage = db.prepare('UPDATE user_guild_data SET messages = COALESCE(messages, 0) + 1 WHERE user_id = ? AND guild_id = ?');

// Administrator /setxp changes progress only: setting XP is not a sent message.
const setUserGuildXP = db.prepare('UPDATE user_guild_data SET xp = ?, level = ? WHERE user_id = ? AND guild_id = ?');

const getWarnings = db.prepare('SELECT * FROM warnings WHERE guild_id = ? AND user_id = ? ORDER BY timestamp DESC');
const addWarning = db.prepare('INSERT INTO warnings (guild_id, user_id, moderator_id, reason, timestamp) VALUES (?, ?, ?, ?, ?)');
const clearWarnings = db.prepare('DELETE FROM warnings WHERE guild_id = ? AND user_id = ?');
const deleteWarning = db.prepare('DELETE FROM warnings WHERE id = ?');
const deleteWarningById = db.prepare('DELETE FROM warnings WHERE id = ? AND guild_id = ? AND user_id = ?');

const getActiveGiveaways = db.prepare('SELECT * FROM giveaways WHERE ended = 0 AND end_time <= ?');
const getAllActiveGiveaways = db.prepare('SELECT * FROM giveaways WHERE ended = 0');
const getGiveaway = db.prepare('SELECT * FROM giveaways WHERE message_id = ?');
const insertGiveaway = db.prepare('INSERT INTO giveaways (message_id, channel_id, guild_id, prize, winners, end_time, host_id) VALUES (?, ?, ?, ?, ?, ?, ?)');
const endGiveaway = db.prepare('UPDATE giveaways SET ended = 1 WHERE message_id = ?');

const getTicket = db.prepare('SELECT * FROM tickets WHERE channel_id = ?');
const getUserTickets = db.prepare('SELECT * FROM tickets WHERE guild_id = ? AND user_id = ? AND closed = 0');
const insertTicket = db.prepare('INSERT INTO tickets (channel_id, guild_id, user_id, created_at) VALUES (?, ?, ?, ?)');
const closeTicket = db.prepare('UPDATE tickets SET closed = 1 WHERE channel_id = ?');

const getReminders = db.prepare('SELECT * FROM reminders WHERE remind_at <= ?');
const getUserReminders = db.prepare('SELECT * FROM reminders WHERE user_id = ?');
const insertReminder = db.prepare('INSERT INTO reminders (user_id, channel_id, message, remind_at, created_at) VALUES (?, ?, ?, ?, ?)');
const deleteReminder = db.prepare('DELETE FROM reminders WHERE id = ?');

const getLeaderboard = db.prepare('SELECT * FROM user_guild_data WHERE guild_id = ? ORDER BY xp DESC LIMIT ?');
const getEconomyLeaderboard = db.prepare('SELECT * FROM guild_economy WHERE guild_id = ? ORDER BY (balance + bank) DESC LIMIT ?');

const getShopItems = db.prepare('SELECT * FROM shop_items WHERE guild_id = ?');
const getShopItem = db.prepare('SELECT * FROM shop_items WHERE id = ? AND guild_id = ?');
const insertShopItem = db.prepare('INSERT INTO shop_items (guild_id, name, description, price, role_id) VALUES (?, ?, ?, ?, ?)');
const deleteShopItem = db.prepare('DELETE FROM shop_items WHERE id = ? AND guild_id = ?');

const getGiveawayEntries = db.prepare('SELECT * FROM giveaway_entries WHERE giveaway_id = ?');
const addGiveawayEntry = db.prepare('INSERT OR IGNORE INTO giveaway_entries (giveaway_id, user_id, entered_at) VALUES (?, ?, ?)');
const removeGiveawayEntry = db.prepare('DELETE FROM giveaway_entries WHERE giveaway_id = ? AND user_id = ?');
const checkGiveawayEntry = db.prepare('SELECT * FROM giveaway_entries WHERE giveaway_id = ? AND user_id = ?');
const deleteGiveawayEntries = db.prepare('DELETE FROM giveaway_entries WHERE giveaway_id = ?');
const getGiveawayById = db.prepare('SELECT * FROM giveaways WHERE id = ?');

const updateUserXP = db.prepare('UPDATE user_guild_data SET xp = ? WHERE guild_id = ? AND user_id = ?');
const updateUserLevel = db.prepare('UPDATE user_guild_data SET level = ? WHERE guild_id = ? AND user_id = ?');
const updateUserCoins = db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?');

const getUserGuildDataByGuild = db.prepare('SELECT * FROM user_guild_data WHERE guild_id = ? AND user_id = ?');

const getCommandPermissions = db.prepare('SELECT * FROM command_permissions WHERE guild_id = ? AND command_name = ?');
const getAllCommandPermissions = db.prepare('SELECT * FROM command_permissions WHERE guild_id = ?');
const addCommandPermission = db.prepare('INSERT OR REPLACE INTO command_permissions (guild_id, command_name, role_id, permission_type) VALUES (?, ?, ?, ?)');
const removeCommandPermission = db.prepare('DELETE FROM command_permissions WHERE guild_id = ? AND command_name = ? AND role_id = ?');
const clearCommandPermissions = db.prepare('DELETE FROM command_permissions WHERE guild_id = ? AND command_name = ?');

const getDisabledCommands = db.prepare('SELECT * FROM disabled_commands WHERE guild_id = ?');
const isCommandDisabled = db.prepare('SELECT * FROM disabled_commands WHERE guild_id = ? AND command_name = ? AND (channel_id IS NULL OR channel_id = ?)');
const disableCommand = db.prepare('INSERT OR IGNORE INTO disabled_commands (guild_id, command_name, channel_id) VALUES (?, ?, ?)');
// A server-wide enable must clear every rule for the command, including the
// channel-scoped ones. A channel-scoped enable must clear only that channel's
// row: the schema has no per-channel "allow" override, so deleting the
// server-wide row here would silently lift the disable everywhere.
const enableCommand = db.prepare('DELETE FROM disabled_commands WHERE guild_id = ? AND command_name = ?');
const enableCommandInChannel = db.prepare('DELETE FROM disabled_commands WHERE guild_id = ? AND command_name = ? AND channel_id = ?');

module.exports = {
    db,
    getUser,
    insertUser,
    updateUserBalance,
    updateUserBank,
    updateUserDaily,
    updateUserWork,
    getEconomy,
    insertEconomy,
    ensureEconomy,
    addEconomyCoins,
    spendEconomyCoins,
    updateEconomyBalance,
    updateEconomyBank,
    updateEconomyDaily,
    updateEconomyWork,
    transferCoins,
    withdrawFromBank,
    depositToBank,
    getGuild,
    insertGuild,
    updateGuildSetting,
    GUILD_COLUMNS,
    getUserGuildData,
    insertUserGuildData,
    recordUserMessage,
    setUserGuildXP,
    getWarnings,
    addWarning,
    clearWarnings,
    deleteWarning,
    deleteWarningById,
    getActiveGiveaways,
    getAllActiveGiveaways,
    getGiveaway,
    getGiveawayById,
    insertGiveaway,
    endGiveaway,
    getTicket,
    getUserTickets,
    insertTicket,
    closeTicket,
    getReminders,
    getUserReminders,
    insertReminder,
    deleteReminder,
    getLeaderboard,
    getEconomyLeaderboard,
    getShopItems,
    getShopItem,
    insertShopItem,
    deleteShopItem,
    getGiveawayEntries,
    addGiveawayEntry,
    removeGiveawayEntry,
    checkGiveawayEntry,
    deleteGiveawayEntries,
    updateUserXP,
    updateUserLevel,
    updateUserCoins,
    getUserGuildDataByGuild,
    getCommandPermissions,
    getAllCommandPermissions,
    addCommandPermission,
    removeCommandPermission,
    clearCommandPermissions,
    getDisabledCommands,
    isCommandDisabled,
    disableCommand,
    enableCommand,
    enableCommandInChannel
};
