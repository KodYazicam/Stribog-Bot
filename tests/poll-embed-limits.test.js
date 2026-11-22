const { test } = require('node:test');
const assert = require('node:assert/strict');

const poll = require('../src/commands/fun/poll');
const embedCommand = require('../src/commands/utility/embed');

function pollInteraction({ question, options }) {
    const replies = [];
    const reactions = [];
    const values = { question };
    options.forEach((value, index) => {
        values[`option${index + 1}`] = value;
    });

    return {
        user: { tag: 'tester#0001' },
        replies,
        reactions,
        options: {
            getString: (name) => values[name] ?? null
        },
        async reply(payload) {
            replies.push(payload);
            return {
                async react(emoji) {
                    reactions.push(emoji);
                }
            };
        }
    };
}

function embedInteraction({ title, description, footer = null }) {
    const replies = [];
    const sent = [];
    const channel = {
        async send(payload) {
            sent.push(payload);
        }
    };

    return {
        user: { tag: 'tester#0001' },
        channel,
        replies,
        sent,
        options: {
            getString: (name) => ({ title, description, footer }[name] ?? null),
            getChannel: () => null
        },
        async reply(payload) {
            replies.push(payload);
        }
    };
}

function optionSchema(command, name) {
    const data = command.data.toJSON();
    return data.options.find((option) => option.name === name);
}

test('poll and embed declare Discord embed limits on their options', () => {
    assert.equal(optionSchema(poll, 'question').max_length, 253);
    for (let index = 1; index <= 5; index += 1) {
        assert.equal(optionSchema(poll, `option${index}`).max_length, 800);
    }

    assert.equal(optionSchema(embedCommand, 'title').max_length, 256);
    assert.equal(optionSchema(embedCommand, 'description').max_length, 4096);
    assert.equal(optionSchema(embedCommand, 'footer').max_length, 2048);
});

test('poll rejects a question that would overflow the embed title', async () => {
    const interaction = pollInteraction({
        question: 'q'.repeat(254),
        options: ['Yes', 'No']
    });

    await poll.execute(interaction);

    assert.equal(interaction.replies.length, 1);
    assert.equal(interaction.replies[0].ephemeral, true);
    assert.match(interaction.replies[0].content, /253/);
    assert.equal(interaction.reactions.length, 0);
});

test('poll rejects options that would overflow the embed description', async () => {
    const interaction = pollInteraction({
        question: 'Pick one',
        options: ['a'.repeat(820), 'b'.repeat(820), 'c'.repeat(820), 'd'.repeat(820), 'e'.repeat(820)]
    });

    await poll.execute(interaction);

    assert.equal(interaction.replies.length, 1);
    assert.equal(interaction.replies[0].ephemeral, true);
    assert.match(interaction.replies[0].content, /4096/);
    assert.equal(interaction.reactions.length, 0);
});

test('poll still builds a valid embed for normal input', async () => {
    const interaction = pollInteraction({
        question: 'Pineapple on pizza?',
        options: ['Yes', 'No']
    });

    await poll.execute(interaction);

    assert.equal(interaction.replies.length, 1);
    const embed = interaction.replies[0].embeds[0].data;
    assert.equal(embed.title, '📊 Pineapple on pizza?');
    assert.match(embed.description, /1️⃣ Yes/);
    assert.match(embed.description, /2️⃣ No/);
    assert.deepEqual(interaction.reactions, ['1️⃣', '2️⃣']);
});

test('embed rejects a title above the embed title limit', async () => {
    const interaction = embedInteraction({
        title: 't'.repeat(257),
        description: 'Body'
    });

    await embedCommand.execute(interaction);

    assert.equal(interaction.sent.length, 0);
    assert.equal(interaction.replies.length, 1);
    assert.equal(interaction.replies[0].ephemeral, true);
    assert.match(interaction.replies[0].content, /256/);
});

test('embed rejects a description above the embed description limit', async () => {
    const interaction = embedInteraction({
        title: 'Title',
        description: 'd'.repeat(4097)
    });

    await embedCommand.execute(interaction);

    assert.equal(interaction.sent.length, 0);
    assert.match(interaction.replies[0].content, /4096/);
});

test('embed rejects a footer above the embed footer limit', async () => {
    const interaction = embedInteraction({
        title: 'Title',
        description: 'Body',
        footer: 'f'.repeat(2049)
    });

    await embedCommand.execute(interaction);

    assert.equal(interaction.sent.length, 0);
    assert.match(interaction.replies[0].content, /2048/);
});

test('embed still sends a valid embed for normal input', async () => {
    const interaction = embedInteraction({
        title: 'Hello',
        description: 'World',
        footer: 'Footer'
    });

    await embedCommand.execute(interaction);

    assert.equal(interaction.sent.length, 1);
    const embed = interaction.sent[0].embeds[0].data;
    assert.equal(embed.title, 'Hello');
    assert.equal(embed.description, 'World');
    assert.equal(embed.footer.text, 'Footer');
    assert.equal(interaction.replies.length, 1);
    assert.equal(interaction.replies[0].ephemeral, true);
});
