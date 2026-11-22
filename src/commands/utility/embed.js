const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { colors } = require('../../config/config');

const TITLE_MAX_LENGTH = 256;
const DESCRIPTION_MAX_LENGTH = 4096;
const FOOTER_MAX_LENGTH = 2048;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Create a custom embed message')
        .addStringOption(option =>
            option.setName('title')
                .setDescription('Embed title')
                .setMaxLength(TITLE_MAX_LENGTH)
                .setRequired(true))
        .addStringOption(option =>
            option.setName('description')
                .setDescription('Embed description')
                .setMaxLength(DESCRIPTION_MAX_LENGTH)
                .setRequired(true))
        .addStringOption(option =>
            option.setName('color')
                .setDescription('Embed color (hex code)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('thumbnail')
                .setDescription('Thumbnail URL')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('image')
                .setDescription('Image URL')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('footer')
                .setDescription('Footer text')
                .setMaxLength(FOOTER_MAX_LENGTH)
                .setRequired(false))
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Channel to send embed')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    
    cooldown: 5,
    
    async execute(interaction) {
        const title = interaction.options.getString('title');
        const description = interaction.options.getString('description');
        const colorInput = interaction.options.getString('color');
        const thumbnail = interaction.options.getString('thumbnail');
        const image = interaction.options.getString('image');
        const footer = interaction.options.getString('footer');
        const channel = interaction.options.getChannel('channel') || interaction.channel;

        if (title.length > TITLE_MAX_LENGTH) {
            return interaction.reply({
                content: `The embed title must be ${TITLE_MAX_LENGTH} characters or fewer.`,
                ephemeral: true
            });
        }

        if (description.length > DESCRIPTION_MAX_LENGTH) {
            return interaction.reply({
                content: `The embed description must be ${DESCRIPTION_MAX_LENGTH} characters or fewer.`,
                ephemeral: true
            });
        }

        if (footer && footer.length > FOOTER_MAX_LENGTH) {
            return interaction.reply({
                content: `The embed footer must be ${FOOTER_MAX_LENGTH} characters or fewer.`,
                ephemeral: true
            });
        }

        let color = colors.primary;
        if (colorInput) {
            const hex = colorInput.replace('#', '');
            if (/^[0-9A-Fa-f]{6}$/.test(hex)) {
                color = parseInt(hex, 16);
            }
        }

        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle(title)
            .setDescription(description)
            .setTimestamp();

        if (thumbnail) {
            try {
                embed.setThumbnail(thumbnail);
            } catch (e) {}
        }

        if (image) {
            try {
                embed.setImage(image);
            } catch (e) {}
        }

        if (footer) {
            embed.setFooter({ text: footer });
        }

        try {
            await channel.send({ embeds: [embed] });

            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.success)
                        .setDescription(`Embed sent to ${channel}`)
                ],
                ephemeral: true
            });
        } catch (error) {
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.danger)
                        .setDescription('Failed to send embed. Check permissions and URLs.')
                ],
                ephemeral: true
            });
        }
    }
};
