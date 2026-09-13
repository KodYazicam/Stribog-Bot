async function buildTranscriptText(channel, { limit = 100 } = {}) {
    const collected = [];
    let lastId;
    while (collected.length < limit) {
        const batch = await channel.messages.fetch({ limit: Math.min(100, limit - collected.length), before: lastId }).catch(() => null);
        if (!batch || batch.size === 0) break;
        const rows = [...batch.values()];
        collected.push(...rows);
        lastId = rows[rows.length - 1].id;
        if (batch.size < 100) break;
    }
    collected.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
    const lines = collected.map((msg) => {
        const time = new Date(msg.createdTimestamp).toISOString();
        const author = `${msg.author?.tag || 'unknown'} (${msg.author?.id || '?'})`;
        const body = msg.cleanContent || msg.content || '';
        const extras = [];
        if (msg.attachments?.size) extras.push(`[attachments: ${[...msg.attachments.values()].map((a) => a.url).join(' ')}]`);
        if (msg.embeds?.length) extras.push(`[${msg.embeds.length} embed(s)]`);
        return `[${time}] ${author}: ${body}${extras.length ? ` ${extras.join(' ')}` : ''}`;
    });
    return `Transcript of #${channel.name} (${channel.id})\nMessages: ${lines.length}\n\n${lines.join('\n')}\n`;
}

module.exports = { buildTranscriptText };
