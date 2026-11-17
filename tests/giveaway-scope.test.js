const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EmbedBuilder } = require('discord.js');

require('./helpers/test-db');
const giveawayCommand = require('../src/commands/giveaway/giveaway');
const database = require('../src/utils/database');

let sequence = 0;

function unique(prefix) {
    sequence += 1;
    return `${prefix}-${process.pid}-${Date.now()}-${sequence}`;
}

function descriptionOf(reply) {
    return String(reply?.embeds?.[0]?.data?.description ?? '');
}

function makeGiveaway({ guildId, messageId = unique('message'), ended = false }) {
    const channelId = unique('channel');
    database.insertGiveaway.run(
        messageId,
        channelId,
        guildId,
        'Test prize',
        1,
        Date.now() + 60000,
        unique('host')
    );
    if (ended) {
        database.db.prepare('UPDATE giveaways SET ended = 1 WHERE message_id = ?').run(messageId);
    }
    const row = database.getGiveaway.get(messageId);
    return { row, channelId, messageId };
}

function cleanup(messageId) {
    const row = database.getGiveaway.get(messageId);
    if (row) {
        database.db.prepare('DELETE FROM giveaway_entries WHERE giveaway_id = ?').run(row.id);
        database.db.prepare('DELETE FROM giveaways WHERE id = ?').run(row.id);
    }
}

function makeClient(messageId) {
    const calls = { channelFetch: 0, messageFetch: 0, edits: [], sends: [] };
    const message = {
        id: messageId,
        embeds: [new EmbedBuilder().setTitle('Giveaway').setDescription('Test prize')],
        edit: async payload => { calls.edits.push(payload); return message; },
        url: `https://discord.com/channels/1/${unique('channel')}/${messageId}`
    };
    const channel = {
        id: unique('channel'),
        messages: {
            fetch: async () => {
                calls.messageFetch += 1;
                return message;
            }
        },
        send: async payload => { calls.sends.push(payload); return payload; }
    };
    const client = {
        channels: {
            fetch: async () => {
                calls.channelFetch += 1;
                return channel;
            }
        }
    };
    return { client, calls };
}

function makeInteraction({ guildId, subcommand, messageId, prize = null, duration = null, winners = null }) {
    const replies = [];
    const sent = [];
    return {
        commandName: 'giveaway',
        guild: { id: guildId },
        channel: {
            id: unique('invoker-channel'),
            send: async payload => {
                const message = { id: unique('message'), url: `https://discord.com/channels/1/2/${unique('id')}` };
                sent.push({ payload, message });
                return message;
            }
        },
        user: { id: unique('user') },
        member: { permissions: { has: () => true } },
        options: {
            getSubcommand: () => subcommand,
            getString: name => {
                if (name === 'message_id') return messageId;
                if (name === 'prize') return prize;
                if (name === 'duration') return duration;
                return null;
            },
            getInteger: name => (name === 'winners' ? winners : null)
        },
        replied: false,
        deferred: false,
        replies,
        sent,
        isChatInputCommand: () => true,
        isAutocomplete: () => false,
        isButton: () => false,
        isStringSelectMenu: () => false,
        isModalSubmit: () => false,
        async reply(payload) {
            this.replied = true;
            this.replies.push(payload);
            return payload;
        }
    };
}

test('giveaway end rejects a giveaway owned by another guild', async () => {
    const foreignGuildId = unique('guild-b');
    const { messageId } = makeGiveaway({ guildId: foreignGuildId });
    const { client, calls } = makeClient(messageId);
    const interaction = makeInteraction({
        guildId: unique('guild-a'),
        subcommand: 'end',
        messageId
    });

    try {
        await giveawayCommand.execute(interaction, client);

        assert.equal(database.getGiveaway.get(messageId).ended, 0);
        assert.equal(calls.channelFetch, 0);
        assert.equal(calls.messageFetch, 0);
        assert.equal(calls.edits.length, 0);
        assert.equal(calls.sends.length, 0);
        assert.equal(interaction.replies.length, 1);
        assert.match(descriptionOf(interaction.replies[0]), /not found/i);
    } finally {
        cleanup(messageId);
    }
});

test('giveaway reroll rejects a giveaway owned by another guild', async () => {
    const foreignGuildId = unique('guild-b');
    const { messageId } = makeGiveaway({ guildId: foreignGuildId, ended: true });
    const { client, calls } = makeClient(messageId);
    const interaction = makeInteraction({
        guildId: unique('guild-a'),
        subcommand: 'reroll',
        messageId
    });

    try {
        await giveawayCommand.execute(interaction, client);

        assert.equal(calls.channelFetch, 0);
        assert.equal(calls.messageFetch, 0);
        assert.equal(calls.sends.length, 0);
        assert.equal(interaction.replies.length, 1);
        assert.match(descriptionOf(interaction.replies[0]), /not found/i);
    } finally {
        cleanup(messageId);
    }
});

test('giveaway end still works inside the owning guild', async () => {
    const guildId = unique('guild-a');
    const { messageId } = makeGiveaway({ guildId });
    const { client, calls } = makeClient(messageId);
    const interaction = makeInteraction({ guildId, subcommand: 'end', messageId });

    try {
        await giveawayCommand.execute(interaction, client);

        assert.equal(database.getGiveaway.get(messageId).ended, 1);
        assert.equal(calls.channelFetch, 1);
        assert.equal(calls.edits.length, 1);
        assert.equal(interaction.replies.length, 1);
        assert.doesNotMatch(descriptionOf(interaction.replies[0]), /not found/i);
    } finally {
        cleanup(messageId);
    }
});

