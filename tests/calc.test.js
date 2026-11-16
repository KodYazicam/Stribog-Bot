const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(path.join(__dirname, '../src/commands/utility/calc.js'), 'utf8');
const match = source.match(/function safeEval[\s\S]*$/);
assert.ok(match);
const sandbox = { module: { exports: {} }, exports: {} };
vm.runInNewContext(`${match[0]}\nmodule.exports = safeEval;`, sandbox);
const safeEval = sandbox.module.exports;

test('evaluates arithmetic without eval', () => {
    assert.equal(safeEval('2+2'), 4);
    assert.equal(safeEval('10/2'), 5);
    assert.equal(safeEval('2*4'), 8);
    assert.equal(safeEval('1/0'), null);
});

test('handles exponentiation, unary minus and spaces', () => {
    const cases = [
        ['2^3', 8],
        ['2**3', 8],
        ['2**3**2', 512],
        ['2*-3', -6],
        ['10--3', 13],
        ['2/-4', -0.5],
        ['-(2+3)', -5],
        ['2**-1', 0.5],
        ['1 + 2', 3],
        [' 3 * (4 + 5) ', 27],
        ['3+4*2', 11],
        ['(2+3)*4', 20],
        ['5%2', 1]
    ];

    for (const [expression, expected] of cases) {
        assert.equal(safeEval(expression), expected, expression);
    }
});

test('rejects malformed and unsafe expressions', () => {
    for (const expression of ['1..2', '(1+2', '2+', '', 'abc', '2;3', '5%0']) {
        assert.equal(safeEval(expression), null, expression);
    }
});

const calc = require('../src/commands/utility/calc');

async function run(expression) {
    const replies = [];
    await calc.execute({
        options: { getString: () => expression },
        reply: async (payload) => replies.push(payload.embeds[0].data)
    });
    return replies[0];
}

function resultOf(embed) {
    const resultField = (embed.fields || []).find(field => field.name === 'Result');
    assert.ok(resultField, `expected a Result field, got: ${JSON.stringify(embed)}`);
    return resultField.value.replace(/[` ,]/g, '');
}

test('command ignores spaces around operators', async () => {
    const embed = await run('1 + 2');
    assert.equal(resultOf(embed), '3');
});

test('command evaluates exponentiation and unary minus', async () => {
    assert.equal(resultOf(await run('2^3')), '8');
    assert.equal(resultOf(await run('2*-3')), '-6');
    assert.equal(resultOf(await run('2/-4')), '-0.5');
});

test('command reports invalid characters and malformed input', async () => {
    const invalidCharacters = await run('2;3');
    assert.match(invalidCharacters.description, /Invalid characters/);

    const malformed = await run('(1+2');
    assert.match(malformed.description, /Invalid expression/);
});
