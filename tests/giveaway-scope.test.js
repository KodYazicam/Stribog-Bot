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

function makeInteraction({ guildId, subcommand, messageId }) {
    const replies = [];
    return {
        commandName: 'giveaway',
        guild: { id: guildId },
        channel: { id: unique('invoker-channel') },
        user: { id: unique('user') },
        member: { permissions: { has: () => true } },
        options: {
            getSubcommand: () => subcommand,
            getString: name => (name === 'message_id' ? messageId : null)
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
