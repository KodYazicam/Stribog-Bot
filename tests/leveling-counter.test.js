const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Collection } = require('discord.js');

require('./helpers/test-db');

const database = require('../src/utils/database');
const messageCreate = require('../src/events/messageCreate');
const setxp = require('../src/commands/leveling/setxp');
const { levelFromTotalXp } = require('../src/utils/leveling');

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

function makeChannel() {
    return {
        id: unique('channel'),
        name: 'general',
        async send() {
            return { id: unique('sent'), async delete() {} };
        },
        messages: { fetch: async () => new Collection() }
    };
}

function makeGuild() {
    return {
        id: unique('guild'),
        name: 'Test Guild',
        ownerId: unique('owner'),
        channels: { cache: new Collection(), fetch: async () => null },
        roles: { cache: new Collection(), fetch: async () => null }
    };
}

function makeMessage({ guild, channel, user, member, content }) {
    return {
        id: unique('message'),
        content,
        author: user,
        member,
        guild,
        channel,
        mentions: { users: new Collection(), roles: new Collection() },
        attachments: new Collection(),
        async reply() {
            return { id: unique('reply'), async delete() {} };
        },
        async delete() {}
    };
}

function makeClient() {
    return {
        commands: new Collection(),
        cooldowns: new Collection(),
        users: { fetch: async id => makeUser(id) },
        channels: { fetch: async () => null },
        guilds: { cache: new Collection() },
        user: makeUser('bot')
    };
}

function progress(userId, guildId) {
    return database.db
        .prepare('SELECT xp, level, messages FROM user_guild_data WHERE user_id = ? AND guild_id = ?')
        .get(userId, guildId);
}

function cleanup(guildId) {
    database.db.prepare('DELETE FROM guilds WHERE id = ?').run(guildId);
    database.db.prepare('DELETE FROM user_guild_data WHERE guild_id = ?').run(guildId);
}

test('ordinary messages increment the stored message counter even during the XP cooldown', async () => {
    const guild = makeGuild();
    const channel = makeChannel();
    const user = makeUser();
    const member = makeMember(user);
    const client = makeClient();
    const shared = { guild, channel, user, member };

    try {
        await messageCreate.execute(makeMessage({ ...shared, content: 'first message' }), client);
        const first = progress(user.id, guild.id);

        assert.equal(first.messages, 1, 'the first message must be counted');
        assert.ok(first.xp > 0, 'the first message must grant XP');

        await messageCreate.execute(makeMessage({ ...shared, content: 'second message' }), client);
        const second = progress(user.id, guild.id);

        assert.equal(second.messages, 2, 'messages inside the cooldown are still messages');
        assert.equal(second.xp, first.xp, 'XP must stay gated by the cooldown');
    } finally {
        cleanup(guild.id);
    }
});

test('/setxp updates XP and level without touching the message counter', async () => {
    const guild = makeGuild();
    const user = makeUser();
    const client = makeClient();

    try {
        database.insertUserGuildData.run(user.id, guild.id);
        database.db
            .prepare('UPDATE user_guild_data SET messages = ? WHERE user_id = ? AND guild_id = ?')
            .run(7, user.id, guild.id);

        const interaction = {
            guild,
            user,
            options: {
                getUser: () => user,
                getInteger: () => 1000
            },
            async reply() {
                return { id: unique('reply') };
            }
        };

        await setxp.execute(interaction, client);
        const updated = progress(user.id, guild.id);

        assert.equal(updated.xp, 1000);
        assert.equal(updated.level, levelFromTotalXp(1000));
        assert.equal(updated.messages, 7, '/setxp must not count as a sent message');
    } finally {
        cleanup(guild.id);
    }
});
