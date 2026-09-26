const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(path.join(__dirname, '../src/commands/fun/pick.js'), 'utf8');

function extract(name) {
    const match = source.match(new RegExp(`function ${name}\\([\\s\\S]*?\\n}`));
    assert.ok(match, `function ${name} not found`);
    const sandbox = { module: { exports: {} }, exports: {}, Math };
    vm.runInNewContext(`${match[0]}\nmodule.exports = ${name};`, sandbox);
    return sandbox.module.exports;
}

const parseChoices = extract('parseChoices');
const pickRandom = extract('pickRandom');

test('parses comma-separated options and trims them', () => {
    const parsed = parseChoices(' pizza , sushi ,  burgers ');
    assert.equal(parsed.error, undefined);
    assert.deepEqual([...parsed.choices], ['pizza', 'sushi', 'burgers']);
});

test('rejects empty input, single options, and oversized lists', () => {
    assert.equal(parseChoices('').error, 'empty');
    assert.equal(parseChoices('   ').error, 'empty');
    assert.equal(parseChoices('only-one').error, 'need-two');
    assert.equal(parseChoices('a,,b').choices.length, 2);
    const many = Array.from({ length: 25 }, (_, i) => `opt${i}`).join(',');
    assert.equal(parseChoices(many).error, 'too-many');
    assert.equal(parseChoices(many).max, 20);
});

test('picks only from the given choices', () => {
    const choices = ['a', 'b', 'c'];
    for (let i = 0; i < 50; i++) {
        assert.ok(choices.includes(pickRandom(choices)));
    }
});
