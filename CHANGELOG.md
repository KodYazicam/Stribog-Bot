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

- The mass-mentions AutoMod rule now covers `@everyone` and `@here`. The check
  counted only user and role mentions, and discord.js records a server-wide ping
  in `message.mentions.everyone` instead of the role collection, so an
  `@everyone` message passed with the filter enabled. The rule now treats the
  flag as a mass mention, records `@everyone/@here` in the audit metadata
  without logging the message body, and `tests/automod-audit.test.js` covers
  both pings plus the disabled-filter case.
- `/rank` and `/xpleaderboard` now report a real message count. Every ordinary
  chat message increments `user_guild_data.messages`, including messages sent
  inside the 60-second XP cooldown, while XP and level-ups still respect the
  cooldown. Previously nothing on the message path touched the column, so every
  member showed `Messages: 0`, and `/setxp` incremented it instead even though
  setting XP is not a sent message. The admin path now uses a dedicated
  `SET xp = ?, level = ?` statement, and `tests/leveling-counter.test.js` pins
  both behaviours.
- Anti-link now recognises bare links on abuse-heavy TLDs. `extractLinkHostnames()`
  accepted a scheme-less host only when its TLD was in the curated `STRONG_TLDS`
  set, which omitted the Freenom zones (`.tk`, `.ml`, `.ga`, `.gq`, `.cf`) and
  cheap gTLDs such as `.pw`, `.cam`, `.sbs`, `.rest`, `.cyou`, `.monster`,
  `.quest`, `.bond`, `.cfd`, `.lol`, `.wiki`, `.work`, `.support`, `.life`,
  `.world`, `.today`, `.space`, `.website`, `.fun`, `.host`, `.press`, and
  `.uno`. A message such as `free nitro at evil.tk` was therefore rendered as a
  clickable link by Discord but kept by AutoMod. `tests/antilink-whitelist.test.js`
  covers extraction and the `handleAutoMod()` deletion path, and keeps the
  existing prose/file/e-mail negatives.
- `/ban` and `/softban` send the message-purge window as
  `deleteMessageSeconds` instead of the deprecated `deleteMessageDays` option.
  discord.js v14 still translated the old key through a compatibility shim, but
  it emitted a process-wide deprecation warning and is excluded from
  `BulkBanOptions`, so the next major would have silently purged nothing.
  `tests/moderation.test.js` pins the exact second conversion for ban (0 and 2
  days) and softban (3 days) and rejects the deprecated key.
- Member update logs now describe exactly one change per embed.
  `guildMemberUpdate` reused a single `EmbedBuilder` for every entry, so a
  simultaneous role add/remove produced a `Role Removed` embed with duplicate
  `Member`/`Role` fields, a nickname edit returned early and silently dropped a
  role change in the same event, and a timed-out member produced a spurious
  `Member Timed Out` entry on every unrelated update because two `Date` objects
  for the same instant compare unequal. Each entry is now built fresh, timeout
  state is compared by timestamp, and `tests/member-update-log.test.js` covers
  the nickname, role, timeout and executor paths.
- `/permissions enable` no longer confuses a server-wide re-enable with a
  channel-scoped one. Both used a single `DELETE ... (channel_id IS NULL OR
  channel_id = ?)` statement, so enabling the command in one channel also
  deleted the server-wide rule — making a command that an administrator had
  disabled everywhere usable in every channel — while a server-wide enable left
  channel-scoped rules in place and still reported success. `enableCommand` now
  clears every row for the guild/command and `enableCommandInChannel` clears
  only the matching channel; a channel-scoped enable that cannot override a
  remaining server-wide rule says so instead of claiming success.
  `tests/permissions-enable.test.js` covers both directions.
- `/shop buy` now charges with one guarded `UPDATE`
  (`balance = balance - ? ... AND balance >= ?`) after it resolves the reward
  role. The balance read before `roles.fetch` was only a pre-check, but the
  charge wrote the absolute `user.balance - item.price`, so a `/give`, `/daily`
  or `/work` that landed during the fetch was silently overwritten: the probe on
  `1f3cfd3` created 30 coins and undid a `/give` debit. `spendEconomyCoins`
  refuses a stale balance without granting the role, and
  `tests/shop-charge-atomicity.test.js` pins the transfer, reward and
  drained-balance cases.
- The guild owner is no longer refused by the role-hierarchy guard in `/ban`,
  `/kick`, `/softban`, `/timeout`, `/warn`, and `/role add|remove`. The guard
  compared the caller's highest role position with the target's and refused on
  equal-or-higher, so an owner whose highest role sat below a member's role —
  or the default `@everyone` position 0 — could not moderate anyone. A new
  `src/utils/hierarchy.js` helper exempts only the owner, as Discord does;
  `Administrator` still does not bypass the hierarchy, and the bot-side
  `bannable`/`kickable`/`moderatable` and highest-role checks are unchanged.
  `tests/moderation.test.js` pins both directions (owner allowed, non-owner
  refused) for all six call sites.
- `/withdraw` and `/deposit` move coins between the wallet and the bank in a
  single guarded `UPDATE` instead of two independently written statements. A
  failed second write (busy database, full disk, crash) could previously keep
  the wallet credit without debiting the bank, minting coins on `/withdraw`, or
  debit the wallet without crediting the bank, destroying coins on `/deposit`.
  `withdrawFromBank` and `depositToBank` refuse invalid or over-limit amounts
  without writing, and `tests/economy-bank-atomicity.test.js` fails if either
  command writes the two balances separately again.
- Prefix commands now apply Discord's `Administrator` bypass. A moderator role
  that holds only `Administrator` could run `/giveaway start` but got "You do
  not have permission" from `!giveaway start`, because `hasDefaultPermissions()`
  compared the role bitfield directly and `discord.js` does not expand the flag.
  The same gate treated `default_member_permissions: "0"` as unrestricted;
  Discord defines `"0"` as administrators-only, so it is now enforced that way.
  The test member double now models `discord.js` instead of answering every
  permission for an administrator, and regression tests cover both cases.
- AutoMod now inspects the arguments of a prefix command. `messageCreate`
  returned as soon as `handlePrefixMessage` consumed the message, so
  `!8ball https://example.test` skipped the anti-link, bad-words, caps, and
  mass-mention rules entirely. The command still runs and replies first, then
  the invocation token is stripped and the remaining text goes through the same
  rules; the command name alone never matches a filter. Covered by
  `tests/automod-prefix-bypass.test.js`.
- Ticket buttons now re-check the owner/staff rule at every step. The
  confirmation button (`ticket_confirm_close`) previously deleted the channel
  for any participant, and `ticket_claim` accepted any member; both now reuse
  the same owner / `ManageChannels` / support-role predicate as the first close
  step. A stale confirmation button on a non-ticket channel now replies instead
  of scheduling a deletion, and `tests/ticket-buttons.test.js` covers the denial,
  owner, support-role, stale-button, create, close, and cancel paths.
- `/giveaway end` and `/giveaway reroll` now resolve the giveaway only when
  `giveaways.guild_id` matches the guild where the command was used, so a
  manager in one server can no longer end or reroll a giveaway hosted in
  another server where the bot is also present. Foreign rows answer with the
  same not-found response as a missing ID and are left untouched.
- `/trivia` rewards now credit the guild economy (`guild_economy`) instead of the
  retired `users` balance, so a correct answer appears in `/balance`, the economy
  leaderboard, and the shop. The credit is an atomic increment.
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
