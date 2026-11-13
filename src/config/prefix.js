const DEFAULT_PREFIX = '!';
const MAX_PREFIX_LENGTH = 5;
const RESERVED_CHARACTERS = new Set(['/', '@', '#', '<', '>', '\\']);

function validatePrefix(raw) {
    if (raw === undefined || raw === null) {
        return { prefix: DEFAULT_PREFIX };
    }

    if (typeof raw !== 'string') {
        return { prefix: DEFAULT_PREFIX, error: 'PREFIX must be a string.' };
    }

    const value = raw.trim();

    if (!value) {
        return { prefix: DEFAULT_PREFIX, error: 'PREFIX cannot be empty.' };
    }

    if (value.length > MAX_PREFIX_LENGTH) {
        return {
            prefix: DEFAULT_PREFIX,
            error: `PREFIX cannot be longer than ${MAX_PREFIX_LENGTH} characters.`
        };
    }

    if (/\s/.test(value)) {
        return { prefix: DEFAULT_PREFIX, error: 'PREFIX cannot contain whitespace.' };
    }

    if (/^[\p{L}\p{N}]/u.test(value)) {
        return {
            prefix: DEFAULT_PREFIX,
            error: 'PREFIX cannot start with a letter or number because it would conflict with normal chat.'
        };
    }

    const reserved = [...value].find(character => RESERVED_CHARACTERS.has(character));
    if (reserved) {
        return {
            prefix: DEFAULT_PREFIX,
            error: `PREFIX cannot contain \`${reserved}\` because it conflicts with Discord syntax.`
        };
    }

    return { prefix: value };
}

function resolvePrefix(raw) {
    const result = validatePrefix(raw);
    if (result.error && raw !== undefined && raw !== null) {
        console.warn(`[config] ${result.error} Using "${DEFAULT_PREFIX}".`);
    }
    return result.prefix;
}

module.exports = {
    DEFAULT_PREFIX,
    MAX_PREFIX_LENGTH,
    RESERVED_CHARACTERS,
    validatePrefix,
    resolvePrefix
};
