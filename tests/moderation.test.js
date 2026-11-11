const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Collection, PermissionFlagsBits } = require('discord.js');

const ban = require('../src/commands/moderation/ban');
const kick = require('../src/commands/moderation/kick');
const timeout = require('../src/commands/moderation/timeout');
const warn = require('../src/commands/moderation/warn');
const warningsCommand = require('../src/commands/moderation/warnings');
const configCommand = require('../src/commands/admin/config');
const interactionCreate = require('../src/events/interactionCreate');
const database = require('../src/utils/database');
const { buildGuildConfig, applyGuildConfig } = require('../src/utils/guildConfig');

const BOT_ID = '900000000000000001';
let sequence = 0;

function unique(prefix) {
    sequence += 1;
    return `${prefix}-${process.pid}-${Date.now()}-${sequence}`;
}

function deleteGuildConfig(guildId) {
    database.db.prepare('DELETE FROM command_permissions WHERE guild_id = ?').run(guildId);
    database.db.prepare('DELETE FROM disabled_commands WHERE guild_id = ?').run(guildId);
    database.db.prepare('DELETE FROM guilds WHERE id = ?').run(guildId);
}

function makeUser(id, { bot = false } = {}) {
    return {
        id,
        bot,
        tag: `user-${id}#0001`,
        displayAvatarURL: () => 'https://example.invalid/avatar.png'
    };
}

function makeMember(user, {
    position = 1,
    bannable = true,
    kickable = true,
    moderatable = true
} = {}) {
    const member = {
        id: user.id,
        user,
        roles: { highest: { position } },
        bannable,
        kickable,
        moderatable,
        sent: [],
        banCalls: [],
        kickCalls: [],
        timeoutCalls: [],
        send: async (payload) => { member.sent.push(payload); }
    };

    member.ban = async (payload) => { member.banCalls.push(payload); };
    member.kick = async (payload) => { member.kickCalls.push(payload); };
    member.timeout = async (duration, reason) => { member.timeoutCalls.push({ duration, reason }); };
    return member;
}

function makeActor(user, { position = 50, administrator = true, roleIds = [] } = {}) {
    const roles = new Collection(roleIds.map(id => [id, { id }]));
    return {
        id: user.id,
        user,
        roles: { cache: roles, highest: { position } },
        permissions: {
            has: permission => administrator && permission === PermissionFlagsBits.Administrator
        }
    };
}

function makeInteraction(command, {
    target,
    targetMember,
    actor,
    guildId = unique('guild'),
    channelId = unique('channel'),
    options = {}
} = {}) {
    const replies = [];
    return {
        commandName: command.data.name,
        guild: {
            id: guildId,
            name: 'Test Guild',
            members: { fetch: async () => targetMember },
            channels: { fetch: async () => null }
        },
        channel: { id: channelId },
        member: actor,
        user: actor.user,
        client: { user: { id: BOT_ID } },
        options: {
            getUser: name => {
                if (name === 'user') return options.user ?? target;
                if (name === 'target') return target;
                return null;
            },
            getString: name => options[name] ?? null,
            getInteger: name => options[name] ?? null,
            getBoolean: name => options[name] ?? null,
            getAttachment: name => options[name] ?? null,
            getSubcommand: () => options.subcommand ?? null
        },
        replied: false,
        deferred: false,
        replies,
        isChatInputCommand: () => true,
        isAutocomplete: () => false,
        isButton: () => false,
        isStringSelectMenu: () => false,
        isModalSubmit: () => false,
        async reply(payload) {
            this.replied = true;
            this.replies.push(payload);
            return payload;
        },
        async deferReply() {
            this.deferred = true;
        },
        async followUp(payload) {
            this.replies.push(payload);
            return payload;
        },
        async editReply(payload) {
            this.replies.push(payload);
            return payload;
        }
    };
}

function replyDescription(interaction) {
    return interaction.replies.at(-1)?.embeds?.[0]?.data?.description || '';
}

function replyTitle(interaction) {
    return interaction.replies.at(-1)?.embeds?.[0]?.data?.title || '';
}

