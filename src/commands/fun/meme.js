const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { colors } = require('../../config/config');

const subreddits = ['memes', 'dankmemes', 'me_irl', 'wholesomememes', 'ProgrammerHumor'];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('meme')
        .setDescription('Get a random meme from Reddit')
        .addStringOption(option =>
            option.setName('subreddit')
                .setDescription('Specific subreddit')
                .setRequired(false)
                .addChoices(
                    { name: 'r/memes', value: 'memes' },
                    { name: 'r/dankmemes', value: 'dankmemes' },
                    { name: 'r/me_irl', value: 'me_irl' },
                    { name: 'r/wholesomememes', value: 'wholesomememes' },
                    { name: 'r/ProgrammerHumor', value: 'ProgrammerHumor' }
                )),

    cooldown: 5,

    async execute(interaction) {
        const subreddit = interaction.options.getString('subreddit') || 
            subreddits[Math.floor(Math.random() * subreddits.length)];

        await interaction.deferReply();

        try {
            const response = await fetch(`https://www.reddit.com/r/${subreddit}/hot.json?limit=100`);
            const data = await response.json();

            if (!data.data || !data.data.children.length) {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.danger)
                            .setDescription('Failed to fetch memes. Please try again.')
                    ]
                });
            }

            const posts = data.data.children.filter(post => {
                const p = post.data;
                return !p.over_18 && 
                       !p.stickied && 
                       p.post_hint === 'image' &&
                       (p.url.endsWith('.jpg') || p.url.endsWith('.png') || p.url.endsWith('.gif'));
            });

            if (posts.length === 0) {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.danger)
                            .setDescription('No suitable memes found. Please try again.')
                    ]
                });
            }

            const randomPost = posts[Math.floor(Math.random() * posts.length)].data;

            const embed = new EmbedBuilder()
                .setColor(colors.info)
                .setTitle(randomPost.title.length > 256 ? randomPost.title.slice(0, 253) + '...' : randomPost.title)
                .setURL(`https://reddit.com${randomPost.permalink}`)
                .setImage(randomPost.url)
                .setFooter({ 
                    text: `👍 ${randomPost.ups.toLocaleString()} | 💬 ${randomPost.num_comments.toLocaleString()} | r/${subreddit}` 
                });

            if (randomPost.author) {
                embed.setAuthor({ name: `u/${randomPost.author}` });
            }

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.danger)
                        .setDescription('An error occurred while fetching the meme.')
                ]
            });
        }
    }
};
