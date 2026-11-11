const {
    db,
    GUILD_COLUMNS,
    getGuild,
    insertGuild,
    updateGuildSetting,
    getAllCommandPermissions,
    getDisabledCommands
} = require('./database');

const SCHEMA_VERSION = 1;
const MAX_ROWS = 250;
const MAX_SETTING_LENGTH = 10000;
const COMMAND_NAME = /^[a-z0-9_-]{1,32}$/;
const SNOWFLAKE = /^\d{1,32}$/;

function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function buildGuildConfig(guildId) {
    insertGuild.run(guildId);
    const guild = getGuild.get(guildId);
    const settings = {};

    for (const key of [...GUILD_COLUMNS].sort()) {
        settings[key] = guild?.[key] ?? null;
    }

    const commandPermissions = getAllCommandPermissions.all(guildId)
        .map(row => ({
            command_name: row.command_name,
            role_id: row.role_id,
            permission_type: row.permission_type
        }))
        .sort((a, b) => `${a.command_name}\0${a.role_id}`.localeCompare(`${b.command_name}\0${b.role_id}`));

    const disabledByKey = new Map();
    for (const row of getDisabledCommands.all(guildId)) {
        disabledByKey.set(`${row.command_name}\0${row.channel_id ?? ''}`, {
            command_name: row.command_name,
            channel_id: row.channel_id ?? null
        });
    }
    const disabledCommands = [...disabledByKey.values()]
        .sort((a, b) => `${a.command_name}\0${a.channel_id ?? ''}`.localeCompare(`${b.command_name}\0${b.channel_id ?? ''}`));

    return {
        schema_version: SCHEMA_VERSION,
        guild_id: guildId,
        settings,
        command_permissions: commandPermissions,
        disabled_commands: disabledCommands
    };
}

function validateGuildConfig(payload, expectedGuildId) {
    if (!isPlainObject(payload)) throw new Error('Config must be a JSON object.');
    if (payload.schema_version !== SCHEMA_VERSION) {
        throw new Error(`Unsupported config schema version: ${payload.schema_version}.`);
    }
    if (payload.guild_id !== expectedGuildId) {
        throw new Error('This config belongs to a different guild.');
    }
    if (!isPlainObject(payload.settings)) throw new Error('Config settings must be an object.');
    if (!Array.isArray(payload.command_permissions)) throw new Error('command_permissions must be an array.');
    if (!Array.isArray(payload.disabled_commands)) throw new Error('disabled_commands must be an array.');
    if (payload.command_permissions.length > MAX_ROWS || payload.disabled_commands.length > MAX_ROWS) {
        throw new Error(`Config exceeds the ${MAX_ROWS}-row limit per section.`);
    }

    const settings = {};
    for (const [key, value] of Object.entries(payload.settings)) {
        if (!GUILD_COLUMNS.has(key)) throw new Error(`Unknown guild setting: ${key}.`);
        if (value !== null && !['string', 'number', 'boolean'].includes(typeof value)) {
            throw new Error(`Invalid value for guild setting: ${key}.`);
        }
        if (typeof value === 'string' && value.length > MAX_SETTING_LENGTH) {
            throw new Error(`Guild setting is too long: ${key}.`);
        }
        settings[key] = typeof value === 'boolean' ? Number(value) : value;
    }

    const permissionKeys = new Set();
    const commandPermissions = payload.command_permissions.map((row, index) => {
        const label = `command_permissions[${index}]`;
        if (!isPlainObject(row)) throw new Error(`${label} must be an object.`);
        if (typeof row.command_name !== 'string' || !COMMAND_NAME.test(row.command_name)) {
            throw new Error(`${label}.command_name is invalid.`);
        }
        if (typeof row.role_id !== 'string' || !SNOWFLAKE.test(row.role_id)) {
            throw new Error(`${label}.role_id is invalid.`);
        }
        if (!['allow', 'deny'].includes(row.permission_type)) {
            throw new Error(`${label}.permission_type must be allow or deny.`);
        }
        const key = `${row.command_name}\0${row.role_id}`;
        if (permissionKeys.has(key)) throw new Error(`${label} duplicates another permission rule.`);
        permissionKeys.add(key);
        return {
            command_name: row.command_name,
            role_id: row.role_id,
            permission_type: row.permission_type
        };
    });

    const disabledKeys = new Set();
    const disabledCommands = payload.disabled_commands.map((row, index) => {
        const label = `disabled_commands[${index}]`;
        if (!isPlainObject(row)) throw new Error(`${label} must be an object.`);
        if (typeof row.command_name !== 'string' || !COMMAND_NAME.test(row.command_name)) {
            throw new Error(`${label}.command_name is invalid.`);
        }
        if (row.channel_id !== null && (typeof row.channel_id !== 'string' || !SNOWFLAKE.test(row.channel_id))) {
            throw new Error(`${label}.channel_id is invalid.`);
        }
        const key = `${row.command_name}\0${row.channel_id ?? ''}`;
        if (disabledKeys.has(key)) throw new Error(`${label} duplicates another disabled command rule.`);
        disabledKeys.add(key);
        return {
            command_name: row.command_name,
            channel_id: row.channel_id ?? null
        };
    });

    return { settings, command_permissions: commandPermissions, disabled_commands: disabledCommands };
}

const applyGuildConfig = db.transaction((guildId, config) => {
    const normalized = validateGuildConfig(config, guildId);

    insertGuild.run(guildId);

    for (const [key, value] of Object.entries(normalized.settings)) {
        updateGuildSetting(key).run(value, guildId);
    }

    db.prepare('DELETE FROM command_permissions WHERE guild_id = ?').run(guildId);
    const insertPermission = db.prepare(`
        INSERT INTO command_permissions (guild_id, command_name, role_id, permission_type)
        VALUES (?, ?, ?, ?)
    `);
    for (const row of normalized.command_permissions) {
        insertPermission.run(guildId, row.command_name, row.role_id, row.permission_type);
    }

    db.prepare('DELETE FROM disabled_commands WHERE guild_id = ?').run(guildId);
    const insertDisabled = db.prepare(`
        INSERT INTO disabled_commands (guild_id, command_name, channel_id)
        VALUES (?, ?, ?)
    `);
    for (const row of normalized.disabled_commands) {
        insertDisabled.run(guildId, row.command_name, row.channel_id);
    }

    return {
        settings: Object.keys(normalized.settings).length,
        command_permissions: normalized.command_permissions.length,
        disabled_commands: normalized.disabled_commands.length
    };
});

module.exports = {
    SCHEMA_VERSION,
    buildGuildConfig,
    validateGuildConfig,
    applyGuildConfig
};