const moderationCommands = [
    {
        command: ban,
        label: 'ban',
        actionCalls: member => member.banCalls,
        selfMessage: 'You cannot ban yourself.',
        botMessage: 'I cannot ban myself.',
        hierarchyMessage: 'You cannot ban this user. They have equal or higher role than you.',
        successTitle: 'Member Banned',
        options: { days: 2, reason: 'rule 1' }
    },
    {
        command: kick,
        label: 'kick',
        actionCalls: member => member.kickCalls,
        selfMessage: 'You cannot kick yourself.',
        botMessage: 'I cannot kick myself.',
        hierarchyMessage: 'You cannot kick this user. They have equal or higher role than you.',
        successTitle: 'Member Kicked',
        options: { reason: 'spam' }
    },
    {
        command: timeout,
        label: 'timeout',
        actionCalls: member => member.timeoutCalls,
        selfMessage: 'You cannot timeout yourself.',
        botMessage: 'I cannot timeout myself.',
        hierarchyMessage: 'You cannot timeout this user. They have equal or higher role than you.',
        successTitle: 'Member Timed Out',
        options: { duration: 30, reason: 'cool down' }
    },
    {
        command: warn,
        label: 'warn',
        actionCalls: () => null,
        selfMessage: 'You cannot warn yourself.',
        botMessage: 'You cannot warn a bot.',
        hierarchyMessage: 'You cannot warn this user. They have equal or higher role than you.',
        successTitle: 'Member Warned',
        options: { reason: 'warning' }
    }
];

test('moderation commands declare least-privilege default permissions', () => {
    assert.equal(ban.data.default_member_permissions, String(PermissionFlagsBits.BanMembers));
    assert.equal(kick.data.default_member_permissions, String(PermissionFlagsBits.KickMembers));
    assert.equal(timeout.data.default_member_permissions, String(PermissionFlagsBits.ModerateMembers));
    assert.equal(warn.data.default_member_permissions, String(PermissionFlagsBits.ModerateMembers));
    assert.equal(warningsCommand.data.default_member_permissions, String(PermissionFlagsBits.ModerateMembers));
    assert.deepEqual(warningsCommand.data.options.map(option => option.name), ['list', 'remove', 'clear']);
    assert.equal(configCommand.data.default_member_permissions, String(PermissionFlagsBits.Administrator));
    assert.deepEqual(configCommand.data.options.map(option => option.name), ['export', 'import']);
});

for (const testCase of moderationCommands) {
    test(`${testCase.label}: rejects a target that is not in the guild`, async () => {
        const actorUser = makeUser(unique('mod'));
        const actor = makeActor(actorUser);
        const target = makeUser(unique('target'));
        const interaction = makeInteraction(testCase.command, {
            target,
            targetMember: null,
            actor,
            options: testCase.options
        });

        await testCase.command.execute(interaction);

        assert.match(replyDescription(interaction), /User not found in this server/);
        assert.equal(interaction.replies.length, 1);
        assert.equal(database.getWarnings.all(interaction.guild.id, target.id).length, 0);
    });

    test(`${testCase.label}: rejects self-targeting`, async () => {
        const actorUser = makeUser(unique('mod'));
        const actor = makeActor(actorUser);
        const targetMember = makeMember(actorUser, { position: 1 });
        const interaction = makeInteraction(testCase.command, {
            target: actorUser,
            targetMember,
            actor,
            options: testCase.options
        });

        await testCase.command.execute(interaction);

        assert.equal(replyDescription(interaction), testCase.selfMessage);
        assert.deepEqual(testCase.actionCalls(targetMember) || [], []);
        assert.equal(database.getWarnings.all(interaction.guild.id, actorUser.id).length, 0);
    });

    test(`${testCase.label}: rejects targeting the bot`, async () => {
        const actorUser = makeUser(unique('mod'));
        const actor = makeActor(actorUser);
        const target = makeUser(BOT_ID, { bot: true });
        const targetMember = makeMember(target, { position: 1 });
        const interaction = makeInteraction(testCase.command, {
            target,
            targetMember,
            actor,
            options: testCase.options
        });

        await testCase.command.execute(interaction);

        assert.equal(replyDescription(interaction), testCase.botMessage);
        assert.deepEqual(testCase.actionCalls(targetMember) || [], []);
        assert.equal(database.getWarnings.all(interaction.guild.id, target.id).length, 0);
    });

    test(`${testCase.label}: rejects an equal-or-higher role`, async () => {
        const actorUser = makeUser(unique('mod'));
        const actor = makeActor(actorUser, { position: 5 });
        const target = makeUser(unique('target'));
        const targetMember = makeMember(target, { position: 5 });
        const interaction = makeInteraction(testCase.command, {
            target,
            targetMember,
            actor,
            options: testCase.options
        });

        await testCase.command.execute(interaction);

        assert.equal(replyDescription(interaction), testCase.hierarchyMessage);
        assert.deepEqual(testCase.actionCalls(targetMember) || [], []);
        assert.equal(database.getWarnings.all(interaction.guild.id, target.id).length, 0);
    });

    test(`${testCase.label}: completes the successful path`, async () => {
        const actorUser = makeUser(unique('mod'));
        const actor = makeActor(actorUser, { position: 50 });
        const target = makeUser(unique('target'));
        const targetMember = makeMember(target, { position: 1 });
        const interaction = makeInteraction(testCase.command, {
            target,
            targetMember,
            actor,
            options: testCase.options
        });

        await testCase.command.execute(interaction);

        assert.equal(replyTitle(interaction), testCase.successTitle);
        assert.equal(targetMember.sent.length, 1);
        assert.equal(interaction.replies.length, 1);
        if (testCase.label !== 'warn') {
            assert.equal(testCase.actionCalls(targetMember).length, 1);
        } else {
            const rows = database.getWarnings.all(interaction.guild.id, target.id);
            assert.equal(rows.length, 1);
            assert.equal(rows[0].moderator_id, actorUser.id);
            assert.equal(rows[0].reason, testCase.options.reason);
            database.clearWarnings.run(interaction.guild.id, target.id);
        }
    });
}

