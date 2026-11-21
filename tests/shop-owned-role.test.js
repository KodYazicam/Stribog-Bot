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

function makeInteraction({ userId, guildId, itemId, ownsRole }) {
    const replies = [];
    const addCalls = [];
    const role = {
        id: 'role-vip',
        position: 1,
        managed: false,
        toString() { return `<@&${role.id}>`; }
    };

    const interaction = {
        guild: {
            id: guildId,
            members: { me: { roles: { highest: { position: 10 } } } },
            roles: { async fetch() { return role; } }
        },
        member: {
            permissions: { has: () => false },
            roles: {
                cache: { has: (id) => ownsRole && id === role.id },
                async add(value) { addCalls.push(value); }
            }
        },
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

    return interaction;
}

function seedItem(guildId, { price = 50, roleId = 'role-vip' } = {}) {
    const result = database.insertShopItem.run(guildId, 'VIP', null, price, roleId);
    return Number(result.lastInsertRowid);
}

function seedBalance(userId, guildId, amount) {
    database.ensureEconomy(userId, guildId);
    database.updateEconomyBalance.run(amount, userId, guildId);
}

function balanceOf(userId, guildId) {
    return database.getEconomy.get(userId, guildId).balance;
}

function cleanUp({ userId, guildId, itemId }) {
    database.db.prepare('DELETE FROM shop_items WHERE id = ? AND guild_id = ?').run(itemId, guildId);
    database.db.prepare('DELETE FROM guild_economy WHERE user_id = ? AND guild_id = ?').run(userId, guildId);
}

test('buying a role the member already owns does not charge or grant it again', async () => {
    const buyer = unique('shop-buyer');
    const guildId = unique('shop-guild');
    const itemId = seedItem(guildId);
    seedBalance(buyer, guildId, 100);
    const interaction = makeInteraction({ userId: buyer, guildId, itemId, ownsRole: true });

    try {
        await shop.execute(interaction);

        assert.equal(balanceOf(buyer, guildId), 100, 'an owned role must not be charged again');
        assert.equal(interaction.addCalls.length, 0, 'an owned role must not be granted twice');
        assert.match(JSON.stringify(interaction.replies[0]), /already have/i);
        assert.equal(interaction.replies[0].ephemeral, true);
    } finally {
        cleanUp({ userId: buyer, guildId, itemId });
    }
});

test('a member without the role still buys it normally', async () => {
    const buyer = unique('shop-buyer');
    const guildId = unique('shop-guild');
    const itemId = seedItem(guildId);
    seedBalance(buyer, guildId, 100);
    const interaction = makeInteraction({ userId: buyer, guildId, itemId, ownsRole: false });

    try {
        await shop.execute(interaction);

        assert.equal(balanceOf(buyer, guildId), 50, 'the price is charged once');
        assert.equal(interaction.addCalls.length, 1, 'the role is granted');
    } finally {
        cleanUp({ userId: buyer, guildId, itemId });
    }
});
