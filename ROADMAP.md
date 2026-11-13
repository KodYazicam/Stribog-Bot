# Roadmap

This roadmap is a direction, not a promise. Priorities change when users report
real problems. Open an issue before starting a large change.

## Now

- Keep dependencies current and security advisories at zero.
- Improve command-level tests around permissions, cooldowns, and SQLite writes.
- Document every command group with examples and required permissions.

## Next

- Extend prefix execution to the remaining command groups.
- Export/import for per-guild configuration.
- Structured audit logs for moderation actions.
- Optional Postgres backend for deployments that outgrow SQLite.

## Later

- Sharding guidance for large guild counts.
- A plugin boundary for third-party command packs.
- Localization beyond the current command set.

## Not planned

- Hosted bot service or a paid tier.
- Storing message content beyond what a feature explicitly needs.
- Features that require privileged intents without a documented opt-in.
