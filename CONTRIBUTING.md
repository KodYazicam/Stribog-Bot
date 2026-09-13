# Contributing to Stribog-Bot

```bash
npm install
npm test
```

- Economy is per guild (`guild_economy`). Do not write to the global `users` balance for new features.
- `/give` must stay inside `transferCoins` (transaction).
- Button/menu/modal `customId` first segment must pass `safeHandlerName`.
- Tickets need `support_role` overwrites.
- `/invite` must not request Administrator.
- Keep MIT license.
