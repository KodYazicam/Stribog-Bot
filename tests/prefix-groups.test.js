const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Collection, PermissionFlagsBits } = require('discord.js');

const database = require('../src/utils/database');
const interactionCreate = require('../src/events/interactionCreate');
const { handlePrefixMessage, parsePrefixCommand } = require('../src/utils/prefix');
const { DEFAULT_PREFIX, MAX_PREFIX_LENGTH, validatePrefix } = require('../src/config/prefix');
const { levelFromTotalXp } = require('../src/utils/leveling');

const eightBall = require('../src/commands/fun/8ball');
const avatar = require('../src/commands/info/avatar');
const rank = require('../src/commands/leveling/rank');
const automod = require('../src/commands/admin/automod');
const config = require('../src/commands/admin/config');
const giveaway = require('../src/commands/giveaway/giveaway');
const ban = require('../src/commands/moderation/ban');
const ping = require('../src/commands/utility/ping');

const enabledCommands = [eightBall, avatar, rank, automod, config, giveaway];
for (const command of enabledCommands) command.category = command === eightBall ? 'fun' :
    command === avatar ? 'info' :
        command === rank ? 'leveling' :
            command === automod || command === config ? 'admin' : 'giveaway';
ban.category = 'moderation';
ping.category = 'utility';

let sequence = 0;
let numericSequence = 800000000000000000;

function unique(prefix) {
    sequence += 1;
    return `${prefix}-${process.pid}-${Date.now()}-${sequence}`;
}

function numericId() {
    numericSequence += 1;
    return String(numericSequence);
}

function makeUser(id, { bot = false } = {}) {
    return {
        id,
        bot,
        username: `user-${id}`,
        tag: `user-${id}#0001`,
        avatar: null,
        createdTimestamp: 1600000000000,
        flags: { toArray: () => [] },
        displayAvatarURL: ({ extension = 'png', size = 256 } = {}) =>
            `https://cdn.example/avatars/${id}/${size}.${extension}`,
        toString: () => `<@${id}>`
    };
}

function makeRole(id, name = `role-${id}`) {
    return {
        id,
        name,
        position: 1,
        toString: () => `<@&${id}>`
    };
}

function makeGuild(id = unique('guild')) {
    const roles = new Collection();
    const channels = new Collection();
    return {
        id,
        name: 'Test Guild',
        ownerId: numericId(),
        memberCount: 2,
        createdTimestamp: 1600000000000,
        verificationLevel: 0,
        premiumTier: 0,
        premiumSubscriptionCount: 0,
        banner: null,
        description: null,
        iconURL: () => null,
        bannerURL: () => null,
        roles: {
            cache: roles,
            fetch: async roleId => roles.get(roleId) || null
        },
        channels: {
            cache: channels,
            fetch: async channelId => channels.get(channelId) || null
        },
        members: {
            cache: new Collection(),
            fetch: async () => null
        }
    };
}

function makeMember(user, { administrator = false, manageGuild = false, roleIds = [] } = {}) {
    const roleCache = new Collection(roleIds.map(id => [id, makeRole(id)]));
    const addedRoles = [];
    return {
        id: user.id,
        user,
        nickname: null,
        joinedTimestamp: 1600000000000,
        premiumSince: null,
        displayHexColor: '#5865F2',
        displayAvatarURL: user.displayAvatarURL,
        roles: {
            cache: roleCache,
            add: async role => { addedRoles.push(role); return role; }
        },
        addedRoles,
        permissions: {
            has: permission => {
                const value = BigInt(permission);
                if (administrator) return true;
                return manageGuild && value === BigInt(PermissionFlagsBits.ManageGuild);
            }
        }
    };
}

function makeSentMessage(payload) {
    const id = unique('message');
    return {
        id,
        url: `https://discord.com/channels/test/${id}`,
        payload,
        embeds: payload?.embeds ?? [],
        components: payload?.components ?? [],
        async react() { return this; },
        async edit(next) { this.payload = next; return this; },
        async delete() { return this; }
    };
}

function makeChannel() {
    const sent = [];
    return {
        id: unique('channel'),
        sent,
        async send(payload) {
            const message = makeSentMessage(payload);
            sent.push(message);
            return message;
        }
    };
}