test('warnings list shows only the current guild and user rows', async () => {
    const guildId = unique('guild');
    const otherGuildId = unique('guild');
    const user = makeUser(unique('user'));
    const otherUser = makeUser(unique('user'));
    const moderatorId = unique('mod');
    const now = Date.now();

    database.addWarning.run(guildId, user.id, moderatorId, 'first warning', now - 2000);
    database.addWarning.run(guildId, user.id, moderatorId, 'second warning', now - 1000);
    database.addWarning.run(otherGuildId, user.id, moderatorId, 'other guild', now);
    database.addWarning.run(guildId, otherUser.id, moderatorId, 'other user', now);

    const interaction = makeInteraction(warningsCommand, {
        target: user,
        actor: makeActor(makeUser(unique('mod'))),
        guildId,
        options: { subcommand: 'list', user }
    });

    try {
        await warningsCommand.execute(interaction);

        assert.match(replyDescription(interaction), /2\*\* warnings for/);
        const fields = interaction.replies[0].embeds[0].data.fields;
        assert.equal(fields.length, 2);
        assert.match(fields[0].value, /second warning/);
        assert.match(fields[1].value, /first warning/);
    } finally {
        database.clearWarnings.run(guildId, user.id);
        database.clearWarnings.run(otherGuildId, user.id);
        database.clearWarnings.run(guildId, otherUser.id);
    }
});

test('warnings list reports an empty history', async () => {
    const user = makeUser(unique('user'));
    const interaction = makeInteraction(warningsCommand, {
        target: user,
        actor: makeActor(makeUser(unique('mod'))),
        options: { subcommand: 'list', user }
    });

    await warningsCommand.execute(interaction);

    assert.match(replyDescription(interaction), /No warnings found/);
    assert.equal(interaction.replies[0].ephemeral, true);
});

