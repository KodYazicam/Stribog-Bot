const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Collection, PermissionFlagsBits } = require('discord.js');

const database = require('../src/utils/database');
const interactionCreate = require('../src/events/interactionCreate');
const { handlePrefixMessage, parsePrefixCommand } = require('../src/utils/prefix');

const balance = require('../src/commands/economy/balance');
const daily = require('../src/commands/economy/daily');
const deposit = require('../src/commands/economy/deposit');
const give = require('../src/commands/economy/give');
const leaderboard = require('../src/commands/economy/leaderboard');
const shop = require('../src/commands/economy/shop');
const withdraw = require('../src/commands/economy/withdraw');
const work = require('../src/commands/economy/work');
const ban = require('../src/commands/moderation/ban');

const economyCommands = [balance, daily, deposit, give, leaderboard, shop, withdraw, work];
for (const command of economyCommands) command.category = 'economy';
ban.category = 'moderation';

let sequence = 0;
let numericSequence = 700000000000000000;

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
        displayAvatarURL: () => 'https://example.invalid/avatar.png',
        toString: () => `<@${id}>`
    };
}

function makeRole(id, name = `role-${id}`) {
    return {
        id,
        name,
        toString: () => `<@&${id}>`
    };
}

function makeGuild(id = unique('guild')) {
    const roles = new Collection();
    const channels = new Collection();
    return {
        id,
        name: 'Test Guild',
        roles: {
            cache: roles,
            fetch: async roleId => roles.get(roleId) || null
        },
        channels: {
            cache: channels,
            fetch: async channelId => channels.get(channelId) || null
        },
        members: { fetch: async () => null }
    };
}

function makeMember(user, { administrator = false, roleIds = [] } = {}) {
    const roleCache = new Collection(roleIds.map(id => [id, makeRole(id)]));
    const addedRoles = [];
    return {
        id: user.id,
        user,
        roles: {
            cache: roleCache,
            add: async role => { addedRoles.push(role); return role; }
        },
        addedRoles,
        permissions: {
            has: permission => administrator && permission === PermissionFlagsBits.Administrator
        }
    };
}

function makeClient(commands = economyCommands) {
    return {
        commands: new Collection(commands.map(command => [command.data.name, command])),
        cooldowns: new Collection(),
        users: { fetch: async id => makeUser(id) }
    };
}

function makeMessage(content, { user, member, guild, client }) {
    const replies = [];
    const message = {
        content,
        author: user,
        member,
        guild,
        client,
        channel: { id: unique('channel') },
        mentions: { users: new Collection() },
        replies,
        async reply(payload) {
            replies.push(payload);
            return {
                payload,
                async edit(next) {
                    this.payload = next;
                    return this;
                }
            };
        }
    };
    return message;
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

function makeSlashInteraction(command, { user, member, guild, client, values = {} }) {
    const replies = [];
    return {
        commandName: command.data.name,
        guild,
        channel: { id: unique('channel') },
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
            return { payload, edit: async next => { this.replies.push(next); } };
        },
        async followUp(payload) {
            replies.push(payload);
            return payload;
        },
        async deferReply() {
            this.deferred = true;
        },
        async editReply(payload) {
            this.replied = true;
            replies.push(payload);
            return payload;
        }
    };
}

function cleanup(guildId) {
    database.db.prepare('DELETE FROM guild_economy WHERE guild_id = ?').run(guildId);
    database.db.prepare('DELETE FROM shop_items WHERE guild_id = ?').run(guildId);
    database.db.prepare('DELETE FROM command_permissions WHERE guild_id = ?').run(guildId);
    database.db.prepare('DELETE FROM disabled_commands WHERE guild_id = ?').run(guildId);
    database.db.prepare('DELETE FROM guilds WHERE id = ?').run(guildId);
}

function setEconomy(guildId, userId, { balance: wallet = 0, bank = 0, dailyClaimed = 0, workCooldown = 0 } = {}) {
    database.ensureEconomy(userId, guildId);
    database.db.prepare(`
        UPDATE guild_economy
        SET balance = ?, bank = ?, daily_claimed = ?, work_cooldown = ?
        WHERE user_id = ? AND guild_id = ?
    `).run(wallet, bank, dailyClaimed, workCooldown, userId, guildId);
}

function embedOf(interaction) {
    return interaction.replies[0].embeds[0].data;
}

async function runPrefix(content, { user, member, guild, client }) {
    const message = makeMessage(content, { user, member, guild, client });
    const handled = await handlePrefixMessage(message, client);
    return { handled, message };
}

