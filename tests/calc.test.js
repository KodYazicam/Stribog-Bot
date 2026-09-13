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
