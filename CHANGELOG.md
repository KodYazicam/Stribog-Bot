# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `/warnings list|remove|clear` for per-guild warning history management. Removals
  are scoped by guild, target, and warning id.
- Successful `/warn` actions now persist a warning row, matching the documented
  history-tracking behavior.
- Command-level moderation tests covering permission declarations, self/bot and
  role-hierarchy guards, dispatcher role checks, cooldowns, and warning
  persistence in SQLite.

### Changed

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
