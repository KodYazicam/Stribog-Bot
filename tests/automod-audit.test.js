const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Collection } = require('discord.js');

const database = require('../src/utils/database');
const { handleAutoMod } = require('../src/events/messageCreate');

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
    const timeouts = [];
    return {
        id: user.id,
        user,
        permissions: { has: () => false },
        timeouts,
        async timeout(duration, reason) {
            timeouts.push({ duration, reason });
        }
    };
}

function makeChannel({ id = unique('channel'), name = 'general', sendFails = false } = {}) {
    const sent = [];
    const bulkDeleted = [];
    const channel = {
        id,
        name,
        sent,
        bulkDeleted,
        recentMessages: [],
        async send(payload) {
            if (sendFails) throw new Error('Channel is unavailable.');
            sent.push(payload);
            return { async delete() {} };
        },
        async bulkDelete(messages) {
            bulkDeleted.push(messages);
            return new Collection();
        },
        messages: {
            fetch: async () => new Collection(channel.recentMessages.map(item => [item.id, item]))
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

function configureGuild(guild, modlog, settings) {
    database.insertGuild.run(guild.id);
    database.updateGuildSetting('mod_log_channel').run(modlog.id, guild.id);
    for (const [key, value] of Object.entries(settings)) {
        database.updateGuildSetting(key).run(value, guild.id);
    }
}

function makeMessage({
    guild,
    channel,
    user,
    member,
    content = '',
    userMentions = 0,
    roleMentions = 0,
    deleteFails = false
}) {
    const users = new Collection();
    for (let index = 0; index < userMentions; index += 1) {
        const id = `mention-${index}-${unique('user')}`;
        users.set(id, makeUser(id));
    }
    const roles = new Collection();
    for (let index = 0; index < roleMentions; index += 1) {
        const id = `mention-role-${index}-${unique('role')}`;
        roles.set(id, { id, toString: () => `<@&${id}>` });
    }

    return {
        id: unique('message'),
        content,
        author: user,
        member,
        guild,
        channel,
        mentions: { users, roles },
        deleted: false,
        async delete() {
            if (deleteFails) throw new Error('Channel is unavailable.');
            this.deleted = true;
        }
    };
}

function auditEmbed(modlog) {
    assert.equal(modlog.sent.length, 1);
    return modlog.sent[0].embeds[0].data;
}

function field(embed, name) {
    return embed.fields.find(item => item.name === name)?.value;
}

function cleanup(guildId) {
    database.db.prepare('DELETE FROM guilds WHERE id = ?').run(guildId);
    database.db.prepare('DELETE FROM user_guild_data WHERE guild_id = ?').run(guildId);
    database.db.prepare('DELETE FROM warnings WHERE guild_id = ?').run(guildId);
}

test('antilink writes an audit entry without message content', async () => {
    const source = makeChannel();
    const modlog = makeChannel({ name: 'mod-log' });
    const guild = makeGuild({ source, modlog });
    const user = makeUser();
    const member = makeMember(user);
    const content = 'visit https://evil.example/secret-token now';

    try {
        configureGuild(guild, modlog, { automod_antilink: 1, automod_whitelist: '[]' });
        const message = makeMessage({ guild, channel: source, user, member, content });
        await handleAutoMod(message);

        const embed = auditEmbed(modlog);
        assert.equal(embed.title, 'AutoMod: Anti-Link');
        assert.match(field(embed, 'Rule'), /Anti-Link/);
        assert.match(field(embed, 'Channel'), new RegExp(source.id));
        assert.equal(field(embed, 'Message ID'), message.id);
        assert.match(field(embed, 'Actions'), /Message deleted/);
        assert.match(field(embed, 'Actions'), /Warning posted/);
        assert.equal(field(embed, 'Before'), 'Link message present');
        assert.equal(field(embed, 'After'), 'Link message removed');
        assert.equal(field(embed, 'Metadata'), 'Blocked links: 1');

        const serialized = JSON.stringify(embed);
        assert.equal(serialized.includes('evil.example'), false);
        assert.equal(serialized.includes('secret-token'), false);
        assert.equal(serialized.includes(content), false);
    } finally {
        cleanup(guild.id);
    }
});

test('antispam audits the bulk delete, timeout, and warning', async () => {
    const source = makeChannel();
    const modlog = makeChannel({ name: 'mod-log' });
    const guild = makeGuild({ source, modlog });
    const user = makeUser();
    const member = makeMember(user);
    const messages = [];

    try {
        configureGuild(guild, modlog, { automod_antispam: 1 });
        for (let index = 0; index < 5; index += 1) {
            messages.push(makeMessage({
                guild,
                channel: source,
                user,
                member,
                content: `spam message ${index}`
            }));
        }
        source.recentMessages = messages;

        for (const message of messages) {
            await handleAutoMod(message);
        }

        const embed = auditEmbed(modlog);
        assert.equal(embed.title, 'AutoMod: Anti-Spam');
        assert.match(field(embed, 'Actions'), /Bulk deleted 5 message\(s\)/);
        assert.match(field(embed, 'Actions'), /Member timed out for 60s/);
        assert.match(field(embed, 'Actions'), /Warning posted/);
        assert.match(field(embed, 'Before'), /5 messages in \d+s/);
        assert.match(field(embed, 'After'), /5 recent messages removed/);
        assert.match(field(embed, 'After'), /member timed out for 60s/);
        assert.equal(field(embed, 'Metadata'), 'Messages in window: 5');
        assert.equal(member.timeouts.length, 1);
        assert.equal(member.timeouts[0].duration, 60000);
        assert.equal(JSON.stringify(embed).includes('spam message'), false);
    } finally {
        cleanup(guild.id);
    }
});

test('badwords audits the rule without the matched word', async () => {
    const source = makeChannel();
    const modlog = makeChannel({ name: 'mod-log' });
    const guild = makeGuild({ source, modlog });
    const user = makeUser();
    const member = makeMember(user);
    const content = 'this contains secretword and more';

    try {
        configureGuild(guild, modlog, {
            automod_badwords: 1,
            automod_wordlist: JSON.stringify(['secretword'])
        });
        const message = makeMessage({ guild, channel: source, user, member, content });
        await handleAutoMod(message);

        const embed = auditEmbed(modlog);
        assert.equal(embed.title, 'AutoMod: Bad Words');
        assert.match(field(embed, 'Actions'), /Message deleted/);
        assert.equal(field(embed, 'Before'), 'Message matched a prohibited word');
        assert.equal(field(embed, 'After'), 'Message removed');
        assert.equal(field(embed, 'Metadata'), 'Filter match: prohibited word');
        assert.equal(JSON.stringify(embed).includes('secretword'), false);
    } finally {
        cleanup(guild.id);
    }
});

test('caps audits the uppercase ratio without the message body', async () => {
    const source = makeChannel();
    const modlog = makeChannel({ name: 'mod-log' });
    const guild = makeGuild({ source, modlog });
    const user = makeUser();
    const member = makeMember(user);
    const content = 'THIS IS A VERY LOUD MESSAGE';

    try {
        configureGuild(guild, modlog, { automod_caps: 1 });
        const message = makeMessage({ guild, channel: source, user, member, content });
        await handleAutoMod(message);

        const embed = auditEmbed(modlog);
        assert.equal(embed.title, 'AutoMod: Excessive Caps');
        assert.match(field(embed, 'Actions'), /Message deleted/);
        assert.equal(field(embed, 'Before'), 'Uppercase ratio: 100%');
        assert.equal(field(embed, 'After'), 'Message removed');
        assert.equal(field(embed, 'Metadata'), 'Threshold: 70%');
        assert.equal(JSON.stringify(embed).includes(content), false);
    } finally {
        cleanup(guild.id);
    }
});

test('mentions audits the mention counts', async () => {
    const source = makeChannel();
    const modlog = makeChannel({ name: 'mod-log' });
    const guild = makeGuild({ source, modlog });
    const user = makeUser();
    const member = makeMember(user);

    try {
        configureGuild(guild, modlog, { automod_mentions: 1 });
        const message = makeMessage({
            guild,
            channel: source,
            user,
            member,
            content: 'mass mention message',
            userMentions: 6,
            roleMentions: 0
        });
        await handleAutoMod(message);

        const embed = auditEmbed(modlog);
        assert.equal(embed.title, 'AutoMod: Mass Mentions');
        assert.match(field(embed, 'Actions'), /Message deleted/);
        assert.equal(field(embed, 'Before'), 'Mass mention threshold exceeded');
        assert.equal(field(embed, 'After'), 'Message removed');
        assert.equal(field(embed, 'Metadata'), 'Mentions: 6 users, 0 roles');
        assert.equal(JSON.stringify(embed).includes('mass mention message'), false);
    } finally {
        cleanup(guild.id);
    }
});

test('audit survives a deleted source channel and failed message actions', async () => {
    const source = makeChannel({ name: null, sendFails: true });
    const modlog = makeChannel({ name: 'mod-log' });
    const guild = makeGuild({ source, modlog });
    const user = makeUser();
    const member = makeMember(user);

    try {
        configureGuild(guild, modlog, { automod_antilink: 1, automod_whitelist: '[]' });
        const message = makeMessage({
            guild,
            channel: source,
            user,
            member,
            content: 'https://blocked.example/secret',
            deleteFails: true
        });
        await handleAutoMod(message);

        const embed = auditEmbed(modlog);
        assert.equal(embed.title, 'AutoMod: Anti-Link');
        assert.equal(field(embed, 'Channel'), `Unknown channel (${source.id})`);
        assert.match(field(embed, 'Actions'), /Message deletion failed/);
        assert.match(field(embed, 'Actions'), /Warning unavailable/);
        assert.equal(field(embed, 'After'), 'Link message still present');
        assert.equal(JSON.stringify(embed).includes('blocked.example'), false);
    } finally {
        cleanup(guild.id);
    }
});
