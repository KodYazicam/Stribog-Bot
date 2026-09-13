# Security Policy

Stribog-Bot is a moderation + utility Discord bot. A stolen `TOKEN` is a stolen server.

## Invite

`/invite` requests moderation permissions (kick/ban/timeout/manage channels), **not** Administrator. Still: only invite it to servers you trust.

## Economy

Balances are **per guild**. A transfer uses a SQLite transaction so coins cannot be duplicated by racing `/give`.

## Tickets

Create a support role with `/ticket setup … support_role:@Staff`. Without it, only the ticket author and the bot can see the channel.

Button `customId` first segments are allowlisted (`ticket`, `trivia`, `rps`, `giveaway`, `help`, `nuke`). Path-like ids are ignored.

## Reporting

Open a private advisory on [KodYazicam/Stribog-Bot](https://github.com/KodYazicam/Stribog-Bot/security/advisories/new).
