const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Collection } = require('discord.js');

const database = require('../src/utils/database');
const messageCreate = require('../src/events/messageCreate');
const { stripPrefixInvocation } = require('../src/utils/prefix');
const eightBall = require('../src/commands/fun/8ball');

eightBall.category = 'fun';

let sequence = 0;

function unique(prefix) {
    sequence += 1;
    return `${prefix}-${process.pid}-${Date.now()}-${sequence}`;
}

function makeUser(id = unique('user')) {
    return {
        id,
        bot: false,
        username: `user-${id}`,
        tag: `user-${id}#0001`,
        displayAvatarURL: () => 'https://example.invalid/avatar.png',
        toString: () => `<@${id}>`
    };
}

function makeMember(user) {
    return {
        id: user.id,
        user,
        permissions: { has: () => false }
    };
}

function makeChannel({ id = unique('channel'), name = 'general' } = {}) {
    const sent = [];
    return {
        id,
        name,
        sent,
        async send(payload) {
            sent.push(payload);
            return { id: unique('sent'), async delete() {} };
        },
        messages: {
            fetch: async () => new Collection()
        }
    };
}

function makeGuild(source, modlog) {
    const channels = new Collection([
        [source.id, source],
        [modlog.id, modlog]
    ]);
    return {
        id: unique('guild'),
        name: 'Test Guild',
        channels: {
            cache: channels,
            fetch: async channelId => channels.get(channelId) || null
        },
        roles: {
            cache: new Collection(),
            fetch: async () => null
        }
    };
}

function configureGuild(guild, modlog, settings) {
    database.insertGuild.run(guild.id);
    database.updateGuildSetting('mod_log_channel').run(modlog.id, guild.id);
    for (const [key, value] of Object.entries(settings)) {
        database.updateGuildSetting(key).run(value, guild.id);
    }
}

function makeMessage({ guild, channel, user, member, content }) {
    const replies = [];
    return {
        id: unique('message'),
        content,
        author: user,
        member,
        guild,
        channel,
        mentions: { users: new Collection(), roles: new Collection() },
        attachments: new Collection(),
        replies,
        deleted: false,
        async reply(payload) {
            replies.push(payload);
            return { id: unique('reply'), async delete() {} };
        },
        async delete() {
            this.deleted = true;
        }
    };
}

function makeClient() {
    return {
        commands: new Collection([['8ball', eightBall]]),
        cooldowns: new Collection(),
        users: { fetch: async id => makeUser(id) },
        channels: { fetch: async () => null },
        guilds: { cache: new Collection() },
        user: makeUser('bot')
    };
}

function cleanup(guildId) {
    database.db.prepare('DELETE FROM guilds WHERE id = ?').run(guildId);
    for (const table of ['user_guild_data', 'warnings', 'disabled_commands', 'command_permissions']) {
        database.db.prepare(`DELETE FROM ${table} WHERE guild_id = ?`).run(guildId);
    }
}

test('stripPrefixInvocation drops the invocation token and keeps the arguments', () => {
    assert.equal(stripPrefixInvocation('!8ball https://grabify.example/x'), 'https://grabify.example/x');
    assert.equal(stripPrefixInvocation('!8ball   spaced out  '), 'spaced out');
    assert.equal(stripPrefixInvocation('!8ball'), '');
    assert.equal(stripPrefixInvocation('just a sentence'), 'just a sentence');
    assert.equal(stripPrefixInvocation(''), '');
    assert.equal(stripPrefixInvocation('?8ball https://example.test', '?'), 'https://example.test');
    assert.equal(stripPrefixInvocation(undefined), '');
});

test('a blocked link behind an enabled prefix command is still moderated', async () => {
    const source = makeChannel({ name: 'general' });
    const modlog = makeChannel({ name: 'mod-log' });
    const guild = makeGuild(source, modlog);
    const user = makeUser();
    const member = makeMember(user);

    try {
        configureGuild(guild, modlog, { automod_antilink: 1, automod_whitelist: '[]' });
        const message = makeMessage({
            guild,
            channel: source,
            user,
            member,
            content: '!8ball https://grabify.example/track'
        });

        await messageCreate.execute(message, makeClient());

        assert.equal(message.replies.length, 1, 'the command must still answer');
        assert.equal(message.deleted, true, 'the message carrying the blocked link must be deleted');
        assert.equal(modlog.sent.length, 1, 'the anti-link action must be audited');
        const embed = modlog.sent[0].embeds[0].data;
        assert.match(embed.title, /Anti-Link/);
        assert.equal(JSON.stringify(embed).includes('grabify.example'), false);
    } finally {
        cleanup(guild.id);
    }
});

test('a badword in command arguments is caught while the command name is not', async () => {
    const source = makeChannel({ name: 'general' });
    const modlog = makeChannel({ name: 'mod-log' });
    const guild = makeGuild(source, modlog);
    const user = makeUser();
    const member = makeMember(user);

    try {
        configureGuild(guild, modlog, {
            automod_badwords: 1,
            automod_wordlist: JSON.stringify(['hackme', '8ball'])
        });

        const clean = makeMessage({
            guild,
            channel: source,
            user,
            member,
            content: '!8ball will it rain'
        });
        await messageCreate.execute(clean, makeClient());
        assert.equal(clean.deleted, false, 'the invocation name must not match the filter');

        const dirty = makeMessage({
            guild,
            channel: source,
            user,
            member,
            content: '!8ball hackme please'
        });
        await messageCreate.execute(dirty, makeClient());
        assert.equal(dirty.deleted, true, 'a prohibited word in the argument must be moderated');
    } finally {
        cleanup(guild.id);
    }
});

test('a message without a prefix command keeps the existing filter behaviour', async () => {
    const source = makeChannel({ name: 'general' });
    const modlog = makeChannel({ name: 'mod-log' });
    const guild = makeGuild(source, modlog);
    const user = makeUser();
    const member = makeMember(user);

    try {
        configureGuild(guild, modlog, { automod_antilink: 1, automod_whitelist: '[]' });
        const message = makeMessage({
            guild,
            channel: source,
            user,
            member,
            content: 'please visit https://grabify.example/track'
        });

        await messageCreate.execute(message, makeClient());

        assert.equal(message.deleted, true);
        assert.equal(modlog.sent.length, 1);
    } finally {
        cleanup(guild.id);
    }
});
