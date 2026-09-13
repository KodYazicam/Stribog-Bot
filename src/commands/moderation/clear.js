const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { colors } = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Delete messages from a channel')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Number of messages to delete (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100))
        .addUserOption(option =>
            option.setName('target')
                .setDescription('Only delete messages from this user')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    
    cooldown: 5,
    
    async execute(interaction) {
        const amount = interaction.options.getInteger('amount');
        const target = interaction.options.getUser('target');

        await interaction.deferReply({ ephemeral: true });

        try {
            let messages = await interaction.channel.messages.fetch({ limit: 100 });
            
            if (target) {
                messages = messages.filter(msg => msg.author.id === target.id);
            }

            messages = messages.filter(msg => {
                const messageAge = Date.now() - msg.createdTimestamp;
                return messageAge < 14 * 24 * 60 * 60 * 1000;
            });

            const toDelete = messages.first(amount);
            
            if (toDelete.length === 0) {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.warning)
                            .setDescription('No messages found to delete. Messages older than 14 days cannot be bulk deleted.')
                    ]
                });
            }

            const deleted = await interaction.channel.bulkDelete(toDelete, true);

            const embed = new EmbedBuilder()
                .setColor(colors.success)
                .setTitle('Messages Deleted')
                .setDescription(`Successfully deleted **${deleted.size}** messages.`)
                .setTimestamp();

            if (target) {
                embed.addFields({ name: 'Filtered by', value: `${target.tag}` });
            }

            await interaction.editReply({ embeds: [embed] });
            const { sendModLog } = require('../../utils/modlog');
            await sendModLog(interaction.guild, {
                title: 'Messages Deleted',
                moderator: interaction.user,
                fields: [
                    { name: 'Count', value: String(deleted.size), inline: true },
                    { name: 'Channel', value: `${interaction.channel}`, inline: true }
                ]
            });
        } catch (error) {
            console.error('Clear error:', error);
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.danger)
                        .setDescription('Failed to delete messages. Make sure messages are not older than 14 days.')
                ]
            });
        }
    }
};
