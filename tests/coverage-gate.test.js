const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const workflow = fs.readFileSync(path.join(root, '.github/workflows/ci.yml'), 'utf8');
const script = pkg.scripts['test:coverage'] || '';

function threshold(flag) {
    const match = script.match(new RegExp(`--${flag}=(\\d+(?:\\.\\d+)?)`));
    return match ? Number(match[1]) : null;
}

test('coverage script collects source coverage', () => {
    assert.ok(script, 'package.json is missing the test:coverage script');
    assert.match(script, /--experimental-test-coverage\b/, 'coverage collection must stay enabled');
    assert.match(
        script,
        /--test-coverage-include=["']src\/\*\*["']/,
        'coverage must be limited to src/** so test files cannot dilute the floor',
    );
});

test('coverage thresholds cannot be lowered silently', () => {
    const floors = { 'test-coverage-lines': 74, 'test-coverage-branches': 71, 'test-coverage-functions': 78 };
    for (const [flag, floor] of Object.entries(floors)) {
        const value = threshold(flag);
        assert.ok(value !== null, `missing --${flag}= threshold`);
        assert.ok(
            value >= floor,
            `--${flag}=${value} is below the agreed floor of ${floor}; raise coverage instead of lowering the gate`,
        );
    }
});

test('CI runs the coverage gate in the required test job', () => {
    assert.match(workflow, /^ {2}test:$/m, 'the required "test" job must keep its name');
    assert.match(workflow, /run: npm run test:coverage\b/, 'the test job must run npm run test:coverage');
});