test('prefix parser maps every economy command option from slash metadata', async () => {
    const guild = makeGuild();
    const user = makeUser(unique('mod'));
    const member = makeMember(user);
    const client = makeClient();
    const role = makeRole('111111111111111111');
    guild.roles.cache.set(role.id, role);
    const message = makeMessage('', { user, member, guild, client });

    const parse = content => parsePrefixCommand(content, message, client, '!');

    let parsed = await parse('balance');
    assert.equal(parsed.command.data.name, 'balance');
    assert.equal(parsed.values.user, null);

    parsed = await parse('balance <@222222222222222222>');
    assert.equal(parsed.values.user.id, '222222222222222222');

    parsed = await parse('deposit 250');
    assert.equal(parsed.values.amount, '250');

    parsed = await parse('withdraw all');
    assert.equal(parsed.values.amount, 'all');

    parsed = await parse('give <@!333333333333333333> 50');
    assert.equal(parsed.values.user.id, '333333333333333333');
    assert.equal(parsed.values.amount, 50);

    parsed = await parse('shop view');
    assert.equal(parsed.subcommand, 'view');
    assert.deepEqual(parsed.values, {});

    parsed = await parse('shop buy 7');
    assert.equal(parsed.subcommand, 'buy');
    assert.equal(parsed.values.id, 7);

    parsed = await parse('shop add "VIP Pass" 1000 "VIP access" <@&111111111111111111>');
    assert.equal(parsed.subcommand, 'add');
    assert.equal(parsed.values.name, 'VIP Pass');
    assert.equal(parsed.values.price, 1000);
    assert.equal(parsed.values.description, 'VIP access');
    assert.equal(parsed.values.role.id, role.id);

    parsed = await parse('shop remove 7');
    assert.equal(parsed.subcommand, 'remove');
    assert.equal(parsed.values.id, 7);

    parsed = await parse('leaderboard');
    assert.equal(parsed.values.type, null);

    parsed = await parse('leaderboard levels');
    assert.equal(parsed.values.type, 'levels');

    assert.match((await parse('leaderboard nope')).error, /must be one of/);
    assert.match((await parse('deposit')).error, /Missing required option/);
    assert.match((await parse('shop')).error, /Unknown subcommand/);
    assert.match((await parse('give <@222222222222222222> abc')).error, /must be an integer/);
});

test('prefix and slash balance produce the same embed', async () => {
    const guild = makeGuild();
    const user = makeUser(unique('user'));
    const member = makeMember(user);
    const client = makeClient();
    setEconomy(guild.id, user.id, { balance: 123, bank: 456 });

    try {
        const slash = makeSlashInteraction(balance, { user, member, guild, client });
        await balance.execute(slash, client);

        const { handled, message } = await runPrefix('!balance', { user, member, guild, client });
        assert.equal(handled, true);
        assert.deepEqual(embedOf(message).fields, embedOf(slash).fields);
        assert.equal(embedOf(message).title, embedOf(slash).title);
    } finally {
        cleanup(guild.id);
    }
});

test('prefix and slash deposit produce the same embed', async () => {
    const guild = makeGuild();
    const user = makeUser(unique('user'));
    const member = makeMember(user);
    const client = makeClient();

    try {
        setEconomy(guild.id, user.id, { balance: 100 });
        const slash = makeSlashInteraction(deposit, {
            user, member, guild, client, values: { amount: '25' }
        });
        await deposit.execute(slash, client);

        setEconomy(guild.id, user.id, { balance: 100 });
        const { message } = await runPrefix('!deposit 25', { user, member, guild, client });

        assert.deepEqual(embedOf(message).fields, embedOf(slash).fields);
        assert.equal(embedOf(message).title, embedOf(slash).title);
    } finally {
        cleanup(guild.id);
    }
});

test('prefix and slash give produce the same embed', async () => {
    const guild = makeGuild();
    const sender = makeUser(numericId());
    const receiver = makeUser(numericId());
    const member = makeMember(sender);
    const client = makeClient();

    try {
        setEconomy(guild.id, sender.id, { balance: 500 });
        setEconomy(guild.id, receiver.id, { balance: 10 });
        const slash = makeSlashInteraction(give, {
            user: sender, member, guild, client, values: { user: receiver, amount: 100 }
        });
        await give.execute(slash, client);

        setEconomy(guild.id, sender.id, { balance: 500 });
        setEconomy(guild.id, receiver.id, { balance: 10 });
        const { message } = await runPrefix(`!give <@${receiver.id}> 100`, {
            user: sender, member, guild, client
        });

        assert.deepEqual(embedOf(message).fields, embedOf(slash).fields);
        assert.equal(embedOf(message).title, embedOf(slash).title);
    } finally {
        cleanup(guild.id);
    }
});

test('prefix and slash shop view produce the same embed', async () => {
    const guild = makeGuild();
    const user = makeUser(unique('user'));
    const member = makeMember(user);
    const client = makeClient();

    try {
        database.insertShopItem.run(guild.id, 'VIP Pass', 'VIP access', 1000, null);
        const slash = makeSlashInteraction(shop, {
            user, member, guild, client, values: { subcommand: 'view' }
        });
        await shop.execute(slash, client);

        const { message } = await runPrefix('!shop view', { user, member, guild, client });

        assert.deepEqual(embedOf(message).fields, embedOf(slash).fields);
        assert.equal(embedOf(message).description, embedOf(slash).description);
    } finally {
        cleanup(guild.id);
    }
});

