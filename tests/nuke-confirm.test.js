const { test } = require('node:test');
const assert = require('node:assert/strict');

require('./helpers/test-db');
const nuke = require('../src/commands/moderation/nuke');

function makeCollector() {
    const handlers = new Map();
    return {
        on(event, handler) {
            handlers.set(event, handler);
            return this;
        },
        async emit(event, ...args) {
            const handler = handlers.get(event);
            if (handler) await handler(...args);
        }
    };
}

function makeHarness({ cloneFails = false } = {}) {
    const order = [];
    const sent = [];
    const collector = makeCollector();

    const channel = {
        id: 'channel-1',
        name: 'general',
        position: 3,
        clone: async () => {
            order.push('clone');
            if (cloneFails) throw new Error('Missing Permissions');
            return {
                setPosition: async () => { order.push('setPosition'); },
                send: async payload => { sent.push(payload); },
                toString: () => '<#new-channel>'
            };
        },
        delete: async () => { order.push('delete'); }
    };

    const response = {
        createMessageComponentCollector: () => collector
    };

    const interaction = {
        guild: { id: 'guild-1', channels: { fetch: async () => null } },
        channel,
        user: { id: 'user-1', tag: 'mod#0001' },
        replied: false,
        deferred: false,
        async reply() {
            this.replied = true;
            return response;
        },
        editReply: async () => {}
    };

    function makeButton(customId) {
        const button = {
            customId,
            user: { id: 'user-1' },
            deferred: false,
            replied: false,
            updates: [],
            followUps: [],
            async deferUpdate() {
                order.push('deferUpdate');
                button.deferred = true;
            },
            async update(payload) {
                order.push('update');
                button.updates.push(payload);
                button.replied = true;
            },
            async followUp(payload) {
                button.followUps.push(payload);
            }
        };
        return button;
    }

    return { interaction, collector, makeButton, order, sent };
}

test('confirming a nuke acknowledges the button before cloning the channel', async () => {
    const harness = makeHarness();
    await nuke.execute(harness.interaction);

    const confirm = harness.makeButton('nuke_confirm');
    await harness.collector.emit('collect', confirm);

    assert.equal(harness.order[0], 'deferUpdate', 'the confirm click must be acknowledged first');
    assert.ok(
        harness.order.indexOf('deferUpdate') < harness.order.indexOf('clone'),
        `deferUpdate must precede clone, got ${harness.order.join(' -> ')}`
    );
    assert.deepEqual(harness.order, ['deferUpdate', 'clone', 'setPosition', 'delete']);
    assert.equal(confirm.deferred, true);
    assert.equal(confirm.followUps.length, 0, 'a successful nuke must not send an error');
    assert.equal(harness.sent.length, 1, 'the nuked embed is still posted in the new channel');
});

test('a failed nuke replies with an ephemeral error instead of leaving the click unanswered', async () => {
    const harness = makeHarness({ cloneFails: true });
    await nuke.execute(harness.interaction);

    const confirm = harness.makeButton('nuke_confirm');
    const originalError = console.error;
    console.error = () => {};
    try {
        await harness.collector.emit('collect', confirm);
    } finally {
        console.error = originalError;
    }

    assert.equal(harness.order[0], 'deferUpdate', 'the click must be acknowledged even when the work fails');
    assert.equal(confirm.followUps.length, 1);
    assert.equal(confirm.followUps[0].ephemeral, true);
    assert.match(confirm.followUps[0].embeds[0].data.description, /Failed to nuke/);
    assert.equal(harness.sent.length, 0);
});

test('cancelling still updates the prompt without deferring', async () => {
    const harness = makeHarness();
    await nuke.execute(harness.interaction);

    const cancel = harness.makeButton('nuke_cancel');
    await harness.collector.emit('collect', cancel);

    assert.deepEqual(harness.order, ['update']);
    assert.equal(cancel.deferred, false);
    assert.equal(cancel.updates.length, 1);
    assert.match(cancel.updates[0].embeds[0].data.description, /cancelled/);
});
