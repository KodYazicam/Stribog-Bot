const { test } = require('node:test');
const assert = require('node:assert/strict');
const { safeHandlerName } = require('../src/utils/handlers');

test('rejects path-like custom ids', () => {
    assert.equal(safeHandlerName('../etc/passwd'), null);
    assert.equal(safeHandlerName('ticket'), 'ticket');
    assert.equal(safeHandlerName('unknown'), null);
});
