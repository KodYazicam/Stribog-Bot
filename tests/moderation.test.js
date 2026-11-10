const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Collection, PermissionFlagsBits } = require('discord.js');

const ban = require('../src/commands/moderation/ban');
const kick = require('../src/commands/moderation/kick');
const timeout = require('../src/commands/moderation/timeout');
const warn = require('../src/commands/moderation/warn');
const interactionCreate = require('../src/events/interactionCreate');
const database = require('../src/utils/database');

const BOT_ID = '900000000000000001';
let sequence = 0;

function unique(prefix) {
    sequence += 1;
    return `${prefix}-${process.pid}-${Date.now()}-${sequence}`;
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
            getUser: name => name === 'target' ? target : null,
            getString: name => options[name] ?? null,
            getInteger: name => options[name] ?? null
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
        }
    });
}

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
