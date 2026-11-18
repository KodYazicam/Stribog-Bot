// Wallet <-> bank moves used to be two independent UPDATE statements built from
// a value read earlier. If the second write failed (SQLITE_BUSY, SQLITE_FULL, a
// crash between the two), the wallet kept coins the bank never lost, or the bank
// lost coins the wallet never received. Coins must move in one guarded
// statement so the wallet+bank total never changes.
require('./helpers/test-db');

const { test } = require('node:test');
const assert = require('node:assert/strict');

const database = require('../src/utils/database');

let sequence = 0;

function uniqueUser() {
    sequence += 1;
    return `atomic-bank-${process.pid}-${Date.now()}-${sequence}`;
}

function seed(userId, guildId, { balance = 0, bank = 0 } = {}) {
    database.ensureEconomy(userId, guildId);
    database.updateEconomyBalance.run(balance, userId, guildId);
    database.updateEconomyBank.run(bank, userId, guildId);
    return database.getEconomy.get(userId, guildId);
}

function cleanUp(userId, guildId) {
    database.db.prepare('DELETE FROM guild_economy WHERE user_id = ? AND guild_id = ?').run(userId, guildId);
}

function makeInteraction(userId, guildId, amount) {
    const replies = [];
    return {
        guild: { id: guildId },
        user: { id: userId },
        options: { getString: () => amount },
        replies,
        async reply(payload) {
            replies.push(payload);
            return payload;
        }
    };
}

async function runWithFailingBankWrite(commandPath, amount) {
    const userId = uniqueUser();
    const guildId = `guild-${userId}`;
    seed(userId, guildId, { balance: 0, bank: 100 });

    const originalBankWrite = database.updateEconomyBank;
    database.updateEconomyBank = {
        run() {
            throw new Error('disk full');
        }
    };
    delete require.cache[require.resolve(commandPath)];

    try {
        const command = require(commandPath);
        const interaction = makeInteraction(userId, guildId, amount);
        try {
            await command.execute(interaction);
        } catch {
            // The command may surface the write failure; the invariant is what matters.
        }
        return database.getEconomy.get(userId, guildId);
    } finally {
        database.updateEconomyBank = originalBankWrite;
        delete require.cache[require.resolve(commandPath)];
        delete require.cache[require.resolve('../src/commands/economy/withdraw')];
        delete require.cache[require.resolve('../src/commands/economy/deposit')];
        cleanUp(userId, guildId);
    }
}

test('withdraw and deposit move coins with one guarded statement', () => {
    const userId = uniqueUser();
    const guildId = `guild-${userId}`;
    seed(userId, guildId, { balance: 25, bank: 100 });

    try {
        assert.equal(typeof database.withdrawFromBank, 'function', 'withdrawFromBank must exist');
        assert.equal(typeof database.depositToBank, 'function', 'depositToBank must exist');

        // A withdrawal larger than the bank balance is refused and touches nothing.
        assert.equal(database.withdrawFromBank(userId, guildId, 150), false);
        let row = database.getEconomy.get(userId, guildId);
        assert.deepEqual({ balance: row.balance, bank: row.bank }, { balance: 25, bank: 100 });

        // A valid withdrawal moves exactly the amount.
        assert.equal(database.withdrawFromBank(userId, guildId, 40), true);
        row = database.getEconomy.get(userId, guildId);
        assert.deepEqual({ balance: row.balance, bank: row.bank }, { balance: 65, bank: 60 });

        // A deposit larger than the wallet balance is refused and touches nothing.
        assert.equal(database.depositToBank(userId, guildId, 1000), false);
        row = database.getEconomy.get(userId, guildId);
        assert.deepEqual({ balance: row.balance, bank: row.bank }, { balance: 65, bank: 60 });

        assert.equal(database.depositToBank(userId, guildId, 65), true);
        row = database.getEconomy.get(userId, guildId);
        assert.deepEqual({ balance: row.balance, bank: row.bank }, { balance: 0, bank: 125 });

        // Non-integer and non-positive amounts are rejected instead of rounding.
        assert.equal(database.withdrawFromBank(userId, guildId, 0), false);
        assert.equal(database.withdrawFromBank(userId, guildId, 1.5), false);
        assert.equal(database.depositToBank(userId, guildId, -10), false);
    } finally {
        cleanUp(userId, guildId);
    }
});

test('the commands keep their "all" and refusal behaviour', async () => {
    const userId = uniqueUser();
    const guildId = `guild-${userId}`;
    seed(userId, guildId, { balance: 25, bank: 100 });

    try {
        const withdraw = require('../src/commands/economy/withdraw');
        const deposit = require('../src/commands/economy/deposit');

        // "all" moves the whole bank balance.
        const all = makeInteraction(userId, guildId, 'ALL');
        await withdraw.execute(all);
        let row = database.getEconomy.get(userId, guildId);
        assert.deepEqual({ balance: row.balance, bank: row.bank }, { balance: 125, bank: 0 });
        assert.equal(row.balance + row.bank, 125);
        assert.match(all.replies[0].embeds[0].data.title, /Withdrawal Successful/);

        // More than the bank holds is refused without a write.
        const tooMuch = makeInteraction(userId, guildId, '10');
        await withdraw.execute(tooMuch);
        row = database.getEconomy.get(userId, guildId);
        assert.deepEqual({ balance: row.balance, bank: row.bank }, { balance: 125, bank: 0 });
        assert.match(tooMuch.replies[0].embeds[0].data.description, /enough coins in your bank/);

        // Depositing everything empties the wallet.
        const depositAll = makeInteraction(userId, guildId, 'all');
        await deposit.execute(depositAll);
        row = database.getEconomy.get(userId, guildId);
        assert.deepEqual({ balance: row.balance, bank: row.bank }, { balance: 0, bank: 125 });

        // An empty wallet has nothing to withdraw; the reply is the existing one.
        const nothing = makeInteraction(userId, guildId, 'all');
        await deposit.execute(nothing);
        row = database.getEconomy.get(userId, guildId);
        assert.equal(row.balance + row.bank, 125);
        assert.match(nothing.replies[0].embeds[0].data.description, /valid amount/);
    } finally {
        cleanUp(userId, guildId);
    }
});

test('a failed bank write cannot mint coins on /withdraw', async () => {
    const row = await runWithFailingBankWrite('../src/commands/economy/withdraw', '50');
    assert.equal(row.balance + row.bank, 100, 'wallet+bank must stay at 100');
});

test('a failed bank write cannot destroy coins on /deposit', async () => {
    const userId = uniqueUser();
    const guildId = `guild-${userId}`;
    seed(userId, guildId, { balance: 100, bank: 0 });

    const originalBankWrite = database.updateEconomyBank;
    database.updateEconomyBank = {
        run() {
            throw new Error('disk full');
        }
    };
    delete require.cache[require.resolve('../src/commands/economy/deposit')];

    try {
        const command = require('../src/commands/economy/deposit');
        const interaction = makeInteraction(userId, guildId, '50');
        try {
            await command.execute(interaction);
        } catch {
            // The command may surface the write failure; the invariant is what matters.
        }
        const row = database.getEconomy.get(userId, guildId);
        assert.equal(row.balance + row.bank, 100, 'wallet+bank must stay at 100');
    } finally {
        database.updateEconomyBank = originalBankWrite;
        delete require.cache[require.resolve('../src/commands/economy/deposit')];
        cleanUp(userId, guildId);
    }
});
