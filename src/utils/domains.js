const HOSTNAME_PATTERN = /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/;

const SCHEME_URL_PATTERN = /https?:\/\/[^\s<>]+/gi;

// Discord renders a bare host such as "discord.gg/abc" or "www.example.com/x"
// as a clickable link, so anti-link has to see those candidates too.
const BARE_HOST_PATTERN = /\b(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,24}(?::\d{1,5})?(?:\/[^\s<>]*)?/gi;

const TRAILING_PUNCTUATION = /[.,;:!?'"`)\]}]+$/;

// A curated set keeps prose such as "Mr.Smith" or "Node.js" out of the filter.
// The list covers the TLDs invite spam and phishing links actually use.
const STRONG_TLDS = new Set([
    'com', 'net', 'org', 'edu', 'gov', 'mil', 'int', 'info', 'biz',
    'io', 'dev', 'app', 'xyz', 'online', 'site', 'store', 'shop', 'club',
    'live', 'news', 'blog', 'page', 'link', 'click', 'top', 'icu', 'buzz',
    'gg', 'tv', 'cc', 'ws', 'fm', 'ly', 'to', 'me', 'co',
    'uk', 'de', 'fr', 'nl', 'eu', 'ru', 'tr', 'br', 'es', 'it', 'pl',
    'se', 'no', 'fi', 'dk', 'ch', 'at', 'be', 'cz', 'gr', 'pt', 'ro',
    'hu', 'ie', 'nz', 'za', 'mx', 'ar', 'cl', 'kr', 'tw', 'hk', 'sg',
    'id', 'my', 'ph', 'th', 'vn', 'ua', 'il', 'ae', 'sa', 'eg', 'ng',
    'ke', 'pk', 'bd', 'lk', 'np', 'cn', 'jp', 'au', 'ca', 'us', 'in'
]);

function hostnameFromCandidate(candidate) {
    try {
        const parsed = new URL(candidate.includes('://') ? candidate : `http://${candidate}`);
        return parsed.hostname.toLowerCase();
    } catch {
        return '';
    }
}

/**
 * Extract the hostname of every link candidate in a message.
 * Covers explicit "https://..." URLs and the scheme-less hosts Discord
 * auto-links, in the order they appear. Unparseable candidates yield ""
 * so the caller can still treat them as blocked.
 */
function extractLinkHostnames(content) {
    if (typeof content !== 'string' || content.length === 0) return [];

    const hostnames = [];
    const masked = content.replace(SCHEME_URL_PATTERN, (match) => {
        hostnames.push(hostnameFromCandidate(match));
        return ' '.repeat(match.length);
    });

    for (const match of masked.matchAll(BARE_HOST_PATTERN)) {
        const index = match.index ?? 0;
        const before = index > 0 ? masked[index - 1] : '';
        // E-mail addresses, paths and ellipses are not clickable links.
        if (before === '@' || before === '/' || before === '.' || before === ':') continue;

        const candidate = match[0].replace(TRAILING_PUNCTUATION, '');
        const host = hostnameFromCandidate(candidate);
        if (!host) continue;

        const labels = host.split('.');
        const tld = labels[labels.length - 1];
        const isWww = /^www\./i.test(candidate);
        if (!isWww && !STRONG_TLDS.has(tld)) continue;

        hostnames.push(host);
    }

    return hostnames;
}

/**
 * Normalize a user supplied domain into a bare hostname.
 * Accepts "youtube.com", "YouTube.com", "https://youtube.com/watch?v=1",
 * "youtube.com:443" or "youtube.com/path" and returns "youtube.com".
 * Returns null when the value cannot be read as a valid bare hostname.
 */
function normalizeHostname(value) {
    if (typeof value !== 'string') return null;

    let candidate = value.trim().toLowerCase();
    if (!candidate) return null;

    if (candidate.includes('://')) {
        try {
            candidate = new URL(candidate).hostname;
        } catch {
            return null;
        }
    }

    candidate = candidate.split(/[/?#]/)[0];
    candidate = candidate.replace(/:\d+$/, '');
    candidate = candidate.replace(/\.+$/, '');

    if (!HOSTNAME_PATTERN.test(candidate)) return null;

    return candidate;
}

/**
 * Check whether a hostname matches a whitelist entry.
 * Only the exact hostname or a real subdomain of it matches, so
 * "youtube.com.evil.example" and "notyoutube.com" do not pass.
 */
function matchesWhitelistedHostname(hostname, entries) {
    const host = normalizeHostname(hostname);
    if (!host) return false;
    if (!Array.isArray(entries)) return false;

    return entries.some(entry => {
        const allowed = normalizeHostname(entry);
        if (!allowed) return false;
        return host === allowed || host.endsWith(`.${allowed}`);
    });
}

module.exports = {
    normalizeHostname,
    matchesWhitelistedHostname,
    extractLinkHostnames
};
