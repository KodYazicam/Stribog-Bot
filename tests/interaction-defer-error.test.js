const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Collection, PermissionFlagsBits } = require('discord.js');

require('./helpers/test-db');
const interactionCreate = require('../src/events/interactionCreate');

function makeClient(command) {
    return {
        commands: new Collection([[command.data.name, command]]),
        cooldowns: new Collection()
    };
}

function makeInteraction(commandName) {
    const calls = [];
    return {
        commandName,
        guild: { id: 'defer-error-guild' },
        channel: { id: 'defer-error-channel' },
        member: {
            permissions: { has: permission => permission === PermissionFlagsBits.Administrator }
        },
        user: { id: 'defer-error-user' },
        replied: false,
        deferred: false,
        calls,
        isChatInputCommand: () => true,
        isAutocomplete: () => false,
        isButton: () => false,
        isStringSelectMenu: () => false,
        isModalSubmit: () => false,
        async reply(payload) {
            calls.push({ kind: 'reply', payload });
            this.replied = true;
            return payload;
        },
        async deferReply(payload) {
            calls.push({ kind: 'deferReply', payload });
            this.deferred = true;
        },
        async followUp(payload) {
            calls.push({ kind: 'followUp', payload });
            return payload;
        },
        async editReply(payload) {
            calls.push({ kind: 'editReply', payload });
            this.replied = true;
            return payload;
        }
    };
}

async function dispatch(command, interaction) {
    const originalError = console.error;
    console.error = () => {};
    try {
        await interactionCreate.execute(interaction, makeClient(command));
    } finally {
        console.error = originalError;
    }
}

test('a command that throws after deferReply completes the deferred reply', async () => {
    const command = {
        data: { name: 'defer-then-throw' },
        cooldown: 1,
        async execute(interaction) {
            await interaction.deferReply();
            throw new Error('boom after defer');
        }
    };
    const interaction = makeInteraction(command.data.name);

    await dispatch(command, interaction);

    assert.deepEqual(
        interaction.calls.map(call => call.kind),
        ['deferReply', 'editReply'],
        'the deferred interaction must be completed with editReply, not a followUp'
    );
    assert.equal(interaction.replied, true);
    assert.equal(interaction.calls[1].payload.embeds[0].data.title, 'Error');
});

test('a command that throws after a real reply still uses followUp', async () => {
    const command = {
        data: { name: 'reply-then-throw' },
        cooldown: 1,
        async execute(interaction) {
            await interaction.reply({ content: 'partial result' });
            throw new Error('boom after reply');
        }
    };
    const interaction = makeInteraction(command.data.name);

    await dispatch(command, interaction);

    assert.deepEqual(
        interaction.calls.map(call => call.kind),
        ['reply', 'followUp'],
        'an already replied interaction cannot editReply and must use followUp'
    );
});

test('a command that throws before acknowledging still uses reply', async () => {
    const command = {
        data: { name: 'throw-before-ack' },
        cooldown: 1,
        async execute() {
            throw new Error('boom before ack');
        }
    };
    const interaction = makeInteraction(command.data.name);

    await dispatch(command, interaction);

    assert.deepEqual(
        interaction.calls.map(call => call.kind),
        ['reply'],
        'an unacknowledged interaction must be answered with reply'
    );
    assert.equal(interaction.replied, true);
});
