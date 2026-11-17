const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Collection, PermissionFlagsBits } = require('discord.js');

require('./helpers/test-db');
const database = require('../src/utils/database');
const ticketButtons = require('../src/buttons/ticket');

const BOT_ID = '900000000000000001';
let sequence = 0;

function unique(prefix) {
    sequence += 1;
    return `${prefix}-${process.pid}-${Date.now()}-${sequence}`;
}

function makeGuild({ supportRole = null } = {}) {
    const id = unique('guild');
    database.insertGuild.run(id);
    if (supportRole) {
        database.updateGuildSetting('support_role').run(supportRole, id);
    }
    return id;
}

function makeTicket(guildId, channelId, ownerId) {
    database.insertTicket.run(channelId, guildId, ownerId, Date.now());
    return database.getTicket.get(channelId);
}

function makeInteraction({
    customId,
    guildId,
    channelId,
    userId,
    roleIds = [],
    canManageChannels = false
}) {
    const calls = { replies: [], updates: [], deleted: 0 };
    const member = {
        id: userId,
        permissions: {
            has: permission => canManageChannels && permission === PermissionFlagsBits.ManageChannels
        },
        roles: { cache: new Collection(roleIds.map(id => [id, { id }])) }
    };

    const interaction = {
        customId,
        guild: { id: guildId, channels: { fetch: async () => null } },
        channel: {
            id: channelId,
            delete: async () => {
                calls.deleted += 1;
            }
        },
        member,
        user: { id: userId, tag: `user-${userId}#0001` },
        client: { user: { id: BOT_ID } },
        replied: false,
        deferred: false,
        async reply(payload) {
            this.replied = true;
            calls.replies.push(payload);
            return payload;
        },
        async update(payload) {
            calls.updates.push(payload);
            return payload;
        }
    };

    return { interaction, calls };
}

function embedDescription(payload) {
    return payload?.embeds?.[0]?.data?.description ?? '';
}

async function withCapturedTimers(run) {
    const timers = [];
    const originalSetTimeout = global.setTimeout;
    global.setTimeout = (callback, delay, ...args) => {
        timers.push({ callback, delay, args });
        return { unref() { return this; } };
    };
    try {
        await run();
    } finally {
        global.setTimeout = originalSetTimeout;
    }
    return timers;
}

test('confirming a close is denied for a participant who is neither owner nor staff', async () => {
    const guildId = makeGuild();
    const channelId = unique('channel');
    const ownerId = unique('owner');
    makeTicket(guildId, channelId, ownerId);

    const { interaction, calls } = makeInteraction({
        customId: 'ticket_confirm_close',
        guildId,
        channelId,
        userId: unique('participant')
    });

    const timers = await withCapturedTimers(() => ticketButtons.execute(interaction, interaction.client, ['confirm', 'close']));

    assert.equal(calls.replies.length, 1, 'the denial must be visible to the user');
    assert.match(embedDescription(calls.replies[0]), /Only the ticket owner or staff/);
    assert.equal(calls.updates.length, 0, 'a denied close must not update the prompt');
    assert.equal(database.getTicket.get(channelId).closed, 0, 'a denied close must not persist');
    assert.equal(calls.deleted, 0);
    assert.equal(timers.length, 0, 'a denied close must not schedule a deletion');
});

test('the ticket owner can confirm a close', async () => {
    const guildId = makeGuild();
    const channelId = unique('channel');
    const ownerId = unique('owner');
    makeTicket(guildId, channelId, ownerId);

    const { interaction, calls } = makeInteraction({
        customId: 'ticket_confirm_close',
        guildId,
        channelId,
        userId: ownerId
    });

    const timers = await withCapturedTimers(() => ticketButtons.execute(interaction, interaction.client, ['confirm', 'close']));

    assert.equal(calls.replies.length, 0);
    assert.equal(calls.updates.length, 1);
    assert.match(embedDescription(calls.updates[0]), /deleted in 5 seconds/);
    assert.equal(database.getTicket.get(channelId).closed, 1);
    assert.equal(timers.length, 1);
    assert.equal(timers[0].delay, 5000);
});

test('a member with the configured support role can confirm a close', async () => {
    const supportRole = unique('role');
    const guildId = makeGuild({ supportRole });
    const channelId = unique('channel');
    makeTicket(guildId, channelId, unique('owner'));

    const { interaction, calls } = makeInteraction({
        customId: 'ticket_confirm_close',
        guildId,
        channelId,
        userId: unique('staff'),
        roleIds: [supportRole]
    });

    const timers = await withCapturedTimers(() => ticketButtons.execute(interaction, interaction.client, ['confirm', 'close']));

    assert.equal(calls.replies.length, 0);
    assert.equal(calls.updates.length, 1);
    assert.equal(database.getTicket.get(channelId).closed, 1);
    assert.equal(timers.length, 1);
});

