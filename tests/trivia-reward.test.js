const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EmbedBuilder } = require('discord.js');

const database = require('../src/utils/database');
const triviaCommand = require('../src/commands/fun/trivia');
const triviaButton = require('../src/buttons/trivia');

const { activeTrivia } = triviaCommand;

let sequence = 0;

function unique(prefix) {
    sequence += 1;
    return `${prefix}-${process.pid}-${Date.now()}-${sequence}`;
}

function makeCommandInteraction({ messageId, category = null, difficulty = null }) {
    const replies = [];
    return {
        options: {
            getString: (name) => (name === 'category' ? category : difficulty)
        },
        replies,
        deferred: false,
        async deferReply() { this.deferred = true; },
        async editReply(payload) {
            replies.push(payload);
            return { id: messageId };
        }
    };
}

function makeButtonInteraction({ userId, guildId, messageId, index }) {
    const replies = [];
    const message = {
        id: messageId,
        embeds: [new EmbedBuilder().setTitle('🧠 Trivia Question')],
        edited: null,
        async edit(payload) { message.edited = payload; }
    };
    return {
        customId: `trivia_${index}`,
        user: { id: userId, tag: `user-${userId}#0001` },
        guild: { id: guildId },
        message,
        replies,
        async reply(payload) { replies.push(payload); }
    };
}

function registerQuestion(messageId, { correctIndex, correctAnswer, difficulty }) {
    const allAnswers = ['answer-a', 'answer-b', 'answer-c', 'answer-d'];
    activeTrivia.set(messageId, {
        correctIndex,
        correctAnswer,
        allAnswers,
        answered: new Set(),
        question: 'question',
        difficulty
    });
}

function cleanUp({ userId, guildId, messageId }) {
    activeTrivia.delete(messageId);
    database.db.prepare('DELETE FROM guild_economy WHERE user_id = ? AND guild_id = ?').run(userId, guildId);
    database.db.prepare('DELETE FROM users WHERE id = ?').run(userId);
}

test('the trivia command registers the fetched question with four answer buttons', async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const fetchMock = t.mock.method(globalThis, 'fetch', async () => ({
        json: async () => ({
            response_code: 0,
            results: [{
                question: 'Which &amp; which?',
                correct_answer: 'C &amp; D',
                incorrect_answers: ['A', 'B', 'D'],
                category: 'Science &amp; Nature',
                difficulty: 'medium'
            }]
        })
    }));
    const messageId = unique('trivia-command');
    const interaction = makeCommandInteraction({ messageId, category: 'science', difficulty: 'medium' });

    try {
        await triviaCommand.execute(interaction, {});

        assert.equal(fetchMock.mock.callCount(), 1);
        assert.match(fetchMock.mock.calls[0].arguments[0], /category=17/);
        assert.match(fetchMock.mock.calls[0].arguments[0], /difficulty=medium/);

        const trivia = activeTrivia.get(messageId);
        assert.ok(trivia, 'the question should be registered for the button handler');
        assert.equal(trivia.allAnswers.length, 4);
        assert.equal(trivia.allAnswers[trivia.correctIndex], 'C & D');
        assert.equal(interaction.replies[0].components[0].components.length, 4);

        t.mock.timers.tick(30000);
        await new Promise((resolve) => setImmediate(resolve));

        assert.equal(activeTrivia.get(messageId), undefined, 'the question should expire after 30 seconds');
        assert.equal(interaction.replies.length, 2, 'the expired question should be edited in place');
    } finally {
        activeTrivia.delete(messageId);
    }
});

test('the trivia command reports an API failure without registering a question', async (t) => {
    t.mock.method(globalThis, 'fetch', async () => ({
        json: async () => ({ response_code: 1, results: [] })
    }));
    const messageId = unique('trivia-command');
    const interaction = makeCommandInteraction({ messageId });
    try {
        await triviaCommand.execute(interaction, {});

        assert.equal(activeTrivia.get(messageId), undefined);
        assert.equal(interaction.replies.length, 1);
        assert.match(JSON.stringify(interaction.replies[0]), /Failed to fetch trivia question/);
    } finally {
        activeTrivia.delete(messageId);
    }
});

test('the trivia command reports a network error without registering a question', async (t) => {
    t.mock.method(globalThis, 'fetch', async () => {
        throw new Error('offline');
    });
    const messageId = unique('trivia-command');
    const interaction = makeCommandInteraction({ messageId });
    try {
        await triviaCommand.execute(interaction, {});

        assert.equal(activeTrivia.get(messageId), undefined);
        assert.match(JSON.stringify(interaction.replies[0]), /An error occurred while fetching the trivia question/);
    } finally {
        activeTrivia.delete(messageId);
    }
});

test('a correct answer credits the guild economy and not the retired users table', async () => {
    const userId = unique('trivia-user');
    const guildId = unique('trivia-guild');
    const messageId = unique('trivia-message');
    registerQuestion(messageId, { correctIndex: 2, correctAnswer: 'answer-c', difficulty: 'hard' });

    const interaction = makeButtonInteraction({ userId, guildId, messageId, index: 2 });
    try {
        await triviaButton.execute(interaction, {});

        const row = database.getEconomy.get(userId, guildId);
        assert.ok(row, 'guild_economy row should exist after a correct answer');
        assert.equal(row.balance, 30, 'hard trivia should add 30 coins to the guild balance');
        assert.equal(database.getUser.get(userId), undefined, 'trivia must not write to the retired users table');
    } finally {
        cleanUp({ userId, guildId, messageId });
    }
});

test('a wrong answer awards nothing', async () => {
    const userId = unique('trivia-user');
    const guildId = unique('trivia-guild');
    const messageId = unique('trivia-message');
    registerQuestion(messageId, { correctIndex: 3, correctAnswer: 'answer-d', difficulty: 'easy' });

    const interaction = makeButtonInteraction({ userId, guildId, messageId, index: 0 });
    try {
        await triviaButton.execute(interaction, {});

        const row = database.getEconomy.get(userId, guildId);
        assert.ok(!row || row.balance === 0, 'a wrong answer must not change the balance');
        assert.equal(database.getUser.get(userId), undefined, 'trivia must not write to the retired users table');
    } finally {
        cleanUp({ userId, guildId, messageId });
    }
});
