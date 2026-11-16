const { test } = require('node:test');
const assert = require('node:assert/strict');

const database = require('../src/utils/database');
const reminder = require('../src/commands/utility/reminder');

let sequence = 0;

function unique(prefix) {
    sequence += 1;
    return `${prefix}-${process.pid}-${Date.now()}-${sequence}`;
}

const THIRTY_MINUTES = 30 * 60 * 1000;

function makeSetInteraction({ guildId }) {
    const userId = unique('reminder-user');
    const channelId = unique('reminder-channel');
    const message = unique('reminder-message');
    const replies = [];

    return {
        userId,
        channelId,
        message,
        replies,
        interaction: {
            user: { id: userId },
            channel: { id: channelId },
            guild: guildId === null ? null : { id: guildId || unique('reminder-guild') },
            options: {
                getSubcommand: () => 'set',
                getString: (name) => (name === 'time' ? '30m' : message)
            },
            reply: async (payload) => {
                replies.push(payload);
                return payload;
            }
        }
    };
}

function cleanup(userId) {
    database.db.prepare('DELETE FROM reminders WHERE user_id = ?').run(userId);
}

test('/reminder set stores the message and due time in the matching columns', async () => {
    const { interaction, userId, channelId, message, replies } = makeSetInteraction({});

    const startedAt = Date.now();
    try {
        await reminder.execute(interaction);
        const finishedAt = Date.now();

        assert.equal(replies.length, 1, 'the confirmation embed should be sent');

        const row = database.getUserReminders.all(userId).at(-1);
        assert.ok(row, 'the reminder should be persisted');
        assert.equal(row.channel_id, channelId);
        assert.equal(row.message, message, 'message must hold the reminder text, not a guild id');
        assert.equal(typeof row.remind_at, 'number', 'remind_at must stay an integer timestamp');
        assert.ok(row.remind_at >= startedAt + THIRTY_MINUTES, 'remind_at should be the requested due time');
        assert.ok(row.remind_at <= finishedAt + THIRTY_MINUTES, 'remind_at should not drift past the request');
        assert.ok(row.created_at >= startedAt && row.created_at <= finishedAt, 'created_at should be the insertion time');

        const due = database.getReminders.all(row.remind_at);
        assert.ok(due.some(item => item.id === row.id), 'the scheduler query should return the reminder');
    } finally {
        cleanup(userId);
    }
});

test('/reminder set works in DMs where there is no guild', async () => {
    const { interaction, userId, message } = makeSetInteraction({ guildId: null });

    try {
        await assert.doesNotReject(() => reminder.execute(interaction));

        const row = database.getUserReminders.all(userId).at(-1);
        assert.ok(row, 'the DM reminder should be persisted');
        assert.equal(row.message, message);
        assert.equal(typeof row.remind_at, 'number');
    } finally {
        cleanup(userId);
    }
});
