# Contributing to Stribog-Bot

```bash
npm install
npm test
```

`npm test` also validates the README command reference. When changing a command
name, subcommand, option, or default permission, run `npm run docs:check` and
update the matching README row.

- Economy is per guild (`guild_economy`). Do not write to the global `users` balance for new features.
- `/give` must stay inside `transferCoins` (transaction).
- Button/menu/modal `customId` first segment must pass `safeHandlerName`.
- Tickets need `support_role` overwrites.
- `/invite` must not request Administrator.
- Keep MIT license.
