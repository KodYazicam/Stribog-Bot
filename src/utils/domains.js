const HOSTNAME_PATTERN = /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/;

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
    matchesWhitelistedHostname
};
