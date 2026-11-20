const { test } = require('node:test');
const assert = require('node:assert/strict');

require('./helpers/test-db');
const database = require('../src/utils/database');
const permissionsCommand = require('../src/commands/admin/permissions');

let sequence = 0;

function unique(prefix) {
    sequence += 1;
    return `${prefix}-${process.pid}-${Date.now()}-${sequence}`;
}

function cleanup(guildId) {
    database.db.prepare('DELETE FROM disabled_commands WHERE guild_id = ?').run(guildId);
}

function makeInteraction({ guildId, command, channel = null }) {
    const replies = [];
    return {
        guild: { id: guildId },
        options: {
            getSubcommand: () => 'enable',
            getString: (name) => (name === 'command' ? command : null),
            getChannel: () => channel
        },
        replies,
        reply: async (payload) => { replies.push(payload); }
    };
}

function replyDescription(interaction) {
    return interaction.replies.at(-1)?.embeds?.[0]?.data?.description || '';
}

function disabledRows(guildId, command) {
    return database.getDisabledCommands
        .all(guildId)
        .filter(row => row.command_name === command);
}

test('server-wide enable clears channel-scoped disables too', async () => {
    const guildId = unique('guild');
    const command = unique('cmd');
    const channelA = unique('channel');
    const channelB = unique('channel');

    database.disableCommand.run(guildId, command, channelA);
    database.disableCommand.run(guildId, command, channelB);

    const interaction = makeInteraction({ guildId, command });

    try {
        await permissionsCommand.execute(interaction, {});

        assert.deepEqual(disabledRows(guildId, command), []);
        assert.equal(database.isCommandDisabled.get(guildId, command, channelA), undefined);
        assert.equal(database.isCommandDisabled.get(guildId, command, channelB), undefined);
        assert.match(replyDescription(interaction), /enabled server-wide/);
    } finally {
        cleanup(guildId);
    }
});

test('channel enable removes only that channel row and keeps the server-wide rule', async () => {
    const guildId = unique('guild');
    const command = unique('cmd');
    const channelA = unique('channel');
    const channelB = unique('channel');

    database.disableCommand.run(guildId, command, null);
    database.disableCommand.run(guildId, command, channelA);

    const interaction = makeInteraction({ guildId, command, channel: { id: channelA } });

    try {
        await permissionsCommand.execute(interaction, {});

        const rows = disabledRows(guildId, command);
        assert.equal(rows.length, 1, 'the server-wide row must survive a channel-scoped enable');
        assert.equal(rows[0].channel_id, null);
        assert.ok(database.isCommandDisabled.get(guildId, command, channelA));
        assert.ok(database.isCommandDisabled.get(guildId, command, channelB));
        assert.match(replyDescription(interaction), /still disabled server-wide/);
    } finally {
        cleanup(guildId);
    }
});

test('channel enable lifts a channel-only rule without touching other channels', async () => {
    const guildId = unique('guild');
    const command = unique('cmd');
    const channelA = unique('channel');
    const channelB = unique('channel');

    database.disableCommand.run(guildId, command, channelA);
    database.disableCommand.run(guildId, command, channelB);

    const interaction = makeInteraction({ guildId, command, channel: { id: channelA } });

    try {
        await permissionsCommand.execute(interaction, {});

        const rows = disabledRows(guildId, command);
        assert.deepEqual(rows.map(row => row.channel_id), [channelB]);
        assert.equal(database.isCommandDisabled.get(guildId, command, channelA), undefined);
        assert.ok(database.isCommandDisabled.get(guildId, command, channelB));
        assert.match(replyDescription(interaction), /enabled in/);
    } finally {
        cleanup(guildId);
    }
});
