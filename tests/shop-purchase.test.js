const { test } = require('node:test');
const assert = require('node:assert/strict');

// Must be required before anything that opens the bot database.
require('./helpers/test-db');

const database = require('../src/utils/database');
const shop = require('../src/commands/economy/shop');

let sequence = 0;

function unique(prefix) {
    sequence += 1;
    return `${prefix}-${process.pid}-${Date.now()}-${sequence}`;
}

function makeRole(id = 'role-1') {
    return {
        id,
        position: 1,
        managed: false,
        toString() { return `<@&${id}>`; }
    };
}

function makeInteraction({ userId, guildId, itemId, role = makeRole(), fetchRole = true, addError = null }) {
    const replies = [];
    const addCalls = [];
    const member = {
        permissions: { has: () => false },
        roles: {
            cache: { has: () => false },
            async add(value) {
                addCalls.push(value);
                if (addError) throw addError;
            }
        }
    };
    const guild = {
        id: guildId,
        members: { me: { roles: { highest: { position: 10 } } } },
        roles: {
            async fetch() {
                return fetchRole ? role : null;
            }
        }
    };
    return {
        guild,
        member,
        user: { id: userId },
        replies,
        addCalls,
        options: {
            getSubcommand: () => 'buy',
            getInteger: () => itemId
        },
        async reply(payload) {
            replies.push(payload);
            return payload;
        }
    };
}

function seedItem(guildId, { price = 50, roleId = 'role-1', name = 'VIP' } = {}) {
    const result = database.insertShopItem.run(guildId, name, null, price, roleId);
    return Number(result.lastInsertRowid);
}

function seedBalance(userId, guildId, amount = 100) {
    database.ensureEconomy(userId, guildId);
    database.updateEconomyBalance.run(amount, userId, guildId);
    return database.getEconomy.get(userId, guildId);
}

function cleanUp({ userId, guildId, itemId }) {
    database.db.prepare('DELETE FROM shop_items WHERE id = ? AND guild_id = ?').run(itemId, guildId);
    database.db.prepare('DELETE FROM guild_economy WHERE user_id = ? AND guild_id = ?').run(userId, guildId);
}

test('a role item is not charged when the role cannot be fetched', async () => {
    const userId = unique('shop-user');
    const guildId = unique('shop-guild');
    const itemId = seedItem(guildId);
    seedBalance(userId, guildId, 100);
    const interaction = makeInteraction({ userId, guildId, itemId, fetchRole: false });

    try {
        await shop.execute(interaction);

        assert.equal(database.getEconomy.get(userId, guildId).balance, 100, 'the failed purchase must not deduct coins');
        assert.equal(interaction.addCalls.length, 0);
        assert.match(JSON.stringify(interaction.replies[0]), /could not|cannot|failed|unavailable/i);
    } finally {
        cleanUp({ userId, guildId, itemId });
    }
});

test('a role item is refunded when Discord rejects the role grant', async () => {
    const userId = unique('shop-user');
    const guildId = unique('shop-guild');
    const itemId = seedItem(guildId);
    seedBalance(userId, guildId, 100);
    const interaction = makeInteraction({
        userId,
        guildId,
        itemId,
        addError: new Error('Missing Permissions')
    });

    try {
        await shop.execute(interaction);

        assert.equal(database.getEconomy.get(userId, guildId).balance, 100, 'a failed grant must refund the price');
        assert.equal(interaction.addCalls.length, 1);
        assert.match(JSON.stringify(interaction.replies[0]), /refund/i);
    } finally {
        cleanUp({ userId, guildId, itemId });
    }
});

test('a successful role purchase charges once and grants the role', async () => {
    const userId = unique('shop-user');
    const guildId = unique('shop-guild');
    const itemId = seedItem(guildId);
    seedBalance(userId, guildId, 100);
    const role = makeRole('role-vip');
    const interaction = makeInteraction({ userId, guildId, itemId, role });

    try {
        await shop.execute(interaction);

        assert.equal(database.getEconomy.get(userId, guildId).balance, 50);
        assert.deepEqual(interaction.addCalls, [role]);
        assert.match(JSON.stringify(interaction.replies[0]), /Purchase Successful/i);
    } finally {
        cleanUp({ userId, guildId, itemId });
    }
});

test('a non-role item still charges exactly the price', async () => {
    const userId = unique('shop-user');
    const guildId = unique('shop-guild');
    const itemId = seedItem(guildId, { roleId: null, name: 'Sticker pack' });
    seedBalance(userId, guildId, 100);
    const interaction = makeInteraction({ userId, guildId, itemId });

    try {
        await shop.execute(interaction);

        assert.equal(database.getEconomy.get(userId, guildId).balance, 50);
        assert.equal(interaction.addCalls.length, 0);
        assert.match(JSON.stringify(interaction.replies[0]), /Purchase Successful/i);
    } finally {
        cleanUp({ userId, guildId, itemId });
    }
});
