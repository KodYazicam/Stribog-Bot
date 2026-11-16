const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

const readme = read('README.md');
const turkish = read('README.tr.md');
const config = require('../src/config/config.js');

function fenceCount(text) {
    return text.split('\n').filter((line) => line.startsWith('```')).length;
}

test('Turkish quick start is a concise quick start, not a full mirror', () => {
    const lines = turkish.split('\n').length;
    assert.ok(lines >= 100 && lines <= 260, `README.tr.md has ${lines} lines`);
    assert.match(turkish, /^> Bu sayfa İngilizce \[README\]\(\.\/README\.md\)/m);
});

test('both READMEs expose the same language switcher targets', () => {
    for (const [name, document] of [['README.md', readme], ['README.tr.md', turkish]]) {
        assert.match(document, /(?:href="|\]\()\.\/README\.md/, `${name} misses the English target`);
        assert.match(document, /(?:href="|\]\()\.\/README\.tr\.md/, `${name} misses the Turkish target`);
    }
});

test('Turkish quick start keeps the required sections', () => {
    for (const heading of ['Gereksinimler', 'Hızlı Başlangıç', 'Komutlar', 'Sorun giderme', 'Lisans']) {
        assert.match(turkish, new RegExp(`^## .*${heading}$`, 'm'), `missing section: ${heading}`);
    }
});

test('documented environment variables match the supported set', () => {
    for (const key of ['TOKEN', 'CLIENT_ID', 'GUILD_ID', 'OWNER_ID', 'PREFIX']) {
        assert.ok(turkish.includes(`\`${key}\``), `missing env key: ${key}`);
    }
    assert.ok(turkish.includes('PREFIX=!'), 'prefix default must stay copy-pasteable');
});

test('economy and leveling defaults match src/config/config.js', () => {
    assert.ok(turkish.includes(`| Günlük ödül | ${config.economy.dailyAmount} coin |`));
    assert.ok(turkish.includes(`${config.economy.workMinAmount}–${config.economy.workMaxAmount} coin`));
    assert.ok(turkish.includes(`${config.economy.workCooldown / 60000} dakika`));
    assert.ok(turkish.includes(`${config.economy.dailyCooldown / 3600000} saat`));

    const [min, max] = config.leveling.xpPerMessage;
    assert.ok(turkish.includes(`${min}–${max}`), 'XP range drifted from config.js');
    assert.ok(turkish.includes(`${config.leveling.xpCooldown / 1000} saniye`));
});

test('commands, env keys, paths and install steps stay untranslated', () => {
    const snippets = [
        'git clone https://github.com/KodYazicam/Stribog-Bot.git',
        'npm ci',
        'npm run deploy',
        'npm start',
        '/automod antilink enabled:true',
        '/giveaway start prize:Nitro duration:1h winners:1',
        '/ticket setup',
        '/reminder set',
        'data/bot.db'
    ];
    for (const snippet of snippets) {
        assert.ok(turkish.includes(snippet), `missing or translated: ${snippet}`);
    }
});

test('code fences are balanced in both READMEs', () => {
    assert.equal(fenceCount(readme) % 2, 0, 'README.md has an unbalanced code fence');
    assert.equal(fenceCount(turkish) % 2, 0, 'README.tr.md has an unbalanced code fence');
});
