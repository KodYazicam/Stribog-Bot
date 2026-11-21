const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Collection } = require('discord.js');

require('./helpers/test-db');
const database = require('../src/utils/database');
const messageDelete = require('../src/events/messageDelete');

let sequence = 0;

function unique(prefix) {
    sequence += 1;
    return `${prefix}-${process.pid}-${Date.now()}-${sequence}`;
}

function makeGuild() {
    const sent = [];
    const logChannel = {
        id: unique('log'),
        async send(payload) {
            // Snapshot at send time: discord.js serialises the builder when sending.
            sent.push(JSON.parse(JSON.stringify(payload.embeds[0].toJSON())));
        }
    };
    const guild = {
        id: unique('guild'),
        channels: { fetch: async () => logChannel },
        fetchAuditLogs: async () => ({ entries: new Collection() })
    };
    database.insertGuild.run(guild.id);
    database.updateGuildSetting('log_channel').run(logChannel.id, guild.id);
    return { guild, sent };
}

function makeAuthor() {
    return {
        id: unique('author'),
        tag: 'deleted-user#0001',
        bot: false,
        displayAvatarURL: () => 'https://example.invalid/avatar.png'
    };
}

function makeMessage({ guild, content = null, attachments = [], author = null } = {}) {
    const channel = { id: unique('channel'), toString: () => '#logs' };
    return {
        id: unique('message'),
        guild,
        channel,
        partial: false,
        content,
        author,
        attachments: new Collection(attachments.map((url, index) => [`attachment-${index}`, { url }]))
    };
}

function makePartialMessage({ guild, fetchResult } = {}) {
    const channel = { id: unique('channel'), toString: () => '#logs' };
    return {
        id: unique('message'),
        guild,
        channel,
        partial: true,
        content: null,
        author: null,
        // A message that was never cached arrives without an attachments collection.
        attachments: undefined,
        async fetch() {
            if (fetchResult instanceof Error) throw fetchResult;
            return fetchResult;
        }
    };
}

function fieldNames(embed) {
    return (embed.fields || []).map(field => field.name);
}

function fieldValue(embed, name) {
    return (embed.fields || []).find(field => field.name === name)?.value;
}

test('a partial message without cached data is logged without throwing', async () => {
    const { guild, sent } = makeGuild();
    const message = makePartialMessage({ guild, fetchResult: new Error('Unknown Message') });

    await messageDelete.execute(message);

    assert.equal(sent.length, 1);
    assert.equal(sent[0].title, 'Message Deleted');
    assert.equal(fieldValue(sent[0], 'Author'), 'Unknown');
    assert.equal(fieldNames(sent[0]).includes('Attachments'), false);
    assert.equal(fieldNames(sent[0]).includes('Content'), false);
});

test('a fetchable partial message logs the fetched content and attachments', async () => {
    const { guild, sent } = makeGuild();
    const fetched = makeMessage({
        guild,
        content: 'hello from cache',
        attachments: ['https://cdn.example.invalid/a.png'],
        author: makeAuthor()
    });
    const message = makePartialMessage({ guild, fetchResult: fetched });

    await messageDelete.execute(message);

    assert.equal(sent.length, 1);
    assert.equal(fieldValue(sent[0], 'Content'), 'hello from cache');
    assert.equal(fieldValue(sent[0], 'Attachments'), 'https://cdn.example.invalid/a.png');
    assert.match(fieldValue(sent[0], 'Author'), /^deleted-user#0001 \(author-/);
});

test('a message with no attachments never adds an Attachments field', async () => {
    const { guild, sent } = makeGuild();
    const message = makeMessage({ guild, content: 'plain text', author: makeAuthor() });

    await messageDelete.execute(message);

    assert.equal(sent.length, 1);
    assert.equal(fieldValue(sent[0], 'Content'), 'plain text');
    assert.equal(fieldNames(sent[0]).includes('Attachments'), false);
});