test('warnings remove deletes only a matching guild and user warning', async () => {
    const guildId = unique('guild');
    const otherGuildId = unique('guild');
    const user = makeUser(unique('user'));
    const otherUser = makeUser(unique('user'));
    const moderatorId = unique('mod');
    const now = Date.now();

    const currentId = Number(database.addWarning.run(guildId, user.id, moderatorId, 'current', now).lastInsertRowid);
    const otherGuildIdWarning = Number(database.addWarning.run(otherGuildId, user.id, moderatorId, 'other guild', now).lastInsertRowid);
    const otherUserId = Number(database.addWarning.run(guildId, otherUser.id, moderatorId, 'other user', now).lastInsertRowid);

    try {
        const wrongTarget = makeInteraction(warningsCommand, {
            target: user,
            actor: makeActor(makeUser(unique('mod'))),
            guildId,
            options: { subcommand: 'remove', user, id: otherGuildIdWarning }
        });

        await warningsCommand.execute(wrongTarget);

        assert.match(replyDescription(wrongTarget), /not found/);
        assert.equal(database.getWarnings.all(guildId, user.id).length, 1);
        assert.equal(database.getWarnings.all(otherGuildId, user.id).length, 1);

        const interaction = makeInteraction(warningsCommand, {
            target: user,
            actor: makeActor(makeUser(unique('mod'))),
            guildId,
            options: { subcommand: 'remove', user, id: currentId }
        });

        await warningsCommand.execute(interaction);

        assert.match(replyDescription(interaction), new RegExp(`Removed warning #${currentId}`));
        assert.equal(database.getWarnings.all(guildId, user.id).length, 0);
        assert.equal(database.getWarnings.all(otherGuildId, user.id).length, 1);
        assert.equal(database.getWarnings.all(guildId, otherUser.id).length, 1);
        assert.equal(database.getWarnings.all(guildId, otherUser.id)[0].id, otherUserId);
    } finally {
        database.clearWarnings.run(guildId, user.id);
        database.clearWarnings.run(otherGuildId, user.id);
        database.clearWarnings.run(guildId, otherUser.id);
    }
});

test('warnings clear clears only the current guild and user rows', async () => {
    const guildId = unique('guild');
    const otherGuildId = unique('guild');
    const user = makeUser(unique('user'));
    const moderatorId = unique('mod');
    const now = Date.now();

    database.addWarning.run(guildId, user.id, moderatorId, 'first', now - 1000);
    database.addWarning.run(guildId, user.id, moderatorId, 'second', now);
    database.addWarning.run(otherGuildId, user.id, moderatorId, 'other guild', now);

    const interaction = makeInteraction(warningsCommand, {
        target: user,
        actor: makeActor(makeUser(unique('mod'))),
        guildId,
        options: { subcommand: 'clear', user }
    });

    try {
        await warningsCommand.execute(interaction);

        assert.match(replyDescription(interaction), /Cleared \*\*2\*\* warnings/);
        assert.equal(database.getWarnings.all(guildId, user.id).length, 0);
        assert.equal(database.getWarnings.all(otherGuildId, user.id).length, 1);
    } finally {
        database.clearWarnings.run(guildId, user.id);
        database.clearWarnings.run(otherGuildId, user.id);
    }
});

test('config export produces a versioned, deterministic guild backup', async () => {
    const guildId = unique('guild');
    const roleId = '111111111111111111';
    const channelId = '222222222222222222';

    database.insertGuild.run(guildId);
    database.updateGuildSetting('welcome_channel').run(channelId, guildId);
    database.addCommandPermission.run(guildId, 'ban', roleId, 'allow');
    database.disableCommand.run(guildId, 'meme', null);
    database.disableCommand.run(guildId, 'meme', null);

    const interaction = makeInteraction(configCommand, {
        actor: makeActor(makeUser(unique('mod'))),
        guildId,
        options: { subcommand: 'export' }
    });

    try {
        await configCommand.execute(interaction);

        const file = interaction.replies[0].files[0];
        const payload = JSON.parse(file.attachment.toString('utf8'));
        assert.equal(file.name, `stribog-config-${guildId}.json`);
        assert.equal(payload.schema_version, 1);
        assert.equal(payload.guild_id, guildId);
        assert.equal(payload.settings.welcome_channel, channelId);
        assert.deepEqual(payload.command_permissions, [{
            command_name: 'ban',
            role_id: roleId,
            permission_type: 'allow'
        }]);
        assert.deepEqual(payload.disabled_commands, [{ command_name: 'meme', channel_id: null }]);
        assert.equal(JSON.stringify(payload).includes('TOKEN'), false);
    } finally {
        deleteGuildConfig(guildId);
    }
});

