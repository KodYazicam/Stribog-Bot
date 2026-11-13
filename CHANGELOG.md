# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- AutoMod triggers now write structured audit entries to the mod-log channel
  with the rule, target, channel, actions, before/after state, and non-sensitive
  metadata. Message content, matched words, and URLs are never logged, and audit
  delivery continues when the source channel is deleted or message actions fail.
- Prefix execution now covers the economy, fun, info, leveling, admin, and
  giveaway groups. Prefix commands are generated from the slash definitions and
  reuse the same handlers, permissions, and cooldowns. Administrator and
  ManageGuild requirements are enforced on the prefix path, and `/config import`
  accepts a JSON file attached to the command message.
- `PREFIX` validation rejects empty, whitespace, overlong, alphanumeric-starting,
  and Discord-reserved values, falling back to `!`.
- `/warnings list|remove|clear` for per-guild warning history management. Removals
  are scoped by guild, target, and warning id.
- Successful `/warn` actions now persist a warning row, matching the documented
  history-tracking behavior.
- Command-level moderation tests covering permission declarations, self/bot and
  role-hierarchy guards, dispatcher role checks, cooldowns, and warning
  persistence in SQLite.
- `npm run commands:list` to audit registered slash commands and
  `npm run docs:check` to verify the README command reference against them.
- `/config export|import` for versioned, same-guild backups of settings,
  permission overrides, and disabled-command rules. Imports dry-run by default
  and apply atomically after confirmation.

### Changed

- `/warnings remove|clear` and confirmed `/config import` actions now write an
  audit entry to the configured mod-log channel with the actor, guild, and
  before/after summaries. Raw configuration values are not logged.
- README command reference now uses the shipped command, subcommand, and option
  names and lists each command's default permission.
- Added issue templates, pull request template, Dependabot, roadmap, and changelog.
- Overrode `minimatch` to `^11.0.5` for the dev-only `nodemon` dependency,
  clearing the GHSA-g3hv-75wg-m249 advisory.

### Security

- Documented the threat model and private vulnerability reporting in `SECURITY.md`.

## [1.0.0] - 2026-09-13

### Added

- Moderation commands: ban, unban, kick, timeout, warn, clear, slowmode, lock,
  unlock, softban, nuke, and role management.
- Per-guild economy: balance, daily, work, give, deposit, withdraw, shop, and
  leaderboard.
- Leveling, giveaways, tickets, utilities, weather, and fun commands.
- SQLite persistence and prefix/slash command handling.

[Unreleased]: https://github.com/KodYazicam/Stribog-Bot/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/KodYazicam/Stribog-Bot/releases/tag/v1.0.0
