const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildTranscriptText } = require('../src/utils/transcript');

test('builds a text transcript from channel messages', async () => {
    const messages = [
        {
            id: '2',
            createdTimestamp: 2,
            author: { tag: 'b#2', id: '2' },
            cleanContent: 'bye',
            content: 'bye',
            attachments: { size: 0 },
            embeds: []
        },
        {
            id: '1',
            createdTimestamp: 1,
            author: { tag: 'a#1', id: '1' },
            cleanContent: 'hello',
            content: 'hello',
            attachments: { size: 0 },
            embeds: []
        }
    ];
    const channel = {
        id: 'c1',
        name: 'ticket-1',
        messages: {
            fetch: async () => {
                const values = () => messages.splice(0, messages.length);
                return { size: 2, values };
            }
        }
    };
    const text = await buildTranscriptText(channel);
    assert.match(text, /ticket-1/);
    assert.ok(text.indexOf('hello') < text.indexOf('bye'));
});
