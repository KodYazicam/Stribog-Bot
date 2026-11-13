const { colors } = require('../config/config');
const { sendModLog } = require('./modlog');

const RULE_LABELS = Object.freeze({
    antilink: 'Anti-Link',
    antispam: 'Anti-Spam',
    badwords: 'Bad Words',
    caps: 'Excessive Caps',
    mentions: 'Mass Mentions'
});

function channelLabel(channel) {
    const id = channel?.id;
    if (!id) return 'Unknown channel';
    return channel.name ? `#${channel.name} (${id})` : `Unknown channel (${id})`;
}

function actionLabel(actions) {
    const list = (Array.isArray(actions) ? actions : [actions]).filter(Boolean);
    return list.length > 0 ? list.join('\n') : 'None';
}

async function logAutoModAction(guild, {
    rule,
    actions,
    before,
    after,
    user,
    channel,
    messageId,
    metadata
}) {
    const label = RULE_LABELS[rule] || rule;
    const fields = [
        { name: 'Rule', value: label, inline: true },
        { name: 'Guild', value: `${guild.name || 'Unknown'} (${guild.id})`, inline: true },
        { name: 'Channel', value: channelLabel(channel), inline: true },
        { name: 'Message ID', value: messageId || 'Unknown', inline: true },
        { name: 'Actions', value: actionLabel(actions), inline: false },
        { name: 'Before', value: before || 'Unknown', inline: true },
        { name: 'After', value: after || 'Unknown', inline: true }
    ];

    if (metadata) fields.push({ name: 'Metadata', value: metadata, inline: false });

    await sendModLog(guild, {
        title: `AutoMod: ${label}`,
        description: 'An AutoMod rule was triggered. Message content is intentionally not logged.',
        color: colors.warning,
        target: user,
        fields
    });
}

module.exports = {
    RULE_LABELS,
    channelLabel,
    logAutoModAction
};