test('prefix and slash leaderboard produce the same embed', async () => {
    const guild = makeGuild();
    const user = makeUser(unique('user'));
    const member = makeMember(user);
    const client = makeClient();
    const first = makeUser(unique('user'));
    const second = makeUser(unique('user'));

    try {
        setEconomy(guild.id, first.id, { balance: 500, bank: 100 });
        setEconomy(guild.id, second.id, { balance: 200 });
        client.users.fetch = async id => [first, second].find(item => item.id === id) || makeUser(id);

        const slash = makeSlashInteraction(leaderboard, {
            user, member, guild, client, values: { type: 'economy' }
        });
        await leaderboard.execute(slash, client);

        const { message } = await runPrefix('!leaderboard economy', { user, member, guild, client });

        assert.equal(embedOf(message).description, embedOf(slash).description);
        assert.equal(embedOf(message).title, embedOf(slash).title);
    } finally {
        cleanup(guild.id);
    }
});

test('prefix and slash daily produce the same deterministic reward', async () => {
    const guild = makeGuild();
    const user = makeUser(unique('user'));
    const member = makeMember(user);
    const client = makeClient();
    const originalRandom = Math.random;
    Math.random = () => 0.5;

    try {
        setEconomy(guild.id, user.id, { balance: 0 });
        const slash = makeSlashInteraction(daily, { user, member, guild, client });
        await daily.execute(slash, client);

        setEconomy(guild.id, user.id, { balance: 0 });
        const { message } = await runPrefix('!daily', { user, member, guild, client });

        assert.deepEqual(embedOf(message).fields, embedOf(slash).fields);
        assert.equal(embedOf(message).title, embedOf(slash).title);
    } finally {
        Math.random = originalRandom;
        cleanup(guild.id);
    }
});

test('prefix and slash work produce the same deterministic reward', async () => {
    const guild = makeGuild();
    const user = makeUser(unique('user'));
    const member = makeMember(user);
    const client = makeClient();
    const originalRandom = Math.random;
    Math.random = () => 0;

    try {
        setEconomy(guild.id, user.id, { balance: 0 });
        const slash = makeSlashInteraction(work, { user, member, guild, client });
        await work.execute(slash, client);

        setEconomy(guild.id, user.id, { balance: 0 });
        const { message } = await runPrefix('!work', { user, member, guild, client });

        assert.deepEqual(embedOf(message).fields, embedOf(slash).fields);
        assert.equal(embedOf(message).title, embedOf(slash).title);
    } finally {
        Math.random = originalRandom;
        cleanup(guild.id);
    }
});

test('prefix and slash use the same permission denial', async () => {
    const guild = makeGuild();
    const user = makeUser(unique('user'));
    const member = makeMember(user, { roleIds: [unique('other-role')] });
    const allowedRoleId = unique('allowed-role');
    const client = makeClient();
    database.addCommandPermission.run(guild.id, 'balance', allowedRoleId, 'allow');

    try {
        const slash = makeSlashInteraction(balance, { user, member, guild, client });
        await interactionCreate.execute(slash, client);

        const { handled, message } = await runPrefix('!balance', { user, member, guild, client });

        assert.equal(handled, true);
        assert.match(slash.replies[0].embeds[0].data.description, /do not have permission/);
        assert.match(message.replies[0].embeds[0].data.description, /do not have permission/);
    } finally {
        database.clearCommandPermissions.run(guild.id, 'balance');
        cleanup(guild.id);
    }
});

test('prefix and slash share the same per-user cooldown', async () => {
    const guild = makeGuild();
    const user = makeUser(unique('user'));
    const member = makeMember(user, { administrator: true });
    const client = makeClient();

    try {
        setEconomy(guild.id, user.id, { balance: 10 });
        const slash = makeSlashInteraction(balance, { user, member, guild, client });
        await interactionCreate.execute(slash, client);
        assert.equal(slash.replies.length, 1);

        const { message } = await runPrefix('!balance', { user, member, guild, client });

        assert.equal(message.replies.length, 1);
        assert.match(message.replies[0].content, /Please wait/);
        assert.match(message.replies[0].content, /!balance/);
    } finally {
        cleanup(guild.id);
    }
});

test('prefix ignores messages without the prefix and non-economy commands', async () => {
    const guild = makeGuild();
    const user = makeUser(unique('user'));
    const member = makeMember(user);
    const client = makeClient([...economyCommands, ban]);

    try {
        assert.equal(await handlePrefixMessage(makeMessage('hello', {
            user, member, guild, client
        }), client), false);
        assert.equal(await handlePrefixMessage(makeMessage('!ban', {
            user, member, guild, client
        }), client), false);
        assert.equal(await handlePrefixMessage(makeMessage('!', {
            user, member, guild, client
        }), client), false);
    } finally {
        cleanup(guild.id);
    }
});

test('prefix reports usage errors before executing a command', async () => {
    const guild = makeGuild();
    const user = makeUser(unique('user'));
    const member = makeMember(user);
    const client = makeClient();

    try {
        setEconomy(guild.id, user.id, { balance: 100 });
        const { handled, message } = await runPrefix('!deposit', { user, member, guild, client });

        assert.equal(handled, true);
        assert.match(message.replies[0].embeds[0].data.description, /Missing required option/);
        assert.equal(database.getEconomy.get(user.id, guild.id).balance, 100);
    } finally {
        cleanup(guild.id);
    }
});
