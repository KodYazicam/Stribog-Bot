const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Collection } = require('discord.js');

require('./helpers/test-db');
const database = require('../src/utils/database');
const { handleAutoMod } = require('../src/events/messageCreate');
const { normalizeHostname, matchesWhitelistedHostname, extractLinkHostnames } = require('../src/utils/domains');
const automodCommand = require('../src/commands/admin/automod');

let sequence = 0;

function unique(prefix) {
    sequence += 1;
    return `${prefix}-${process.pid}-${Date.now()}-${sequence}`;
}

function makeUser(id = unique('user')) {
    return {
        id,
        tag: `user-${id}#0001`,
        username: `user-${id}`,
        bot: false,
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
    const channel = {
        id,
        name,
        sent,
        async send(payload) {
            sent.push(payload);
            return { async delete() {} };
        }
    };
    return channel;
}

function makeGuild({ source, modlog }) {
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
        }
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
        deleted: false,
        async delete() {
            this.deleted = true;
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

function cleanup(guildId) {
    database.db.prepare('DELETE FROM guilds WHERE id = ?').run(guildId);
}

function makeInteraction(guildId, domain) {
    const replies = [];
    return {
        guild: { id: guildId },
        user: makeUser(),
        replies,
        options: {
            getSubcommand: () => 'whitelist',
            getString: () => domain
        },
        async reply(payload) {
            replies.push(payload);
            return payload;
        }
    };
}

function storedWhitelist(guildId) {
    return JSON.parse(database.getGuild.get(guildId).automod_whitelist || '[]');
}

for (const [label, host, entry, blocked] of [
    ['exact host', 'https://youtube.com/watch?v=1', 'youtube.com', false],
    ['explicit subdomain', 'https://www.youtube.com/watch?v=1', 'youtube.com', false],
    ['lookalike prefix', 'https://youtube.com.evil.example/phish', 'youtube.com', true],
    ['lookalike suffix', 'https://notyoutube.com/phish', 'youtube.com', true],
    ['unlisted host', 'https://evil.example/phish', 'youtube.com', true]
]) {
    test(`antilink whitelist: ${label}`, async () => {
        const source = makeChannel();
        const modlog = makeChannel({ name: 'mod-log' });
        const guild = makeGuild({ source, modlog });
        const user = makeUser();
        const member = makeMember(user);

        try {
            configureGuild(guild, modlog, {
                automod_antilink: 1,
                automod_whitelist: JSON.stringify([entry])
            });
            const message = makeMessage({ guild, channel: source, user, member, content: host });
            await handleAutoMod(message);

            assert.equal(message.deleted, blocked);
            assert.equal(modlog.sent.length, blocked ? 1 : 0);
        } finally {
            cleanup(guild.id);
        }
    });
}

test('normalizeHostname reduces URLs and strips ports and trailing dots', () => {
    assert.equal(normalizeHostname('https://YouTube.com:443/watch?v=1'), 'youtube.com');
    assert.equal(normalizeHostname('youtube.com.'), 'youtube.com');
    assert.equal(normalizeHostname('  sub.youtube.com/path  '), 'sub.youtube.com');
    assert.equal(normalizeHostname('not a domain'), null);
    assert.equal(normalizeHostname(''), null);
    assert.equal(normalizeHostname(null), null);
});

test('matchesWhitelistedHostname ignores malformed whitelist entries', () => {
    assert.equal(matchesWhitelistedHostname('youtube.com', ['not a domain', 'youtube.com']), true);
    assert.equal(matchesWhitelistedHostname('evil.youtube.com', ['youtube.com']), true);
    assert.equal(matchesWhitelistedHostname('youtube.com.evil.example', ['youtube.com']), false);
    assert.equal(matchesWhitelistedHostname('youtube.com', []), false);
    assert.equal(matchesWhitelistedHostname('youtube.com', 'youtube.com'), false);
});

test('whitelist command stores a normalized bare hostname', async () => {
    const guildId = unique('guild');
    database.insertGuild.run(guildId);

    try {
        const interaction = makeInteraction(guildId, 'https://YouTube.com:443/watch?v=1');
        await automodCommand.execute(interaction);

        assert.deepEqual(storedWhitelist(guildId), ['youtube.com']);
        assert.match(interaction.replies[0].embeds[0].data.description, /Added \*\*youtube\.com\*\*/);
    } finally {
        cleanup(guildId);
    }
});

test('whitelist command rejects a value that is not a bare hostname', async () => {
    const guildId = unique('guild');
    database.insertGuild.run(guildId);

    try {
        const interaction = makeInteraction(guildId, 'not a domain');
        await automodCommand.execute(interaction);

        assert.deepEqual(storedWhitelist(guildId), []);
        assert.match(interaction.replies[0].embeds[0].data.description, /bare hostname/);
        assert.equal(interaction.replies[0].ephemeral, true);
    } finally {
        cleanup(guildId);
    }
});

test('whitelist command removes a previously stored entry', async () => {
    const guildId = unique('guild');
    database.insertGuild.run(guildId);

    try {
        database.updateGuildSetting('automod_whitelist').run(JSON.stringify(['YouTube.com']), guildId);
        const interaction = makeInteraction(guildId, 'youtube.com');
        await automodCommand.execute(interaction);

        assert.deepEqual(storedWhitelist(guildId), []);
        assert.match(interaction.replies[0].embeds[0].data.description, /Removed \*\*youtube\.com\*\*/);
    } finally {
        cleanup(guildId);
    }
});

async function runAntilink({ content, whitelist = [], settings = {} }) {
    const source = makeChannel();
    const modlog = makeChannel({ name: 'mod-log' });
    const guild = makeGuild({ source, modlog });
    const user = makeUser();
    const member = makeMember(user);

    configureGuild(guild, modlog, {
        automod_antilink: 1,
        automod_whitelist: JSON.stringify(whitelist),
        ...settings
    });

    const message = makeMessage({ guild, channel: source, user, member, content });

    try {
        await handleAutoMod(message);
        return { message, modlog, guild };
    } finally {
        cleanup(guild.id);
    }
}

test('antilink deletes a scheme-less invite link Discord renders as clickable', async () => {
    const { message, modlog } = await runAntilink({ content: 'join discord.gg/abc123 now' });

    assert.equal(message.deleted, true);
    assert.equal(modlog.sent.length, 1);
});

test('antilink deletes a scheme-less www host with a path', async () => {
    const { message, modlog } = await runAntilink({ content: 'see www.evil.example/phish for free nitro' });

    assert.equal(message.deleted, true);
    assert.equal(modlog.sent.length, 1);
});

test('antilink keeps a whitelisted host written without a scheme', async () => {
    const { message, modlog } = await runAntilink({
        content: 'watch youtube.com/watch?v=1 later',
        whitelist: ['youtube.com']
    });

    assert.equal(message.deleted, false);
    assert.equal(modlog.sent.length, 0);
});

test('antilink leaves prose, file names and e-mail addresses alone', async () => {
    const { message, modlog } = await runAntilink({
        content: 'Node.js 22 ships package.json and README.md; mail user@example.com at 5.30'
    });

    assert.equal(message.deleted, false);
    assert.equal(modlog.sent.length, 0);
});

test('extractLinkHostnames covers scheme and scheme-less links in order', () => {
    assert.deepEqual(
        extractLinkHostnames('https://evil.com/a discord.gg/abc www.other.com/b'),
        ['evil.com', 'discord.gg', 'www.other.com']
    );
    assert.deepEqual(extractLinkHostnames('sub.youtube.com/v'), ['sub.youtube.com']);
    assert.deepEqual(extractLinkHostnames('YouTube.COM/watch?v=1'), ['youtube.com']);
});

test('extractLinkHostnames trims sentence punctuation', () => {
    assert.deepEqual(extractLinkHostnames('(see evil.com).'), ['evil.com']);
});

test('extractLinkHostnames ignores prose, files, e-mail and unknown TLDs', () => {
    assert.deepEqual(
        extractLinkHostnames('Node.js package.json README.md user@example.com 5.30 foo.zzz'),
        []
    );
    assert.deepEqual(extractLinkHostnames(''), []);
    assert.deepEqual(extractLinkHostnames(null), []);
});

test('extractLinkHostnames keeps an unparseable link so it still counts as blocked', () => {
    assert.deepEqual(extractLinkHostnames('https://[bad'), ['']);
});