function makeClient(commands = enabledCommands) {
    return {
        commands: new Collection(commands.map(command => [command.data.name, command])),
        cooldowns: new Collection(),
        users: { fetch: async id => makeUser(id) },
        channels: { fetch: async () => null },
        guilds: { cache: new Collection() },
        user: makeUser('bot')
    };
}

function makeMessage(content, { user, member, guild, client, channel, attachments } = {}) {
    const replies = [];
    return {
        content,
        author: user,
        member,
        guild,
        client,
        channel: channel || makeChannel(),
        mentions: { users: new Collection() },
        attachments: attachments || new Collection(),
        replies,
        async reply(payload) {
            const message = makeSentMessage(payload);
            replies.push(payload);
            return message;
        }
    };
}

function slashOptions(values = {}) {
    return {
        getSubcommand: () => values.subcommand ?? null,
        getSubcommandGroup: () => null,
        getUser: name => values[name] ?? null,
        getMember: name => values[name] ?? null,
        getRole: name => values[name] ?? null,
        getChannel: name => values[name] ?? null,
        getString: name => values[name] ?? null,
        getInteger: name => values[name] ?? null,
        getNumber: name => values[name] ?? null,
        getBoolean: name => values[name] ?? null,
        getAttachment: name => values[name] ?? null
    };
}

function makeSlashInteraction(command, { user, member, guild, client, channel, values = {} }) {
    const replies = [];
    const interactionChannel = channel || makeChannel();
    return {
        commandName: command.data.name,
        guild,
        channel: interactionChannel,
        member,
        user,
        client,
        options: slashOptions(values),
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
            replies.push(payload);
            return makeSentMessage(payload);
        },
        async followUp(payload) {
            replies.push(payload);
            return makeSentMessage(payload);
        },
        async deferReply() {
            this.deferred = true;
        },
        async editReply(payload) {
            this.replied = true;
            replies.push(payload);
            return makeSentMessage(payload);
        }
    };
}

async function runPrefix(content, { user, member, guild, client, channel, attachments, prefix } = {}) {
    const message = makeMessage(content, { user, member, guild, client, channel, attachments });
    const handled = await handlePrefixMessage(message, client, prefix ? { prefix } : {});
    return { handled, message };
}

function embedOf(target) {
    return target.replies[0].embeds[0].data;
}

function cleanup(guildId) {
    database.db.prepare('DELETE FROM guild_economy WHERE guild_id = ?').run(guildId);
    database.db.prepare('DELETE FROM user_guild_data WHERE guild_id = ?').run(guildId);
    database.db.prepare('DELETE FROM giveaways WHERE guild_id = ?').run(guildId);
    database.db.prepare('DELETE FROM shop_items WHERE guild_id = ?').run(guildId);
    database.db.prepare('DELETE FROM command_permissions WHERE guild_id = ?').run(guildId);
    database.db.prepare('DELETE FROM disabled_commands WHERE guild_id = ?').run(guildId);
    database.db.prepare('DELETE FROM guilds WHERE id = ?').run(guildId);
}

test('prefix parser supports message attachments for config import', async () => {
    const guild = makeGuild();
    const user = makeUser(numericId());
    const member = makeMember(user, { administrator: true });
    const client = makeClient([...enabledCommands]);
    const attachment = {
        id: unique('attachment'),
        name: 'config.json',
        size: 100,
        url: 'https://cdn.discordapp.com/attachments/test/config.json'
    };
    const attachments = new Collection([[attachment.id, attachment]]);

    const withFile = await parsePrefixCommand(
        'config import true',
        makeMessage('', { user, member, guild, client, attachments }),
        client,
        '!'
    );
    assert.equal(withFile.values.file, attachment);
    assert.equal(withFile.values.confirm, true);

    const withoutFile = await parsePrefixCommand(
        'config import',
        makeMessage('', { user, member, guild, client }),
        client,
        '!'
    );
    assert.match(withoutFile.error, /Missing required attachment/);
});