test('a stale confirmation button does not delete a non-ticket channel', async () => {
    const guildId = makeGuild();
    const channelId = unique('channel');

    const { interaction, calls } = makeInteraction({
        customId: 'ticket_confirm_close',
        guildId,
        channelId,
        userId: unique('user')
    });

    const timers = await withCapturedTimers(() => ticketButtons.execute(interaction, interaction.client, ['confirm', 'close']));

    assert.equal(calls.replies.length, 1);
    assert.match(embedDescription(calls.replies[0]), /This is not a ticket channel/);
    assert.equal(calls.updates.length, 0);
    assert.equal(timers.length, 0, 'a stale button must not schedule a deletion');
    assert.equal(calls.deleted, 0);
});

test('claiming is denied for a participant who is neither owner nor staff', async () => {
    const guildId = makeGuild();
    const channelId = unique('channel');
    makeTicket(guildId, channelId, unique('owner'));

    const { interaction, calls } = makeInteraction({
        customId: 'ticket_claim',
        guildId,
        channelId,
        userId: unique('participant')
    });

    await ticketButtons.execute(interaction, interaction.client, ['claim']);

    assert.equal(calls.replies.length, 1);
    assert.match(embedDescription(calls.replies[0]), /Only the ticket owner or staff/);
});

test('staff can claim a ticket', async () => {
    const guildId = makeGuild();
    const channelId = unique('channel');
    makeTicket(guildId, channelId, unique('owner'));

    const { interaction, calls } = makeInteraction({
        customId: 'ticket_claim',
        guildId,
        channelId,
        userId: unique('staff'),
        canManageChannels: true
    });

    await ticketButtons.execute(interaction, interaction.client, ['claim']);

    assert.equal(calls.replies.length, 1);
    assert.match(embedDescription(calls.replies[0]), /has been claimed by/);
});

test('creating a ticket from the panel persists a ticket row and posts the welcome message', async () => {
    const guildId = makeGuild();
    database.updateGuildSetting('ticket_category').run(unique('category'), guildId);
    const channelId = unique('channel');
    const userId = unique('user');

    const { interaction, calls } = makeInteraction({
        customId: 'ticket_create',
        guildId,
        channelId,
        userId
    });

    const created = { id: channelId, sent: [], send: async payload => created.sent.push(payload) };
    interaction.guild.channels.create = async () => created;

    await ticketButtons.execute(interaction, interaction.client, ['create']);

    assert.equal(database.getTicket.get(channelId).user_id, userId);
    assert.equal(created.sent.length, 1);
    assert.equal(calls.replies.length, 1);
});

test('the ticket owner can open the close prompt and cancel it', async () => {
    const guildId = makeGuild();
    const channelId = unique('channel');
    const ownerId = unique('owner');
    makeTicket(guildId, channelId, ownerId);

    const { interaction, calls } = makeInteraction({
        customId: 'ticket_close',
        guildId,
        channelId,
        userId: ownerId
    });

    await ticketButtons.execute(interaction, interaction.client, ['close']);
    assert.equal(calls.replies.length, 1);
    assert.match(embedDescription(calls.replies[0]), /Are you sure you want to close this ticket/);

    const cancel = makeInteraction({
        customId: 'ticket_cancel_close',
        guildId,
        channelId,
        userId: ownerId
    });
    await ticketButtons.execute(cancel.interaction, cancel.interaction.client, ['cancel']);
    assert.equal(cancel.calls.updates.length, 1);
    assert.match(embedDescription(cancel.calls.updates[0]), /close cancelled/);
});

test('opening the close prompt is denied for a participant who is neither owner nor staff', async () => {
    const guildId = makeGuild();
    const channelId = unique('channel');
    makeTicket(guildId, channelId, unique('owner'));

    const { interaction, calls } = makeInteraction({
        customId: 'ticket_close',
        guildId,
        channelId,
        userId: unique('participant')
    });

    await ticketButtons.execute(interaction, interaction.client, ['close']);

    assert.equal(calls.replies.length, 1);
    assert.match(embedDescription(calls.replies[0]), /Only the ticket owner or staff/);
});

test('the close prompt refuses a channel that is not a ticket', async () => {
    const guildId = makeGuild();
    const { interaction, calls } = makeInteraction({
        customId: 'ticket_close',
        guildId,
        channelId: unique('channel'),
        userId: unique('user')
    });

    await ticketButtons.execute(interaction, interaction.client, ['close']);

    assert.equal(calls.replies.length, 1);
    assert.match(embedDescription(calls.replies[0]), /This is not a ticket channel/);
});
