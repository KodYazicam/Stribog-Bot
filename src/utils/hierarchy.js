// Role hierarchy helpers.
//
// Discord resolves moderation authority by role position: a member can only
// act on someone whose highest role sits strictly below their own, and can
// only manage roles strictly below their own. The guild owner is the single
// exception ("the server owner is always considered the highest person in
// hierarchy"); `Administrator` does not bypass the hierarchy.
//
// https://docs.discord.com/developers/topics/permissions#permission-hierarchy

function isGuildOwner(interaction) {
    const ownerId = interaction?.guild?.ownerId;
    const actorId = interaction?.member?.id;
    if (!ownerId || !actorId) return false;
    return String(ownerId) === String(actorId);
}

function actorPosition(interaction) {
    return interaction?.member?.roles?.highest?.position;
}

function position(value) {
    return Number.isFinite(value) ? value : null;
}

/**
 * Whether the caller may act on `member` under the role hierarchy.
 * Missing position data keeps the pre-helper behaviour (no new denial);
 * discord.js always supplies it for a real guild member.
 */
function outranksMember(interaction, member) {
    if (isGuildOwner(interaction)) return true;
    const actor = position(actorPosition(interaction));
    const target = position(member?.roles?.highest?.position);
    if (actor === null || target === null) return true;
    return actor > target;
}

/** Whether the caller may manage `role` under the role hierarchy. */
function outranksRole(interaction, role) {
    if (isGuildOwner(interaction)) return true;
    const actor = position(actorPosition(interaction));
    const target = position(role?.position);
    if (actor === null || target === null) return true;
    return actor > target;
}

module.exports = { isGuildOwner, outranksMember, outranksRole };