test('fun command produces the same slash and prefix embed', async () => {
    const guild = makeGuild();
    const user = makeUser(numericId());
    const member = makeMember(user);
    const client = makeClient();
    const originalRandom = Math.random;
    Math.random = () => 0.5;

    try {
        const slash = makeSlashInteraction(eightBall, {
            user, member, guild, client, values: { question: 'Will this work?' }
        });
        await eightBall.execute(slash, client);

        const { handled, message } = await runPrefix('!8ball "Will this work?"', {
            user, member, guild, client
        });

        assert.equal(handled, true);
        assert.deepEqual(embedOf(message).fields, embedOf(slash).fields);
        assert.equal(embedOf(message).title, embedOf(slash).title);
    } finally {
        Math.random = originalRandom;
        cleanup(guild.id);
    }
});

test('info command produces the same slash and prefix embed', async () => {
    const guild = makeGuild();
    const user = makeUser(numericId());
    const target = makeUser(numericId());
    const member = makeMember(user);
    const targetMember = makeMember(target);
    guild.members.fetch = async () => targetMember;
    const client = makeClient();

    try {
        const slash = makeSlashInteraction(avatar, {
            user, member, guild, client, values: { target }
        });
        await avatar.execute(slash, client);

        const { handled, message } = await runPrefix(`!avatar <@${target.id}>`, {
            user, member, guild, client
        });

        assert.equal(handled, true);
        assert.equal(embedOf(message).title, embedOf(slash).title);
        assert.equal(embedOf(message).image.url, embedOf(slash).image.url);
    } finally {
        cleanup(guild.id);
    }
});

test('leveling command produces the same slash and prefix embed', async () => {
    const guild = makeGuild();
    const user = makeUser(numericId());
    const member = makeMember(user);
    const client = makeClient();
    const xp = 500;

    try {
        database.insertUserGuildData.run(user.id, guild.id);
        database.db.prepare(`
            UPDATE user_guild_data SET xp = ?, level = ?, messages = ? WHERE user_id = ? AND guild_id = ?
        `).run(xp, levelFromTotalXp(xp), 42, user.id, guild.id);

        const slash = makeSlashInteraction(rank, { user, member, guild, client });
        await rank.execute(slash, client);

        const { handled, message } = await runPrefix('!rank', { user, member, guild, client });

        assert.equal(handled, true);
        assert.deepEqual(embedOf(message).fields, embedOf(slash).fields);
        assert.equal(embedOf(message).title, embedOf(slash).title);
    } finally {
        cleanup(guild.id);
    }
});

test('admin command produces the same slash and prefix embed', async () => {
    const guild = makeGuild();
    const user = makeUser(numericId());
    const member = makeMember(user, { administrator: true });
    const client = makeClient();

    try {
        database.insertGuild.run(guild.id);
        const slash = makeSlashInteraction(automod, {
            user, member, guild, client, values: { subcommand: 'status' }
        });
        await automod.execute(slash, client);

        const { handled, message } = await runPrefix('!automod status', {
            user, member, guild, client
        });

        assert.equal(handled, true);
        assert.deepEqual(embedOf(message).fields, embedOf(slash).fields);
        assert.equal(embedOf(message).title, embedOf(slash).title);
    } finally {
        cleanup(guild.id);
    }
});

test('giveaway command produces the same slash and prefix launch embed', async () => {
    const guild = makeGuild();
    const user = makeUser(numericId());
    const member = makeMember(user, { manageGuild: true });
    const client = makeClient();
    const channel = makeChannel();
    const originalNow = Date.now;
    Date.now = () => 1700000000000;

    try {
        const slash = makeSlashInteraction(giveaway, {
            user, member, guild, client, channel,
            values: { subcommand: 'start', prize: 'Nitro', duration: '1h', winners: 2 }
        });
        await giveaway.execute(slash, client);

        cleanup(guild.id);
        const { handled, message } = await runPrefix('!giveaway start "Nitro" 1h 2', {
            user, member, guild, client, channel
        });

        assert.equal(handled, true);
        const slashEmbed = channel.sent[0].embeds[0].data;
        const prefixEmbed = channel.sent[1].embeds[0].data;
        assert.equal(prefixEmbed.title, slashEmbed.title);
        assert.equal(prefixEmbed.description, slashEmbed.description);
        assert.match(embedOf(message).description, /Giveaway started!/);
    } finally {
        Date.now = originalNow;
        cleanup(guild.id);
    }
});

