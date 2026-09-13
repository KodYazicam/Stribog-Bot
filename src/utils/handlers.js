const ALLOWED = new Set(['ticket', 'trivia', 'rps', 'giveaway', 'help', 'nuke']);

function safeHandlerName(action) {
    if (!action || typeof action !== 'string') return null;
    if (!/^[a-z0-9]+$/i.test(action)) return null;
    if (!ALLOWED.has(action)) return null;
    return action;
}

module.exports = { safeHandlerName, ALLOWED };