test('config import dry-runs by default and applies only after confirmation', async () => {
    const guildId = unique('guild');
    const oldChannelId = '333333333333333333';
    const newChannelId = '444444444444444444';
    const roleId = '555555555555555555';
    const payload = {
        schema_version: 1,
        guild_id: guildId,
        settings: {
            welcome_channel: newChannelId,
            leveling_enabled: 0
        },
        command_permissions: [{
            command_name: 'ping',
            role_id: roleId,
            permission_type: 'allow'
        }],
        disabled_commands: [{ command_name: 'meme', channel_id: null }]
    };
    const originalFetch = global.fetch;
    global.fetch = async () => ({
        ok: true,
        text: async () => JSON.stringify(payload)
    });

    database.insertGuild.run(guildId);
    database.updateGuildSetting('welcome_channel').run(oldChannelId, guildId);

    try {
        const dryRun = makeInteraction(configCommand, {
            actor: makeActor(makeUser(unique('mod'))),
            guildId,
            options: {
                subcommand: 'import',
                file: { size: 512, url: 'https://example.invalid/config.json' },
                confirm: false
            }
        });

        await configCommand.execute(dryRun);

        assert.match(replyTitle(dryRun), /Import Dry Run/);
        assert.equal(database.getGuild.get(guildId).welcome_channel, oldChannelId);
        assert.equal(database.getCommandPermissions.all(guildId, 'ping').length, 0);

        const confirmed = makeInteraction(configCommand, {
            actor: makeActor(makeUser(unique('mod'))),
            guildId,
            options: {
                subcommand: 'import',
                file: { size: 512, url: 'https://example.invalid/config.json' },
                confirm: true
            }
        });

        await configCommand.execute(confirmed);

        assert.match(replyTitle(confirmed), /Configuration Imported/);
        assert.equal(database.getGuild.get(guildId).welcome_channel, newChannelId);
        assert.equal(database.getGuild.get(guildId).leveling_enabled, 0);
        assert.equal(database.getCommandPermissions.all(guildId, 'ping').length, 1);
        assert.equal(database.isCommandDisabled.get(guildId, 'meme', '999').command_name, 'meme');
    } finally {
        global.fetch = originalFetch;
        deleteGuildConfig(guildId);
    }
});

test('config import rejects other guilds and unknown settings', async () => {
    const guildId = unique('guild');
    const otherGuildId = unique('guild');
    let payload = {
        schema_version: 1,
        guild_id: otherGuildId,
        settings: {},
        command_permissions: [],
        disabled_commands: []
    };
    const originalFetch = global.fetch;
    const originalError = console.error;
    global.fetch = async () => ({
        ok: true,
        text: async () => JSON.stringify(payload)
    });
    console.error = () => {};

    try {
        const wrongGuild = makeInteraction(configCommand, {
            actor: makeActor(makeUser(unique('mod'))),
            guildId,
            options: {
                subcommand: 'import',
                file: { size: 512, url: 'https://example.invalid/config.json' },
                confirm: true
            }
        });

        await configCommand.execute(wrongGuild);
        assert.match(replyDescription(wrongGuild), /different guild/);

        payload = {
            schema_version: 1,
            guild_id: guildId,
            settings: { not_a_setting: 'x' },
            command_permissions: [],
            disabled_commands: []
        };
        const unknownSetting = makeInteraction(configCommand, {
            actor: makeActor(makeUser(unique('mod'))),
            guildId,
            options: {
                subcommand: 'import',
                file: { size: 512, url: 'https://example.invalid/config.json' },
                confirm: true
            }
        });

        await configCommand.execute(unknownSetting);
        assert.match(replyDescription(unknownSetting), /Unknown guild setting/);
    } finally {
        global.fetch = originalFetch;
        console.error = originalError;
        deleteGuildConfig(guildId);
    }
});

test('config import rolls back settings and rules when a write fails', () => {
    const guildId = unique('guild');
    const oldChannelId = '666666666666666666';
    const newChannelId = '777777777777777777';
    const oldRoleId = '888888888888888888';
    const newRoleId = '999999999999999999';

    database.insertGuild.run(guildId);
    database.updateGuildSetting('welcome_channel').run(oldChannelId, guildId);
    database.addCommandPermission.run(guildId, 'ban', oldRoleId, 'allow');

    const payload = {
        schema_version: 1,
        guild_id: guildId,
        settings: { welcome_channel: newChannelId },
        command_permissions: [{
            command_name: 'ping',
            role_id: newRoleId,
            permission_type: 'allow'
        }],
        disabled_commands: []
    };

    database.db.exec('DROP TRIGGER IF EXISTS fail_config_import');
    database.db.exec(`
        CREATE TRIGGER fail_config_import
        BEFORE INSERT ON command_permissions
        WHEN NEW.guild_id = '${guildId}'
        BEGIN
            SELECT RAISE(ABORT, 'forced config failure');
        END
    `);

    try {
        assert.throws(() => applyGuildConfig(guildId, payload), /forced config failure/);
        assert.equal(database.getGuild.get(guildId).welcome_channel, oldChannelId);
        const permissions = database.getCommandPermissions.all(guildId, 'ban');
        assert.equal(permissions.length, 1);
        assert.equal(permissions[0].role_id, oldRoleId);
    } finally {
        database.db.exec('DROP TRIGGER IF EXISTS fail_config_import');
        deleteGuildConfig(guildId);
    }
});

