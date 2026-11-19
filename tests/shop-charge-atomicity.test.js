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

function makeRole(id = 'role-vip') {
    return {
        id,
        position: 1,
        managed: false,
        toString() { return `<@&${id}>`; }
    };
}

// A role fetch that stays pending until the test releases it, so another
// economy write can land in the window between the balance read and the charge.
function makeDeferredInteraction({ userId, guildId, itemId, role = makeRole() }) {
    let release;
    let markStarted;
    const gate = new Promise((resolve) => { release = resolve; });
    const started = new Promise((resolve) => { markStarted = resolve; });
    const replies = [];
    const addCalls = [];

    const interaction = {
        guild: {
            id: guildId,
            members: { me: { roles: { highest: { position: 10 } } } },
            roles: {
                async fetch() {
                    markStarted();
                    await gate;
                    return role;
                }
            }
        },
        member: {
            permissions: { has: () => false },
            roles: {
                cache: { has: () => false },
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

    return { interaction, release, started };
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

function cleanUp({ userIds, guildId, itemId }) {
    database.db.prepare('DELETE FROM shop_items WHERE id = ? AND guild_id = ?').run(itemId, guildId);
    for (const userId of userIds) {
        database.db.prepare('DELETE FROM guild_economy WHERE user_id = ? AND guild_id = ?').run(userId, guildId);
    }
}

test('a transfer that lands during the role fetch is not overwritten', async () => {
    const buyer = unique('shop-buyer');
    const other = unique('shop-other');
    const guildId = unique('shop-guild');
    const itemId = seedItem(guildId);
    seedBalance(buyer, guildId, 100);
    seedBalance(other, guildId, 0);
    const { interaction, release, started } = makeDeferredInteraction({ userId: buyer, guildId, itemId });

    try {
        const purchase = shop.execute(interaction);
        await started;
        assert.equal(database.transferCoins(buyer, other, guildId, 30), true);
        release();
        await purchase;

        assert.equal(balanceOf(buyer, guildId), 20, 'the buyer must pay the transfer and the price');
        assert.equal(balanceOf(other, guildId), 30, 'the receiver keeps the transfer');
        assert.equal(balanceOf(buyer, guildId) + balanceOf(other, guildId), 50, 'no coins may be created');
        assert.equal(interaction.addCalls.length, 1, 'the purchased role is granted');
    } finally {
        cleanUp({ userIds: [buyer, other], guildId, itemId });
    }
});

test('a reward that lands during the role fetch is kept', async () => {
    const buyer = unique('shop-buyer');
    const guildId = unique('shop-guild');
    const itemId = seedItem(guildId);
    seedBalance(buyer, guildId, 100);
    const { interaction, release, started } = makeDeferredInteraction({ userId: buyer, guildId, itemId });

    try {
        const purchase = shop.execute(interaction);
        await started;
        database.addEconomyCoins(buyer, guildId, 25);
        release();
        await purchase;

        assert.equal(balanceOf(buyer, guildId), 75, 'the reward and the price must both be applied');
        assert.equal(interaction.addCalls.length, 1);
    } finally {
        cleanUp({ userIds: [buyer], guildId, itemId });
    }
});

test('a purchase is refused when the balance no longer covers the price', async () => {
    const buyer = unique('shop-buyer');
    const other = unique('shop-other');
    const guildId = unique('shop-guild');
    const itemId = seedItem(guildId);
    seedBalance(buyer, guildId, 100);
    seedBalance(other, guildId, 0);
    const { interaction, release, started } = makeDeferredInteraction({ userId: buyer, guildId, itemId });

    try {
        const purchase = shop.execute(interaction);
        await started;
        assert.equal(database.transferCoins(buyer, other, guildId, 100), true);
        release();
        await purchase;

        assert.equal(balanceOf(buyer, guildId), 0, 'a refused purchase must not deduct coins');
        assert.equal(balanceOf(other, guildId), 100);
        assert.equal(interaction.addCalls.length, 0, 'a refused purchase must not grant the role');
        assert.match(JSON.stringify(interaction.replies[0]), /enough coins/i);
    } finally {
        cleanUp({ userIds: [buyer, other], guildId, itemId });
    }
});
