const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

const pkg = require('../package.json');
const lock = require('../package-lock.json');
const readme = read('README.md');
const readmeTr = read('README.tr.md');
const ci = read('.github/workflows/ci.yml');

function minimumMajor(range) {
    const match = String(range || '').match(/>=\s*(\d+)/);
    return match ? Number(match[1]) : null;
}

const declaredFloor = minimumMajor(pkg.engines && pkg.engines.node);

test('engines declares the Node floor that better-sqlite3 requires', () => {
    assert.equal(
        declaredFloor,
        22,
        `package.json engines.node is ${pkg.engines && pkg.engines.node}`
    );
});

test('lockfile root package keeps the same engine floor', () => {
    assert.equal(lock.packages[''].engines.node, pkg.engines.node);
});

test('every production dependency supports the declared floor', () => {
    for (const name of Object.keys(pkg.dependencies || {})) {
        const entry = lock.packages[`node_modules/${name}`];
        assert.ok(entry, `missing lockfile entry for ${name}`);
        const dependencyFloor = minimumMajor(entry.engines && entry.engines.node);
        if (dependencyFloor === null) continue;
        assert.ok(
            dependencyFloor <= declaredFloor,
            `${name} requires Node >=${dependencyFloor}, above engines.node ${pkg.engines.node}`
        );
    }
});

test('CI pins the declared floor so it is actually tested', () => {
    const pin = (ci.match(/node-version:\s*(\d+)/) || [])[1];
    assert.equal(Number(pin), declaredFloor, '.github/workflows/ci.yml node-version drifted');
});

test('English README advertises the declared floor', () => {
    assert.ok(readme.includes(`Node.js-${declaredFloor}+`), 'README.md badge misses the floor');
    assert.ok(
        readme.includes(`Version ${declaredFloor}.0.0 or higher`),
        'README.md requirements table misses the floor'
    );
    assert.ok(
        readme.includes(`v${declaredFloor}.x.x`),
        'README.md node --version example misses the floor'
    );
});

test('Turkish README advertises the declared floor', () => {
    assert.ok(readmeTr.includes(`Node.js-${declaredFloor}+`), 'README.tr.md badge misses the floor');
    assert.ok(
        readmeTr.includes(`${declaredFloor}.0.0 veya üzeri`),
        'README.tr.md requirements table misses the floor'
    );
});
