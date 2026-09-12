const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { colors } = require('../../config/config');
const { insertUserGuildData, updateUserGuildXP } = require('../../utils/database');
const { levelFromTotalXp } = require('../../utils/leveling');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setxp')
        .setDescription('Set XP for a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Target user')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('xp')
                .setDescription('XP amount')
                .setRequired(true)
                .setMinValue(0))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    cooldown: 5,

    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const xp = interaction.options.getInteger('xp');

        insertUserGuildData.run(user.id, interaction.guild.id);
        const level = levelFromTotalXp(xp);
        
        updateUserGuildXP.run(xp, level, user.id, interaction.guild.id);

        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(colors.success)
                    .setTitle('XP Updated')
                    .setDescription(`Set ${user}'s XP to **${xp.toLocaleString()}** (Level ${level})`)
                    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            ]
        });
    }
};


