# Contributing to Stribog-Bot

```bash
npm install
npm test
```

`npm test` also validates the README command reference. When changing a command
name, subcommand, option, or default permission, run `npm run docs:check` and
update the matching README row.

`npm run test:coverage` runs the same suite with `node --test
--experimental-test-coverage` and fails when `src/**` drops below 74% lines, 71%
branches, or 78% functions. CI runs it in the `test` job, so a pull request that
deletes tests or leaves a new branch untested goes red. Add the missing test
instead of lowering a threshold, and raise the floor when coverage improves;
`tests/coverage-gate.test.js` fails if the gate is removed or weakened.

`node --test` runs each test file in its own process. Any test that loads
`src/utils/database` must first `require('./helpers/test-db')`; the helper points
`STRIBOG_DB_PATH` at a private temp file and removes it on exit, so parallel
files never share `data/bot.db`. Set `STRIBOG_DB_PATH` yourself (for example to
an absolute path or `:memory:`) to override the database location; unset, the bot
keeps using `data/bot.db`.

- Economy is per guild (`guild_economy`). Do not write to the global `users` balance for new features.
- `/give` must stay inside `transferCoins` (transaction).
- Button/menu/modal `customId` first segment must pass `safeHandlerName`.
- Tickets need `support_role` overwrites.
- `/invite` must not request Administrator.
- Keep MIT license.
