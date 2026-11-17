const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Collection } = require('discord.js');

const database = require('../src/utils/database');
const messageUpdate = require('../src/events/messageUpdate');

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
        displayAvatarURL: () => 'https://cdn.example/avatar.png',
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

function makeChannel({ id = unique('channel'), name = 'general' } = {}) {
    const sent = [];
    const bulkDeleted = [];
    const channel = {
        id,
        name,
        sent,
        bulkDeleted,
        recentMessages: [],
        toString: () => `#${name}`,
        async send(payload) {
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

function configureGuild(guild, modlog, settings, { setLogChannel = true } = {}) {
    database.insertGuild.run(guild.id);
    if (setLogChannel) {
        database.updateGuildSetting('log_channel').run(modlog.id, guild.id);
    }
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
    partial = false
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
        url: `https://discord.example/${channel.id}/${unique('message')}`,
        mentions: { users, roles },
        partial,
        deleted: false,
        async delete() {
            this.deleted = true;
        }
    };
}

function automodEmbed(modlog) {
    return modlog.sent
        .map(payload => payload.embeds[0].data)
        .find(embed => typeof embed.title === 'string' && embed.title.startsWith('AutoMod:'));
}

function editedEmbed(modlog) {
    return modlog.sent
        .map(payload => payload.embeds[0].data)
        .find(embed => embed.title === 'Message Edited');
}

function field(embed, name) {
    return embed.fields.find(item => item.name === name)?.value;
}

function cleanup(guildId) {
    database.db.prepare('DELETE FROM guilds WHERE id = ?').run(guildId);
    database.db.prepare('DELETE FROM user_guild_data WHERE guild_id = ?').run(guildId);
    database.db.prepare('DELETE FROM warnings WHERE guild_id = ?').run(guildId);
}

test('editing a blocked link into a message is moderated', async () => {
    const source = makeChannel();
    const modlog = makeChannel({ name: 'mod-log' });
    const guild = makeGuild({ source, modlog });
    const user = makeUser();
    const member = makeMember(user);

    try {
        configureGuild(guild, modlog, { automod_antilink: 1, automod_whitelist: '[]', mod_log_channel: modlog.id });
        const oldMessage = { content: 'hello', partial: false };
        const newMessage = makeMessage({
            guild,
            channel: source,
            user,
            member,
            content: 'join https://evil.example/promo'
        });

        await messageUpdate.execute(oldMessage, newMessage, {});

        assert.equal(newMessage.deleted, true);
        const embed = automodEmbed(modlog);
        assert.ok(embed, 'expected an AutoMod audit embed');
        assert.equal(embed.title, 'AutoMod: Anti-Link');
        assert.equal(field(embed, 'Message ID'), newMessage.id);
        assert.match(field(embed, 'Actions'), /Message deleted/);
        assert.match(field(embed, 'Actions'), /Warning posted/);
        assert.equal(JSON.stringify(embed).includes('evil.example'), false);

        const warning = source.sent[0]?.embeds?.[0]?.data?.description || '';
        assert.match(warning, /links are not allowed/);
        assert.ok(editedEmbed(modlog), 'expected the edit to still be logged');
    } finally {
        cleanup(guild.id);
    }
});

test('editing a filtered word is moderated without a mod-log channel', async () => {
    const source = makeChannel();
    const modlog = makeChannel({ name: 'mod-log' });
    const guild = makeGuild({ source, modlog });
    const user = makeUser();
    const member = makeMember(user);

    try {
        configureGuild(
            guild,
            modlog,
            { automod_badwords: 1, automod_wordlist: JSON.stringify(['secretword']) },
            { setLogChannel: false }
        );
        const oldMessage = { content: 'hello', partial: false };
        const newMessage = makeMessage({
            guild,
            channel: source,
            user,
            member,
            content: 'this now contains secretword'
        });

        await messageUpdate.execute(oldMessage, newMessage, {});

        assert.equal(newMessage.deleted, true);
        assert.equal(modlog.sent.length, 0);
        const warning = source.sent[0]?.embeds?.[0]?.data?.description || '';
        assert.match(warning, /prohibited word/);
    } finally {
        cleanup(guild.id);
    }
});

test('a partial edit is fetched before moderation', async () => {
    const source = makeChannel();
    const modlog = makeChannel({ name: 'mod-log' });
    const guild = makeGuild({ source, modlog });
    const user = makeUser();
    const member = makeMember(user);

    try {
        configureGuild(guild, modlog, { automod_antilink: 1, automod_whitelist: '[]', mod_log_channel: modlog.id });
        const fullMessage = makeMessage({
            guild,
            channel: source,
            user,
            member,
            content: 'see https://evil.example/promo'
        });
        const partialMessage = {
            ...fullMessage,
            content: '',
            partial: true,
            async fetch() {
                return fullMessage;
            }
        };

        await messageUpdate.execute({ content: 'hello', partial: false }, partialMessage, {});

        assert.equal(fullMessage.deleted, true);
        assert.equal(automodEmbed(modlog)?.title, 'AutoMod: Anti-Link');
    } finally {
        cleanup(guild.id);
    }
});

test('a benign edit is logged but not moderated', async () => {
    const source = makeChannel();
    const modlog = makeChannel({ name: 'mod-log' });
    const guild = makeGuild({ source, modlog });
    const user = makeUser();
    const member = makeMember(user);

    try {
        configureGuild(guild, modlog, { automod_antilink: 1, automod_whitelist: '[]', mod_log_channel: modlog.id });
        const oldMessage = { content: 'hello', partial: false };
        const newMessage = makeMessage({ guild, channel: source, user, member, content: 'hello there' });

        await messageUpdate.execute(oldMessage, newMessage, {});

        assert.equal(newMessage.deleted, false);
        assert.equal(automodEmbed(modlog), undefined);
        assert.ok(editedEmbed(modlog), 'expected the edit log to be delivered');
    } finally {
        cleanup(guild.id);
    }
});

test('rapid edits do not count as anti-spam messages', async () => {
    const source = makeChannel();
    const modlog = makeChannel({ name: 'mod-log' });
    const guild = makeGuild({ source, modlog });
    const user = makeUser();
    const member = makeMember(user);

    try {
        configureGuild(guild, modlog, { automod_antispam: 1 });
        source.recentMessages = Array.from({ length: 6 }, (_, index) => makeMessage({
            guild,
            channel: source,
            user,
            member,
            content: `recent ${index}`
        }));

        let previous = { content: 'edit 0', partial: false };
        for (let index = 1; index <= 6; index += 1) {
            const next = makeMessage({ guild, channel: source, user, member, content: `edit ${index}` });
            await messageUpdate.execute(previous, next, {});
            previous = next;
        }

        assert.equal(member.timeouts.length, 0);
        assert.equal(source.bulkDeleted.length, 0);
        assert.equal(automodEmbed(modlog), undefined);
    } finally {
        cleanup(guild.id);
    }
});
