const { EmbedBuilder } = require('discord.js');
const { colors } = require('../config/config');
const { 
    getActiveGiveaways, 
    getAllActiveGiveaways,
    getGiveawayEntries, 
    endGiveaway, 
    deleteGiveawayEntries,
    getReminders,
    deleteReminder
} = require('./database');

async function checkGiveaways(client) {
    const now = Date.now();
    const endedGiveaways = getActiveGiveaways.all(now);

    for (const giveaway of endedGiveaways) {
        try {
            const channel = await client.channels.fetch(giveaway.channel_id).catch(() => null);
            if (!channel) {
                endGiveaway.run(giveaway.message_id);
                continue;
            }

            const message = await channel.messages.fetch(giveaway.message_id).catch(() => null);
            if (!message) {
                endGiveaway.run(giveaway.message_id);
                continue;
            }

            const entries = getGiveawayEntries.all(giveaway.id);
            
            let winners = [];
            if (entries.length > 0) {
                const shuffled = entries.sort(() => Math.random() - 0.5);
                winners = shuffled.slice(0, Math.min(giveaway.winners, entries.length));
            }

            const embed = EmbedBuilder.from(message.embeds[0])
                .setColor(colors.danger)
                .setTitle('🎉 Giveaway Ended!')
                .setFooter({ text: 'Giveaway ended' });

            if (winners.length > 0) {
                const winnerMentions = winners.map(w => `<@${w.user_id}>`).join(', ');
                embed.setDescription(`**Prize:** ${giveaway.prize}\n\n**Winners:** ${winnerMentions}`);
                
                await channel.send({
                    content: `🎉 Congratulations ${winnerMentions}! You won **${giveaway.prize}**!`,
                    reply: { messageReference: giveaway.message_id }
                });
            } else {
                embed.setDescription(`**Prize:** ${giveaway.prize}\n\n**Winners:** No valid entries`);
            }

            await message.edit({ embeds: [embed], components: [] });
            endGiveaway.run(giveaway.message_id);
            
        } catch (error) {
            console.error('Giveaway end error:', error);
            endGiveaway.run(giveaway.message_id);
        }
    }
}

async function checkReminders(client) {
    const now = Date.now();
    const dueReminders = getReminders.all(now);

    for (const reminder of dueReminders) {
        try {
            const channel = await client.channels.fetch(reminder.channel_id).catch(() => null);
            const user = await client.users.fetch(reminder.user_id).catch(() => null);

            if (user) {
                const embed = new EmbedBuilder()
                    .setColor(colors.info)
                    .setTitle('⏰ Reminder!')
                    .setDescription(reminder.message)
                    .setTimestamp();

                if (channel) {
                    await channel.send({
                        content: `<@${reminder.user_id}>`,
                        embeds: [embed]
                    }).catch(async () => {
                        await user.send({ embeds: [embed] }).catch(() => {});
                    });
                } else {
                    await user.send({ embeds: [embed] }).catch(() => {});
                }
            }

            deleteReminder.run(reminder.id);
        } catch (error) {
            console.error('Reminder error:', error);
            deleteReminder.run(reminder.id);
        }
    }
}

function startScheduler(client) {
    setInterval(() => checkGiveaways(client), 10000);
    setInterval(() => checkReminders(client), 30000);
    
    console.log('Scheduler started');
}

module.exports = { startScheduler, checkGiveaways, checkReminders };
