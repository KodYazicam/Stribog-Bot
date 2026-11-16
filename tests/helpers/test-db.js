const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// `node --test` runs every test file in its own child process. Point each one at
// a private database so parallel writers cannot hit SQLITE_BUSY on data/bot.db.
// Require this module before anything that pulls in src/utils/database.
if (!process.env.STRIBOG_DB_PATH) {
    const base = path.join(
        os.tmpdir(),
        `stribog-test-${process.pid}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
    );

    process.env.STRIBOG_DB_PATH = `${base}.db`;

    process.once('exit', () => {
        for (const suffix of ['', '-wal', '-shm']) {
            try {
                fs.rmSync(`${base}.db${suffix}`, { force: true });
            } catch {
                // best effort: never fail a test run during cleanup
            }
        }
    });
}

module.exports = { dbPath: process.env.STRIBOG_DB_PATH };