test('dispatcher blocks a member without an allowed role', async () => {
    const commandName = unique('permission-test');
    const guildId = unique('guild');
    const allowedRoleId = unique('allowed-role');
    const command = {
        data: { name: commandName },
        cooldown: 1,
        execute: async () => { throw new Error('command should not run'); }
    };
    const client = {
        commands: new Collection([[commandName, command]]),
        cooldowns: new Collection()
    };
    const actor = makeActor(makeUser(unique('mod')), {
        administrator: false,
        roleIds: [unique('other-role')]
    });
    const interaction = makeInteraction(command, { actor, guildId, channelId: unique('channel') });

    database.addCommandPermission.run(guildId, commandName, allowedRoleId, 'allow');

    try {
        await interactionCreate.execute(interaction, client);
    } finally {
        database.clearCommandPermissions.run(guildId, commandName);
    }

    assert.match(replyDescription(interaction), /do not have permission/);
    assert.equal(interaction.replies.length, 1);
});

test('dispatcher blocks a command disabled in the channel', async () => {
    const commandName = unique('disabled-test');
    const guildId = unique('guild');
    const channelId = unique('channel');
    const command = {
        data: { name: commandName },
        cooldown: 1,
        execute: async () => { throw new Error('command should not run'); }
    };
    const client = {
        commands: new Collection([[commandName, command]]),
        cooldowns: new Collection()
    };
    const interaction = makeInteraction(command, {
        actor: makeActor(makeUser(unique('mod')), { administrator: false }),
        guildId,
        channelId
    });

    database.disableCommand.run(guildId, commandName, channelId);

    try {
        await interactionCreate.execute(interaction, client);
    } finally {
        database.enableCommand.run(guildId, commandName, channelId);
    }

    assert.match(replyDescription(interaction), /disabled/);
    assert.equal(interaction.replies.length, 1);
});

test('dispatcher enforces the per-user command cooldown', async () => {
    const userId = unique('mod');
    let executions = 0;
    const command = {
        data: { name: unique('cooldown-test') },
        cooldown: 1,
        execute: async () => { executions += 1; }
    };
    const client = {
        commands: new Collection([[command.data.name, command]]),
        cooldowns: new Collection()
    };
    const actor = makeActor(makeUser(userId), { administrator: true });

    const first = makeInteraction(command, { actor, guildId: unique('guild') });
    const second = makeInteraction(command, { actor, guildId: unique('guild') });

    await interactionCreate.execute(first, client);
    await interactionCreate.execute(second, client);

    assert.equal(executions, 1);
    assert.match(second.replies[0].content, /Please wait .* before using/);
});

test('warning rows persist in SQLite and are scoped by guild and user', () => {
    const guildId = unique('guild');
    const otherGuildId = unique('guild');
    const userId = unique('user');
    const moderatorId = unique('mod');
    const timestamp = Date.now();

    database.addWarning.run(guildId, userId, moderatorId, 'first warning', timestamp);

    try {
        const rows = database.getWarnings.all(guildId, userId);
        assert.equal(rows.length, 1);
        assert.equal(rows[0].guild_id, guildId);
        assert.equal(rows[0].user_id, userId);
        assert.equal(rows[0].moderator_id, moderatorId);
        assert.equal(rows[0].reason, 'first warning');
        assert.equal(rows[0].timestamp, timestamp);
        assert.equal(database.getWarnings.all(otherGuildId, userId).length, 0);
        assert.equal(database.getWarnings.all(guildId, unique('user')).length, 0);
    } finally {
        database.clearWarnings.run(guildId, userId);
        database.clearWarnings.run(otherGuildId, userId);
    }

    assert.equal(database.getWarnings.all(guildId, userId).length, 0);
});
