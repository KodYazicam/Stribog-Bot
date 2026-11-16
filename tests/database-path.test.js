const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const REPO_ROOT = path.join(__dirname, '..');

function childDbPath(env) {
    const baseEnv = { ...process.env, ...env };
    if (!env || !Object.prototype.hasOwnProperty.call(env, 'STRIBOG_DB_PATH')) {
        delete baseEnv.STRIBOG_DB_PATH;
    }
    return execFileSync(
        process.execPath,
        ['-e', "const database = require('./src/utils/database'); process.stdout.write(database.db.name);"],
        { cwd: REPO_ROOT, env: baseEnv, encoding: 'utf8' }
    ).trim();
}

test('a child process honours STRIBOG_DB_PATH', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stribog-db-override-'));
    const target = path.join(dir, 'custom.db');
    try {
        assert.equal(childDbPath({ STRIBOG_DB_PATH: target }), target);
    } finally {
        for (const suffix of ['', '-wal', '-shm']) {
            fs.rmSync(`${target}${suffix}`, { force: true });
        }
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test('the default database stays under data/bot.db', () => {
    assert.equal(
        childDbPath({}),
        path.join(REPO_ROOT, 'data', 'bot.db')
    );
});

test('the test helper points the database outside data/', () => {
    const helper = require('./helpers/test-db');
    const dbPath = helper.dbPath;

    assert.ok(path.isAbsolute(dbPath), `expected an absolute path, got ${dbPath}`);
    assert.equal(dbPath.startsWith(path.join(REPO_ROOT, 'data') + path.sep), false);
    assert.equal(dbPath.startsWith(os.tmpdir() + path.sep), true);
    assert.equal(require('../src/utils/database').db.name, dbPath);
});

test('the test helper removes its temp database on exit', () => {
    const baseEnv = { ...process.env };
    delete baseEnv.STRIBOG_DB_PATH;

    const output = execFileSync(
        process.execPath,
        ['-e', [
            "require('./tests/helpers/test-db');",
            "const fs = require('node:fs');",
            "const database = require('./src/utils/database');",
            "process.stdout.write(database.db.name + '|' + fs.existsSync(database.db.name));"
        ].join(' ')],
        { cwd: REPO_ROOT, env: baseEnv, encoding: 'utf8' }
    ).trim();

    const [dbPath, existed] = output.split('|');
    assert.equal(existed, 'true');
    assert.equal(fs.existsSync(dbPath), false);
    assert.equal(fs.existsSync(`${dbPath}-wal`), false);
    assert.equal(fs.existsSync(`${dbPath}-shm`), false);
});
