const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Collection } = require('discord.js');

require('./helpers/test-db');
const database = require('../src/utils/database');
const guildMemberUpdate = require('../src/events/guildMemberUpdate');

let sequence = 0;

function unique(prefix) {
    sequence += 1;
    return `${prefix}-${process.pid}-${Date.now()}-${sequence}`;
}

function makeRole(id = unique('role'), name = 'Role') {
    return { id, name, toString: () => `<@&${id}>` };
}

function makeMember({ guild, id = unique('member'), nickname = null, roles = [], timeout = null }) {
    const cache = new Collection(roles.map(role => [role.id, role]));
    return {
        id,
        nickname,
        communicationDisabledUntil: timeout,
        roles: { cache },
        user: {
            tag: `user-${id}#0001`,
            displayAvatarURL: () => 'https://example.invalid/avatar.png'
        },
        guild
    };
}

function makeGuild({ executor = null } = {}) {
    const sent = [];
    const logChannel = {
        id: unique('log'),
        async send(payload) {
            // Snapshot at send time: discord.js serialises the builder when sending.
            sent.push(JSON.parse(JSON.stringify(payload.embeds[0].toJSON())));
        }
    };
    const guild = {
        id: unique('guild'),
        auditTargetId: null,
        channels: { fetch: async () => logChannel },
        fetchAuditLogs: async () => ({
            entries: new Collection(
                executor && guild.auditTargetId
                    ? [['entry', { target: { id: guild.auditTargetId }, executor, createdTimestamp: Date.now() }]]
                    : []
            )
        })
    };
    database.insertGuild.run(guild.id);
    database.updateGuildSetting('log_channel').run(logChannel.id, guild.id);
    return { guild, sent };
}

function fieldNames(embed) {
    return (embed.fields || []).map(field => field.name);
}

function countField(embed, name) {
    return fieldNames(embed).filter(fieldName => fieldName === name).length;
}

function titles(sent) {
    return sent.map(embed => embed.title);
}

test('a nickname change and a role addition produce two separate log entries', async () => {
    const { guild, sent } = makeGuild();
    const memberRole = makeRole(undefined, 'Member');
    const vipRole = makeRole(undefined, 'VIP');
    const before = makeMember({ guild, nickname: 'Old Nick', roles: [memberRole] });
    const after = makeMember({ guild, id: before.id, nickname: 'New Nick', roles: [memberRole, vipRole] });

    await guildMemberUpdate.execute(before, after);

    assert.deepEqual(titles(sent), ['Nickname Changed', 'Role Added']);
    assert.deepEqual(fieldNames(sent[0]), ['Member', 'Before', 'After']);
    assert.deepEqual(fieldNames(sent[1]), ['Member', 'Role']);
    assert.match(sent[1].fields[1].value, new RegExp(vipRole.id));
});

test('a role addition and a role removal each get exactly one Member and one Role field', async () => {
    const { guild, sent } = makeGuild();
    const memberRole = makeRole(undefined, 'Member');
    const oldRole = makeRole(undefined, 'Old');
    const newRole = makeRole(undefined, 'New');
    const before = makeMember({ guild, roles: [memberRole, oldRole] });
    const after = makeMember({ guild, id: before.id, roles: [memberRole, newRole] });

    await guildMemberUpdate.execute(before, after);

    assert.deepEqual(titles(sent), ['Role Added', 'Role Removed']);
    for (const embed of sent) {
        assert.equal(countField(embed, 'Member'), 1);
        assert.equal(countField(embed, 'Role'), 1);
    }
    assert.match(sent[0].fields[1].value, new RegExp(newRole.id));
    assert.doesNotMatch(sent[0].fields[1].value, new RegExp(oldRole.id));
    assert.match(sent[1].fields[1].value, new RegExp(oldRole.id));
    assert.doesNotMatch(sent[1].fields[1].value, new RegExp(newRole.id));
});

test('an unchanged timeout does not log a timeout entry', async () => {
    const { guild, sent } = makeGuild();
    const memberRole = makeRole(undefined, 'Member');
    const vipRole = makeRole(undefined, 'VIP');
    const until = new Date('2026-12-01T00:00:00Z');
    const before = makeMember({ guild, roles: [memberRole], timeout: new Date(until.getTime()) });
    const after = makeMember({
        guild,
        id: before.id,
        roles: [memberRole, vipRole],
        timeout: new Date(until.getTime())
    });

    await guildMemberUpdate.execute(before, after);

    assert.deepEqual(titles(sent), ['Role Added']);
    assert.deepEqual(fieldNames(sent[0]), ['Member', 'Role']);
});

test('a new timeout logs one Member Timed Out entry with the expiry', async () => {
    const { guild, sent } = makeGuild();
    const memberRole = makeRole(undefined, 'Member');
    const until = new Date('2026-12-01T00:00:00Z');
    const before = makeMember({ guild, roles: [memberRole], timeout: null });
    const after = makeMember({ guild, id: before.id, roles: [memberRole], timeout: until });

    await guildMemberUpdate.execute(before, after);

    assert.deepEqual(titles(sent), ['Member Timed Out']);
    assert.deepEqual(fieldNames(sent[0]), ['Member', 'Until']);
    assert.equal(sent[0].fields[1].value, `<t:${Math.floor(until.getTime() / 1000)}:F>`);
});

test('a cleared timeout logs one Timeout Removed entry', async () => {
    const { guild, sent } = makeGuild();
    const memberRole = makeRole(undefined, 'Member');
    const until = new Date('2026-12-01T00:00:00Z');
    const before = makeMember({ guild, roles: [memberRole], timeout: until });
    const after = makeMember({ guild, id: before.id, roles: [memberRole], timeout: null });

    await guildMemberUpdate.execute(before, after);

    assert.deepEqual(titles(sent), ['Timeout Removed']);
    assert.deepEqual(fieldNames(sent[0]), ['Member']);
});

test('the audit-log executor appears only on the role entry it belongs to', async () => {
    const executor = { id: unique('moderator'), tag: 'moderator#0001' };
    const { guild, sent } = makeGuild({ executor });
    const memberRole = makeRole(undefined, 'Member');
    const oldRole = makeRole(undefined, 'Old');
    const newRole = makeRole(undefined, 'New');
    const before = makeMember({ guild, roles: [memberRole, oldRole] });
    const after = makeMember({ guild, id: before.id, roles: [memberRole, newRole] });
    guild.auditTargetId = before.id;

    await guildMemberUpdate.execute(before, after);

    assert.deepEqual(titles(sent), ['Role Added', 'Role Removed']);
    assert.ok(fieldNames(sent[0]).includes('Added By'));
    assert.ok(!fieldNames(sent[0]).includes('Removed By'));
    assert.ok(fieldNames(sent[1]).includes('Removed By'));
    assert.ok(!fieldNames(sent[1]).includes('Added By'));
});
