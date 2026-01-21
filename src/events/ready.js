const { ActivityType } = require('discord.js');

module.exports = {
    name: 'ready',
    once: true,
    execute(client) {
        console.log(`Logged in as ${client.user.tag}`);
        console.log(`Serving ${client.guilds.cache.size} servers`);
        
        client.user.setPresence({
            activities: [{
                name: `/help | ${client.guilds.cache.size} servers`,
                type: ActivityType.Watching
            }],
            status: 'online'
        });

        setInterval(() => {
            const activities = [
                { name: `/help | ${client.guilds.cache.size} servers`, type: ActivityType.Watching },
                { name: `${client.users.cache.size} users`, type: ActivityType.Listening },
                { name: 'discord.js v14', type: ActivityType.Playing }
            ];
            
            const activity = activities[Math.floor(Math.random() * activities.length)];
            client.user.setActivity(activity.name, { type: activity.type });
        }, 30000);
    }
};
