const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

function read(file) {
    return fs.readFileSync(path.join(root, file), 'utf8');
}

function serviceBlock(compose, name) {
    const lines = compose.split('\n');
    const start = lines.findIndex(line => line === `  ${name}:`);
    assert.notEqual(start, -1, `compose service "${name}" is missing`);

    let end = lines.length;
    for (let i = start + 1; i < lines.length; i++) {
        if (/^  [A-Za-z0-9_.-]+:$/.test(lines[i]) || /^[A-Za-z]/.test(lines[i])) {
            end = i;
            break;
        }
    }

    return lines.slice(start, end).join('\n');
}

test('Dockerfile installs production dependencies in a build stage', () => {
    const dockerfile = read('Dockerfile');

    assert.match(dockerfile, /^FROM node:22-bookworm-slim AS deps$/m);
    assert.match(dockerfile, /^RUN npm ci --omit=dev$/m);
    assert.match(dockerfile, /^COPY --from=deps \/app\/node_modules \.\/node_modules$/m);
});

test('runtime stage ships no compilers and runs as non-root', () => {
    const dockerfile = read('Dockerfile');
    const runtimeStage = dockerfile.slice(dockerfile.lastIndexOf('FROM '));

    assert.doesNotMatch(runtimeStage, /apt-get/);
    assert.match(runtimeStage, /useradd --uid 10001/);
    assert.match(runtimeStage, /^USER 10001$/m);
    assert.match(runtimeStage, /^ENV NODE_ENV=production$/m);
    assert.match(runtimeStage, /^CMD \["node", "src\/index\.js"\]$/m);
});

test('image persists SQLite under /app/data and never bakes the build context', () => {
    const dockerfile = read('Dockerfile');

    assert.match(dockerfile, /^VOLUME \["\/app\/data"\]$/m);
    assert.doesNotMatch(dockerfile, /COPY \. \./);
    assert.doesNotMatch(dockerfile, /^COPY .*\.env/m);
    // No HTTP surface exists, so a health check would only fake readiness.
    assert.doesNotMatch(dockerfile, /^HEALTHCHECK/m);
});

test('compose loads secrets from .env and keeps the database volume', () => {
    const compose = read('docker-compose.yml');
    const bot = serviceBlock(compose, 'bot');

    assert.match(bot, /^\s+env_file: \.env$/m);
    assert.match(bot, /NODE_ENV: production/);
    assert.match(bot, /- stribog-data:\/app\/data/);
    assert.match(compose, /^volumes:\n  stribog-data:\n    name: stribog-data$/m);
});

test('compose restarts the bot, reaps signals, and publishes no port', () => {
    const compose = read('docker-compose.yml');
    const bot = serviceBlock(compose, 'bot');

    assert.match(bot, /^\s+init: true$/m);
    assert.match(bot, /^\s+restart: unless-stopped$/m);
    assert.match(bot, /- no-new-privileges:true/);
    assert.doesNotMatch(bot, /^\s*ports:/m);
});

test('dockerignore keeps secrets, the database, and node_modules out of the context', () => {
    const ignore = read('.dockerignore').split('\n').map(line => line.trim());

    for (const entry of ['.env', '.git', 'data', 'node_modules', 'tests']) {
        assert.ok(ignore.includes(entry), `.dockerignore must exclude ${entry}`);
    }
});

test('CI builds the image on pull requests without registry credentials', () => {
    const ci = read('.github/workflows/ci.yml');

    assert.match(ci, /^ {2}docker:$/m);
    assert.match(ci, /docker build -t stribog:ci \./);
    assert.doesNotMatch(ci, /pull_request_target/);
    assert.doesNotMatch(ci, /docker\/login-action/);
});

test('README documents build, command deploy, upgrade, and volume backup', () => {
    const readme = read('README.md');

    assert.match(readme, /## 🐳 Docker/);
    assert.match(readme, /docker compose up -d --build/);
    assert.match(readme, /docker compose run --rm bot node src\/deploy-commands\.js/);
    assert.match(readme, /-v stribog-data:\/data/);
    assert.match(readme, /stribog-data\.tgz/);
});