test('prefix enforces slash default permissions for admin and giveaway commands', async () => {
    const guild = makeGuild();
    const user = makeUser(numericId());
    const member = makeMember(user);
    const client = makeClient();

    try {
        const adminResult = await runPrefix('!automod status', { user, member, guild, client });
        assert.equal(adminResult.handled, true);
        assert.match(embedOf(adminResult.message).description, /do not have permission/);

        const giveawayResult = await runPrefix('!giveaway start "Nitro" 1h', {
            user, member, guild, client
        });
        assert.equal(giveawayResult.handled, true);
        assert.match(embedOf(giveawayResult.message).description, /do not have permission/);
    } finally {
        cleanup(guild.id);
    }
});

test('prefix and slash share cooldowns across enabled groups', async () => {
    const guild = makeGuild();
    const user = makeUser(numericId());
    const member = makeMember(user);
    const client = makeClient();

    try {
        const slash = makeSlashInteraction(eightBall, {
            user, member, guild, client, values: { question: 'Cooldown test?' }
        });
        await interactionCreate.execute(slash, client);
        assert.equal(slash.replies.length, 1);

        const { message } = await runPrefix('!8ball "Cooldown test?"', {
            user, member, guild, client
        });

        assert.match(message.replies[0].content, /Please wait/);
        assert.match(message.replies[0].content, /!8ball/);
    } finally {
        cleanup(guild.id);
    }
});

test('unknown commands and non-enabled categories are ignored', async () => {
    const guild = makeGuild();
    const user = makeUser(numericId());
    const member = makeMember(user);
    const client = makeClient([...enabledCommands, ban, ping]);

    try {
        assert.equal((await runPrefix('!doesnotexist', { user, member, guild, client })).handled, false);
        assert.equal((await runPrefix('!ban', { user, member, guild, client })).handled, false);
        assert.equal((await runPrefix('!ping', { user, member, guild, client })).handled, false);
        assert.equal((await runPrefix('hello', { user, member, guild, client })).handled, false);
    } finally {
        cleanup(guild.id);
    }
});

test('PREFIX validation rejects empty, long, and conflicting values', () => {
    assert.deepEqual(validatePrefix(undefined), { prefix: DEFAULT_PREFIX });
    assert.equal(validatePrefix('').prefix, DEFAULT_PREFIX);
    assert.match(validatePrefix('').error, /empty/);
    assert.equal(validatePrefix('   ').prefix, DEFAULT_PREFIX);
    assert.equal(validatePrefix('a'.repeat(MAX_PREFIX_LENGTH + 1)).prefix, DEFAULT_PREFIX);
    assert.match(validatePrefix('a'.repeat(MAX_PREFIX_LENGTH + 1)).error, /longer/);
    assert.equal(validatePrefix('a').prefix, DEFAULT_PREFIX);
    assert.match(validatePrefix('a').error, /normal chat/);
    for (const prefix of ['/', '@', '#', '<', '>']) {
        assert.equal(validatePrefix(prefix).prefix, DEFAULT_PREFIX);
        assert.match(validatePrefix(prefix).error, /Discord syntax/);
    }
    assert.deepEqual(validatePrefix('?'), { prefix: '?' });
    assert.deepEqual(validatePrefix('??'), { prefix: '??' });
});

test('prefix collision does not consume messages for the wrong prefix', async () => {
    const guild = makeGuild();
    const user = makeUser(numericId());
    const member = makeMember(user);
    const client = makeClient();

    try {
        const wrongPrefix = await runPrefix('!8ball test', {
            user, member, guild, client, prefix: '?'
        });
        assert.equal(wrongPrefix.handled, false);

        const rightPrefix = await runPrefix('?8ball test', {
            user, member, guild, client, prefix: '?'
        });
        assert.equal(rightPrefix.handled, true);
        assert.equal(embedOf(rightPrefix.message).title, '🎱 Magic 8Ball');
    } finally {
        cleanup(guild.id);
    }
});