test('giveaway start parses the duration and persists the giveaway', async () => {
    const guildId = unique('guild-a');
    const interaction = makeInteraction({
        guildId,
        subcommand: 'start',
        prize: 'Nitro',
        duration: '2h',
        winners: 3
    });

    try {
        await giveawayCommand.execute(interaction, {});

        assert.equal(interaction.sent.length, 1);
        assert.equal(interaction.replies.length, 1);
        assert.match(descriptionOf(interaction.replies[0]), /Giveaway started/i);

        const row = database.db.prepare('SELECT * FROM giveaways WHERE guild_id = ?').get(guildId);
        assert.ok(row, 'the start subcommand should insert a giveaway row');
        assert.equal(row.prize, 'Nitro');
        assert.equal(row.winners, 3);
        cleanup(row.message_id);
    } finally {
        database.db.prepare('DELETE FROM giveaways WHERE guild_id = ?').run(guildId);
    }
});

test('giveaway start rejects an invalid duration without inserting a row', async () => {
    const guildId = unique('guild-a');
    const interaction = makeInteraction({
        guildId,
        subcommand: 'start',
        prize: 'Nitro',
        duration: '2hours'
    });

    await giveawayCommand.execute(interaction, {});

    assert.equal(interaction.sent.length, 0);
    assert.equal(interaction.replies.length, 1);
    assert.match(descriptionOf(interaction.replies[0]), /Invalid duration/i);
    assert.equal(
        database.db.prepare('SELECT COUNT(*) AS count FROM giveaways WHERE guild_id = ?').get(guildId).count,
        0
    );
});

test('giveaway end announces the winners when entries exist', async () => {
    const guildId = unique('guild-a');
    const { row, messageId } = makeGiveaway({ guildId });
    database.addGiveawayEntry.run(row.id, unique('entry-user'), Date.now());
    const { client, calls } = makeClient(messageId);
    const interaction = makeInteraction({ guildId, subcommand: 'end', messageId });

    try {
        await giveawayCommand.execute(interaction, client);

        assert.equal(database.getGiveaway.get(messageId).ended, 1);
        assert.equal(calls.edits.length, 1);
        assert.equal(calls.sends.length, 1);
        assert.match(calls.sends[0].content, /Congratulations/i);
    } finally {
        cleanup(messageId);
    }
});

test('giveaway reroll picks a new winner from the recorded entries', async () => {
    const guildId = unique('guild-a');
    const { row, messageId } = makeGiveaway({ guildId, ended: true });
    database.addGiveawayEntry.run(row.id, unique('entry-user'), Date.now());
    const { client, calls } = makeClient(messageId);
    const interaction = makeInteraction({ guildId, subcommand: 'reroll', messageId });

    try {
        await giveawayCommand.execute(interaction, client);

        assert.equal(calls.sends.length, 1);
        assert.match(calls.sends[0].content, /Congratulations/i);
        assert.equal(interaction.replies.length, 1);
        assert.match(descriptionOf(interaction.replies[0]), /Rerolled/i);
    } finally {
        cleanup(messageId);
    }
});

test('giveaway end reports an already ended giveaway and reroll reports a running one', async () => {
    const guildId = unique('guild-a');
    const ended = makeGiveaway({ guildId, ended: true });
    const running = makeGiveaway({ guildId });

    try {
        const endInteraction = makeInteraction({ guildId, subcommand: 'end', messageId: ended.messageId });
        await giveawayCommand.execute(endInteraction, {});
        assert.match(descriptionOf(endInteraction.replies[0]), /already ended/i);

        const rerollInteraction = makeInteraction({ guildId, subcommand: 'reroll', messageId: running.messageId });
        await giveawayCommand.execute(rerollInteraction, {});
        assert.match(descriptionOf(rerollInteraction.replies[0]), /not ended yet/i);
    } finally {
        cleanup(ended.messageId);
        cleanup(running.messageId);
    }
});

test('giveaway end and reroll stop quietly when the channel or message is gone', async () => {
    const guildId = unique('guild-a');
    const ending = makeGiveaway({ guildId });
    const rerolling = makeGiveaway({ guildId, ended: true });
    const missingChannel = { channels: { fetch: async () => { throw new Error('missing channel'); } } };
    const missingMessage = {
        channels: {
            fetch: async () => ({ messages: { fetch: async () => { throw new Error('missing message'); } } })
        }
    };

    try {
        const endInteraction = makeInteraction({ guildId, subcommand: 'end', messageId: ending.messageId });
        await giveawayCommand.execute(endInteraction, missingChannel);
        assert.equal(database.getGiveaway.get(ending.messageId).ended, 0, 'a missing channel must not end the row');

        const endMissingMessage = makeInteraction({ guildId, subcommand: 'end', messageId: ending.messageId });
        await giveawayCommand.execute(endMissingMessage, missingMessage);
        assert.equal(database.getGiveaway.get(ending.messageId).ended, 0, 'a missing message must not end the row');

        const rerollMissingChannel = makeInteraction({ guildId, subcommand: 'reroll', messageId: rerolling.messageId });
        await giveawayCommand.execute(rerollMissingChannel, missingChannel);
        assert.equal(rerollMissingChannel.replies.length, 0);

        const rerollMissingMessage = makeInteraction({ guildId, subcommand: 'reroll', messageId: rerolling.messageId });
        await giveawayCommand.execute(rerollMissingMessage, missingMessage);
        assert.equal(rerollMissingMessage.replies.length, 0);
    } finally {
        cleanup(ending.messageId);
        cleanup(rerolling.messageId);
    }
});
