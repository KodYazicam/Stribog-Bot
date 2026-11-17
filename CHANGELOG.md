# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- CI production dependency audit: the `test` job runs
  `npm audit --omit=dev --audit-level=high` after `npm ci`, so a high-severity
  advisory in a runtime dependency fails the pull request instead of waiting for
  a post-merge Dependabot alert. Dev-only advisories are ignored, matching the
  `LogYazicam` gate, and `tests/dependency-audit.test.js` fails if the step, its
  flags, or its position in the required `test` job drift.

- CI coverage floor: `npm run test:coverage` collects coverage across `src/**`
  and fails below 74% lines, 71% branches, or 78% functions. The `test` job runs
  it on every push and pull request, and `tests/coverage-gate.test.js` fails if
  the script, its include, a threshold, or the CI step is removed.

- Docker deployment path: a multi-stage `Dockerfile` that installs production
  dependencies with build tools and runs as non-root UID 10001, a
  `docker-compose.yml` with `env_file: .env`, `init: true`, and the named
  `stribog-data` volume at `/app/data`, and a `.dockerignore` that keeps `.env`,
  the local database, and `node_modules` out of the build context. CI builds the
  image on every pull request, and the README documents build, command deploy,
  upgrade, and volume backup.
- Turkish quick-start README (`README.tr.md`) with a language switcher in both
  READMEs and a docs drift test covering the switcher, env keys, and defaults.
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

- The declared and documented Node.js floor is now 22.0.0, matching the
  `better-sqlite3@13` requirement and the version CI tests. The previous
  `engines` value (>=18) advertised an install path that could not build the
  native database binding. A regression test keeps the manifest, lockfile,
  CI pin, and both READMEs in sync.
- `/warnings remove|clear` and confirmed `/config import` actions now write an
  audit entry to the configured mod-log channel with the actor, guild, and
  before/after summaries. Raw configuration values are not logged.
- README command reference now uses the shipped command, subcommand, and option
  names and lists each command's default permission.
- Added issue templates, pull request template, Dependabot, roadmap, and changelog.
- Overrode `minimatch` to `^11.0.5` for the dev-only `nodemon` dependency,
  clearing the GHSA-g3hv-75wg-m249 advisory.

### Fixed

- Ticket buttons now re-check the owner/staff rule at every step. The
  confirmation button (`ticket_confirm_close`) previously deleted the channel
  for any participant, and `ticket_claim` accepted any member; both now reuse
  the same owner / `ManageChannels` / support-role predicate as the first close
  step. A stale confirmation button on a non-ticket channel now replies instead
  of scheduling a deletion, and `tests/ticket-buttons.test.js` covers the denial,
  owner, support-role, stale-button, create, close, and cancel paths.
- `/reminder set` now inserts the reminder text into `message` and the due time
  into `remind_at`, so reminders fire on schedule and no longer fail in DMs with
  a `NOT NULL` constraint error.
- Tests now open a private SQLite database per process (`STRIBOG_DB_PATH` plus
  `tests/helpers/test-db.js`), so parallel `node --test` files no longer fail
  intermittently with `SQLITE_BUSY` on the shared `data/bot.db`.
- `/calc` now evaluates expressions with a small recursive-descent parser instead
  of the previous operator loop: `^`/`**` exponentiation is right-associative,
  unary `+`/`-` work after operators, parentheses keep precedence, and division
  or modulo by zero returns an error instead of a wrong number. Expressions with
  spaces (`1 + 2`) are accepted again, and malformed input such as `(1+2` is
  rejected instead of producing a partial result.

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
