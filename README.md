# 🌬️ Stribog Discord Bot

<div align="center">

![Discord.js](https://img.shields.io/badge/Discord.js-v14-5865F2?style=for-the-badge&logo=discord&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-Database-003B57?style=for-the-badge&logo=sqlite&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)

**Moderation, per-guild economy, leveling, giveaways, tickets.** Env var is `TOKEN` (not `DISCORD_TOKEN`). Weather is Open-Meteo — no API key. See [SECURITY.md](./SECURITY.md).

[Features](#-features) • [Installation](#-installation) • [Configuration](#-configuration) • [Commands](#-commands) • [Customization](#-customization) • [Roadmap](./ROADMAP.md) • [Changelog](./CHANGELOG.md)

</div>

---

## 📋 Table of Contents

1. [Features Overview](#-features)
2. [Requirements](#-requirements)
3. [Installation Guide](#-installation)
   - [Step 1: Download the Bot](#step-1-download-the-bot)
   - [Step 2: Install Node.js](#step-2-install-nodejs)
   - [Step 3: Create Discord Application](#step-3-create-discord-application)
   - [Step 4: Configure the Bot](#step-4-configure-the-bot)
   - [Step 5: Install Dependencies](#step-5-install-dependencies)
   - [Step 6: Deploy Commands](#step-6-deploy-commands)
   - [Step 7: Run the Bot](#step-7-run-the-bot)
4. [Command Reference](#-commands)
5. [Configuration Guide](#-configuration)
6. [Customization & Code Editing](#-customization)
7. [File Structure](#-file-structure)
8. [Troubleshooting](#-troubleshooting)
9. [FAQ](#-faq)

---

## ✨ Features

### 🛡️ Moderation
- **Ban/Unban** - Permanently or temporarily ban users
- **Kick** - Remove users from the server
- **Timeout** - Temporarily mute users
- **Warn** - Issue warnings with history tracking
- **Clear** - Bulk delete messages
- **Slowmode** - Control message frequency
- **Lock/Unlock** - Restrict channel access
- **Softban** - Ban and immediately unban to clear messages
- **Nuke** - Clone and delete channels
- **Role Management** - Add/remove roles from users

### 💰 Economy System
- **Balance** - Check your wallet and bank
- **Daily Rewards** - Claim daily coins
- **Work** - Earn coins through various jobs
- **Give** - Transfer coins to other users **in this server** (atomic, no dupes)
- **Deposit/Withdraw** - Manage your bank account
- **Shop** - Create and manage server shop items
- **Leaderboard** - View richest members

### 📊 Leveling System
- **XP Gain** - Earn XP by chatting
- **Rank Cards** - Check your level and progress
- **Leaderboard** - See top members
- **Admin Controls** - Set XP manually

### 🎉 Giveaway System
- **Create Giveaways** - Set up giveaways with custom duration and prizes
- **Multiple Winners** - Support for multiple winners
- **Reroll** - Pick new winners if needed
- **Entry Tracking** - See who entered

### 🎫 Ticket System
- **Ticket Panels** - Create interactive ticket panels
- **Categories** - Organize tickets by category
- **Support role** - `/ticket setup` takes `support_role` so staff can see tickets
- **Transcripts** - closing a ticket posts a `.txt` transcript to `ticket_log_channel`
- **Staff Controls** - Add/remove users from tickets; close is owner or staff only
- **Mod log** - ban/kick/timeout/warn/warning removals/clear/lock/role/nuke, automod triggers, and confirmed config imports write to `mod_log_channel` if set

### 📝 Logging System
- **Message Logs** - Track edited and deleted messages
- **Member Logs** - Join/leave notifications
- **Role Changes** - Track role updates
- **Moderation Logs** - Log all mod actions

### 🤖 AutoMod System
- **Anti-Spam** - Prevent message spam
- **Anti-Link** - Block unwanted links
- **Bad Words Filter** - Filter profanity
- **Caps Filter** - Prevent excessive caps
- **Mention Spam** - Block mass mentions
- **Audit trail** - Every trigger writes the rule, target, channel, action, and before/after state to `mod_log_channel`. Message content, matched words, and URLs are never logged, and audit delivery continues if the source channel was deleted.

### 🎮 Fun Commands
- **8ball** - Ask the magic 8-ball
- **Coinflip** - Flip a coin
- **Dice** - Roll dice
- **RPS** - Rock Paper Scissors
- **Trivia** - Answer trivia questions
- **Meme** - Get random memes
- **Poll** - Create polls
- **Pick** - Random choice from a list

### 🔧 Utility Commands
- **Help** - Interactive help menu
- **Ping** - Check bot latency
- **Reminder** - Set reminders
- **Calculator** - Math calculations
- **Weather** - Get weather information
- **Embed** - Create custom embeds
- **User/Server Info** - View information

### 🔐 Permission System
- **Role-Based Access** - Control who can use which commands
- **Command Disable** - Disable commands per channel or server-wide
- **Flexible Configuration** - Allow or deny specific roles

### 💾 Configuration Backups
- **Export** - Download settings, permission overrides, and disabled rules as JSON
- **Safe Import** - Same-guild validation, dry run by default, atomic apply
- **No Secrets** - Backups contain server configuration only, not tokens

---

## 📦 Requirements

Before you start, make sure you have:

| Requirement | Description | Download Link |
|-------------|-------------|---------------|
| **Node.js** | Version 18.0.0 or higher | [nodejs.org](https://nodejs.org/) |
| **npm** | Comes with Node.js | Included with Node.js |
| **Discord Account** | To create the bot | [discord.com](https://discord.com/) |
| **Text Editor** | To edit configuration | [VS Code](https://code.visualstudio.com/) (recommended) |

---

## 🚀 Installation

### Step 1: Download the Bot

**Option A: Using Git (Recommended)**

1. Open your terminal (Command Prompt, PowerShell, or Terminal)
2. Navigate to where you want to install the bot:
   ```bash
   cd Desktop
   ```
3. Clone the repository:
   ```bash
   git clone https://github.com/KodYazicam/Stribog-Bot.git
   ```
4. Enter the bot folder:
   ```bash
   cd Stribog-Bot
   ```

**Option B: Direct Download**

1. Go to [https://github.com/KodYazicam/Stribog-Bot](https://github.com/KodYazicam/Stribog-Bot)
2. Click the green **"Code"** button
3. Click **"Download ZIP"**
4. Extract the ZIP file to your desired location
5. Open the extracted folder

---

### Step 2: Install Node.js

If you don't have Node.js installed:

1. Go to [https://nodejs.org/](https://nodejs.org/)
2. Download the **LTS** version (recommended)
3. Run the installer
4. Follow the installation wizard (keep all default options)
5. Restart your computer

**Verify Installation:**

Open terminal and run:
```bash
node --version
```
You should see something like `v18.x.x` or higher.

```bash
npm --version
```
You should see a version number.

---

### Step 3: Create Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **"New Application"** (top right)
3. Enter a name for your bot (e.g., "Stribog")
4. Accept the terms and click **"Create"**

**Get Your Bot Token:**

1. In the left sidebar, click **"Bot"**
2. Click **"Reset Token"** button
3. Confirm and copy the token
4. **IMPORTANT:** Save this token somewhere safe! You'll need it later.

**Enable Required Intents:**

Still on the Bot page, scroll down and enable:
- ✅ **Presence Intent**
- ✅ **Server Members Intent**
- ✅ **Message Content Intent**

Click **"Save Changes"**

**Get Your Client ID:**

1. In the left sidebar, click **"OAuth2"** → **"General"**
2. Copy the **"Client ID"** - you'll need this too

**Invite the Bot to Your Server:**

1. In the left sidebar, click **"OAuth2"** → **"URL Generator"**
2. Under **"Scopes"**, check:
   - ✅ `bot`
   - ✅ `applications.commands`
3. Under **"Bot Permissions"**, do **not** tick Administrator. Check:
   - ✅ Manage Channels
   - ✅ Manage Roles
   - ✅ Kick Members
   - ✅ Ban Members
   - ✅ Manage Messages
   - ✅ Send Messages
   - ✅ Embed Links
   - ✅ Attach Files
   - ✅ Read Message History
   - ✅ Add Reactions
   - ✅ Use External Emojis

4. Copy the generated URL at the bottom
5. Open the URL in your browser
6. Select your server and click **"Authorize"**

---

### Step 4: Configure the Bot

1. In the bot folder, find the file named `.env.example`
2. **Rename** it to `.env` (remove the `.example` part)
3. Open `.env` in a text editor (Notepad, VS Code, etc.)
4. Fill in your information:

```env
# Discord Bot Token (from Discord Developer Portal)
TOKEN=paste_your_bot_token_here

# Discord Client ID (from Discord Developer Portal)
CLIENT_ID=paste_your_client_id_here

# Your Discord Server ID (right-click server → Copy Server ID) — used by deploy-commands.js
GUILD_ID=paste_your_server_id_here

# Your Discord user id (optional)
OWNER_ID=paste_your_user_id_here

# Prefix for prefix-enabled command groups (default: !)
# Max 5 characters, must not start with a letter/number, and must not contain / @ # < >
PREFIX=!
```

`/weather` uses [Open-Meteo](https://open-meteo.com/) and needs **no API key**. There is no `WEATHER_API_KEY`.

Economy is **per guild**. `/give` is a SQLite transaction. Tickets need a **support role** (`/ticket setup … support_role:@Staff`) or staff without Administrator cannot see the channel.

Commands in the economy, fun, info, leveling, admin, and giveaway groups work
with both slash and the configured prefix (default `!`). Prefix and slash share
the same handler, permissions, and cooldown. Admin and giveaway commands keep
their Discord default permission requirements on the prefix path too. Examples:
`!balance @user`, `!8ball "Will it work?"`, `!rank`, `!automod status`,
`!giveaway start "Nitro" 1h 2`. Moderation, ticket, and utility commands remain
slash-only for now.

`/invite` does **not** request Administrator.

**How to Get Your Server ID:**

1. Open Discord
2. Go to User Settings → Advanced
3. Enable **"Developer Mode"**
4. Right-click on your server icon
5. Click **"Copy Server ID"**

---

### Step 5: Install Dependencies

1. Open terminal in the bot folder
2. Run this command:

```bash
npm install
```

Wait for installation to complete. You should see a progress bar and eventually a success message.

**What This Does:** This command downloads all the required packages (discord.js, better-sqlite3, etc.) that the bot needs to run.

---

### Step 6: Deploy Commands

Before the bot can use slash commands, you need to register them with Discord:

```bash
npm run deploy
```

You should see: `Successfully registered X application commands.`

**Note:** You only need to run this once, or whenever you add/modify commands.

---

### Step 7: Run the Bot

Start the bot:

```bash
npm start
```

If everything is correct, you should see:
```
✓ Logged in as YourBotName#1234
✓ Ready! Serving X guilds
```

**The bot is now online!** 🎉

---

## 📜 Commands

Slash commands are always available. The bot prefix (default `!`) also runs
commands in the economy, fun, info, leveling, admin, and giveaway groups. Both
forms use the same handlers, permission checks, and cooldowns. Moderation,
ticket, and utility commands remain slash-only for now.

> **Permissions** are the Discord defaults declared by each command. `Everyone`
> means no default restriction. Admins can override command access with
> `/permissions`.
>
> Examples are checked against the serialized slash-command payloads. Run
> `npm run commands:list` to inspect command, subcommand, and option names;
> `npm test` also runs `npm run docs:check` to verify every row in this section.

### Admin Commands

| Command | Permission | Description | Example |
|---------|------------|-------------|---------|
| `/setlog all` | Administrator | Set the main log channel for all events | `/setlog all channel:#logs` |
| `/setlog modlog` | Administrator | Set the moderation log channel | `/setlog modlog channel:#mod-logs` |
| `/setlog welcome` | Administrator | Set the welcome channel | `/setlog welcome channel:#welcome` |
| `/setlog goodbye` | Administrator | Set the goodbye channel | `/setlog goodbye channel:#goodbye` |
| `/setlog levelup` | Administrator | Set the level-up channel | `/setlog levelup channel:#level-up` |
| `/setlog disable` | Administrator | Disable a logging channel | `/setlog disable type:mod_log_channel` |
| `/setlog status` | Administrator | View current logging settings | `/setlog status` |
| `/automod antilink` | Administrator | Toggle anti-link protection | `/automod antilink enabled:true` |
| `/automod antispam` | Administrator | Toggle anti-spam protection | `/automod antispam enabled:true` |
| `/automod badwords` | Administrator | Toggle the bad-words filter | `/automod badwords enabled:true` |
| `/automod caps` | Administrator | Toggle the excessive-caps filter | `/automod caps enabled:true` |
| `/automod mentions` | Administrator | Toggle the mass-mentions filter | `/automod mentions enabled:true` |
| `/automod addword` | Administrator | Add a word to the filter | `/automod addword word:badword` |
| `/automod removeword` | Administrator | Remove a word from the filter | `/automod removeword word:badword` |
| `/automod whitelist` | Administrator | Whitelist a link domain | `/automod whitelist domain:youtube.com` |
| `/automod status` | Administrator | View automod settings | `/automod status` |
| `/permissions allow` | Administrator | Allow a role to use a command | `/permissions allow command:ping role:@Member` |
| `/permissions deny` | Administrator | Deny a role from a command | `/permissions deny command:ban role:@Member` |
| `/permissions remove` | Administrator | Remove a role override | `/permissions remove command:ban role:@Member` |
| `/permissions reset` | Administrator | Reset all rules for a command | `/permissions reset command:ban` |
| `/permissions disable` | Administrator | Disable a command server-wide or in a channel | `/permissions disable command:meme channel:#general` |
| `/permissions enable` | Administrator | Re-enable a disabled command | `/permissions enable command:meme channel:#general` |
| `/permissions view` | Administrator | View rules for a command | `/permissions view command:ban` |
| `/permissions list` | Administrator | List all permission overrides | `/permissions list` |
| `/config export` | Administrator | Download a JSON backup of this server's configuration | `/config export` |
| `/config import` | Administrator | Validate and restore a configuration backup | `/config import file:<attachment> confirm:true` |

### Moderation Commands

| Command | Permission | Description | Example |
|---------|------------|-------------|---------|
| `/ban` | Ban Members | Ban a member | `/ban target:@user reason:Breaking rules days:0` |
| `/unban` | Ban Members | Unban a user by id | `/unban userid:123456789012345678 reason:Appeal accepted` |
| `/kick` | Kick Members | Kick a member | `/kick target:@user reason:Spam` |
| `/timeout` | Moderate Members | Timeout a member for a number of minutes | `/timeout target:@user duration:60 reason:Spam` |
| `/warn` | Moderate Members | Warn a member and save it to history | `/warn target:@user reason:Warning` |
| `/warnings list` | Moderate Members | View a user's warning history | `/warnings list user:@user` |
| `/warnings remove` | Moderate Members | Remove one warning by id | `/warnings remove user:@user id:1` |
| `/warnings clear` | Moderate Members | Clear all warnings for a user | `/warnings clear user:@user` |
| `/clear` | Manage Messages | Bulk-delete recent messages | `/clear amount:50 target:@user` |
| `/slowmode` | Manage Channels | Set channel slowmode in seconds | `/slowmode seconds:10 channel:#general` |
| `/lock` | Manage Channels | Lock a channel | `/lock channel:#general reason:Maintenance` |
| `/unlock` | Manage Channels | Unlock a channel | `/unlock channel:#general` |
| `/softban` | Ban Members | Ban and immediately unban to remove messages | `/softban target:@user days:1 reason:Spam` |
| `/nuke` | Administrator | Recreate the current channel | `/nuke` |
| `/role add` | Manage Roles | Add a role to a user | `/role add target:@user role:@VIP` |
| `/role remove` | Manage Roles | Remove a role from a user | `/role remove target:@user role:@VIP` |
| `/role info` | Manage Roles | Show role information | `/role info role:@VIP` |

### Economy Commands

Economy commands are available as slash commands and with the bot prefix
(`PREFIX`, default `!`). Both forms use the same handler and cooldown.

| Command | Permission | Description | Example |
|---------|------------|-------------|---------|
| `/balance` | Everyone | Check a balance | `/balance user:@user` |
| `/daily` | Everyone | Claim the daily reward | `/daily` |
| `/work` | Everyone | Work for coins | `/work` |
| `/give` | Everyone | Transfer coins to another user | `/give user:@user amount:100` |
| `/deposit` | Everyone | Deposit coins into the bank | `/deposit amount:all` |
| `/withdraw` | Everyone | Withdraw coins from the bank | `/withdraw amount:500` |
| `/leaderboard` | Everyone | View economy or level rankings | `/leaderboard type:economy` |
| `/shop view` | Everyone | View shop items | `/shop view` |
| `/shop buy` | Everyone | Buy a shop item by id | `/shop buy id:1` |
| `/shop add` | Everyone* | Add a shop item | `/shop add name:VIP price:1000 description:VIP access role:@VIP` |
| `/shop remove` | Everyone* | Remove a shop item by id | `/shop remove id:1` |

\* `/shop add` and `/shop remove` have no Discord default but check for
Administrator at runtime.

### Leveling Commands

| Command | Permission | Description | Example |
|---------|------------|-------------|---------|
| `/rank` | Everyone | View a user's rank | `/rank user:@user` |
| `/xpleaderboard` | Everyone | View XP rankings | `/xpleaderboard page:1` |
| `/setxp` | Administrator | Set a user's XP | `/setxp user:@user xp:1000` |

### Giveaway Commands

| Command | Permission | Description | Example |
|---------|------------|-------------|---------|
| `/giveaway start` | Manage Guild | Start a giveaway | `/giveaway start prize:Nitro duration:1h winners:1` |
| `/giveaway end` | Manage Guild | End a giveaway early | `/giveaway end message_id:123456789012345678` |
| `/giveaway reroll` | Manage Guild | Reroll giveaway winners | `/giveaway reroll message_id:123456789012345678` |

### Ticket Commands

| Command | Permission | Description | Example |
|---------|------------|-------------|---------|
| `/ticket setup` | Manage Channels | Configure the ticket category, logs, and staff role | `/ticket setup category:#Tickets log_channel:#ticket-logs support_role:@Staff` |
| `/ticket panel` | Manage Channels | Send the ticket panel in the current channel | `/ticket panel` |
| `/ticket close` | Manage Channels | Close the current ticket | `/ticket close` |
| `/ticket add` | Manage Channels | Add a user to the current ticket | `/ticket add user:@user` |
| `/ticket remove` | Manage Channels | Remove a user from the current ticket | `/ticket remove user:@user` |

### Fun Commands

| Command | Permission | Description | Example |
|---------|------------|-------------|---------|
| `/8ball` | Everyone | Ask the magic 8-ball | `/8ball question:Will I win?` |
| `/coinflip` | Everyone | Flip a coin | `/coinflip` |
| `/dice` | Everyone | Roll dice | `/dice sides:20 count:2` |
| `/rps` | Everyone | Play rock-paper-scissors | `/rps opponent:@user` |
| `/trivia` | Everyone | Start a trivia question | `/trivia category:science difficulty:medium` |
| `/meme` | Everyone | Fetch a random meme | `/meme subreddit:dankmemes` |
| `/poll` | Everyone | Create a reaction poll | `/poll question:Pineapple on pizza? option1:Yes option2:No` |
| `/pick` | Everyone | Pick one option at random | `/pick options:pizza, sushi, burgers` |

### Info Commands

| Command | Permission | Description | Example |
|---------|------------|-------------|---------|
| `/avatar` | Everyone | Show a user's avatar | `/avatar target:@user` |
| `/botinfo` | Everyone | Show bot information | `/botinfo` |
| `/serverinfo` | Everyone | Show server information | `/serverinfo` |
| `/userinfo` | Everyone | Show user information | `/userinfo target:@user` |

### Utility Commands

| Command | Permission | Description | Example |
|---------|------------|-------------|---------|
| `/help` | Everyone | Open the help menu | `/help` |
| `/ping` | Everyone | Show bot latency | `/ping` |
| `/reminder set` | Everyone | Set a reminder | `/reminder set time:30m message:Meeting` |
| `/reminder list` | Everyone | List your reminders | `/reminder list` |
| `/reminder delete` | Everyone | Delete one of your reminders | `/reminder delete id:1` |
| `/calc` | Everyone | Evaluate an arithmetic expression | `/calc expression:5+5*2` |
| `/weather` | Everyone | Show weather for a city | `/weather city:London` |
| `/embed` | Manage Messages | Send a custom embed | `/embed title:Hello description:World channel:#general` |
| `/invite` | Everyone | Get the bot invite link | `/invite` |

---

## ⚙️ Configuration

### Bot Configuration

The main configuration file is located at `src/config/config.js`:

```javascript
module.exports = {
    // Embed colors (hex values)
    colors: {
        primary: 0x5865F2,   // Blue - main bot color
        success: 0x57F287,   // Green - success messages
        warning: 0xFEE75C,   // Yellow - warnings
        danger: 0xED4245,    // Red - errors/bans
        info: 0x5865F2       // Blue - information
    },
    
    // Default cooldown in seconds
    cooldown: 3,
    
    // Economy settings
    economy: {
        dailyAmount: 100,           // Daily reward amount
        workMinAmount: 50,          // Minimum work earnings
        workMaxAmount: 200,         // Maximum work earnings
        workCooldown: 3600000,      // Work cooldown (1 hour in ms)
        dailyCooldown: 86400000     // Daily cooldown (24 hours in ms)
    },
    
    // Leveling settings
    leveling: {
        xpPerMessage: 15,           // Base XP per message
        xpVariance: 10,             // Random variance (+/-)
        xpCooldown: 60000           // XP cooldown (1 minute in ms)
    }
};
```

### Changing Colors

To change the bot's embed colors:

1. Open `src/config/config.js`
2. Find the `colors` section
3. Change the hex values:
   - `0x5865F2` = Discord Blurple
   - `0x57F287` = Green
   - `0xFEE75C` = Yellow
   - `0xED4245` = Red

**Color Picker:** Use [htmlcolorcodes.com](https://htmlcolorcodes.com/color-picker/) to find colors. Take the hex code (e.g., `#FF5733`) and convert it to `0xFF5733`.

### Changing Economy Values

To adjust economy settings:

1. Open `src/config/config.js`
2. Modify the `economy` section
3. Restart the bot

**Example - Increasing daily reward:**
```javascript
economy: {
    dailyAmount: 500,  // Changed from 100 to 500
    // ...
}
```

### Changing Leveling Settings

To adjust how fast users level up:

```javascript
leveling: {
    xpPerMessage: 25,    // More XP per message
    xpVariance: 15,      // More randomness
    xpCooldown: 30000    // 30 second cooldown
}
```

---

## 🎨 Customization

### How to Add a New Command

1. **Choose a category** - Look in `src/commands/` for existing categories
2. **Create a new file** - e.g., `src/commands/fun/joke.js`
3. **Use this template:**

```javascript
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { colors } = require('../../config/config');

module.exports = {
    // Command definition
    data: new SlashCommandBuilder()
        .setName('joke')                           // Command name (lowercase)
        .setDescription('Get a random joke')       // Description
        .addStringOption(option =>                 // Optional: add options
            option.setName('category')
                .setDescription('Joke category')
                .setRequired(false)
                .addChoices(
                    { name: 'Programming', value: 'programming' },
                    { name: 'Dad Jokes', value: 'dad' }
                )),
    
    // Cooldown in seconds (optional)
    cooldown: 5,
    
    // Command execution
    async execute(interaction, client) {
        // Your code here
        const jokes = [
            "Why do programmers prefer dark mode? Because light attracts bugs!",
            "Why did the developer go broke? Because he used up all his cache!",
        ];
        
        const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
        
        const embed = new EmbedBuilder()
            .setColor(colors.primary)
            .setTitle('😂 Random Joke')
            .setDescription(randomJoke)
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
    }
};
```

4. **Deploy the command:**
```bash
npm run deploy
```

5. **Restart the bot**

### How to Modify an Existing Command

1. Find the command file in `src/commands/`
2. Open it in your text editor
3. Make your changes
4. If you changed the command definition (`data`), run `npm run deploy`
5. Restart the bot

**Example - Changing the 8ball responses:**

1. Open `src/commands/fun/8ball.js`
2. Find the `responses` array
3. Add, remove, or modify responses:

```javascript
const responses = [
    'Yes!',
    'No!',
    'Maybe...',
    'Ask again later',
    'Your custom response here',  // Added new response
];
```

### How to Add a New Event

Events are located in `src/events/`. To add a new event:

1. Create a new file, e.g., `src/events/messageReactionAdd.js`
2. Use this template:

```javascript
module.exports = {
    name: 'messageReactionAdd',  // Discord.js event name
    async execute(reaction, user, client) {
        // Ignore bot reactions
        if (user.bot) return;
        
        // Your code here
        console.log(`${user.tag} reacted with ${reaction.emoji.name}`);
    }
};
```

3. Restart the bot

### How to Change Bot Presence/Status

1. Open `src/events/ready.js`
2. Find the `setPresence` call
3. Modify it:

```javascript
client.user.setPresence({
    activities: [{
        name: 'your custom status',      // Status text
        type: ActivityType.Watching      // Playing, Streaming, Listening, Watching, Competing
    }],
    status: 'online'  // online, idle, dnd, invisible
});
```

### How to Add Command Aliases

Discord slash commands don't support aliases, but you can create a copy of the command with a different name:

1. Copy the command file
2. Rename the copy
3. Change the `setName()` value
4. Deploy commands

---

## 📁 File Structure

```
stribog/
├── 📄 .env                    # Environment variables (your tokens)
├── 📄 .env.example            # Example environment file
├── 📄 .gitignore              # Files to ignore in Git
├── 📄 package.json            # Project dependencies
├── 📄 README.md               # This file
│
└── 📁 src/                    # Source code
    ├── 📄 index.js            # Main bot file (entry point)
    ├── 📄 deploy-commands.js  # Command deployment script
    │
    ├── 📁 commands/           # All slash commands
    │   ├── 📁 admin/          # Admin commands
    │   │   ├── automod.js     # AutoMod configuration
    │   │   ├── permissions.js # Permission management
    │   │   └── setlog.js      # Logging setup
    │   │
    │   ├── 📁 economy/        # Economy commands
    │   │   ├── balance.js
    │   │   ├── daily.js
    │   │   ├── deposit.js
    │   │   ├── give.js
    │   │   ├── leaderboard.js
    │   │   ├── shop.js
    │   │   ├── withdraw.js
    │   │   └── work.js
    │   │
    │   ├── 📁 fun/            # Fun commands
    │   │   ├── 8ball.js
    │   │   ├── coinflip.js
    │   │   ├── dice.js
    │   │   ├── meme.js
    │   │   ├── poll.js
    │   │   ├── rps.js
    │   │   └── trivia.js
    │   │
    │   ├── 📁 giveaway/       # Giveaway commands
    │   │   └── giveaway.js
    │   │
    │   ├── 📁 info/           # Information commands
    │   │   ├── avatar.js
    │   │   ├── botinfo.js
    │   │   ├── serverinfo.js
    │   │   └── userinfo.js
    │   │
    │   ├── 📁 leveling/       # Leveling commands
    │   │   ├── rank.js
    │   │   ├── setxp.js
    │   │   └── xpleaderboard.js
    │   │
    │   ├── 📁 moderation/     # Moderation commands
    │   │   ├── ban.js
    │   │   ├── clear.js
    │   │   ├── kick.js
    │   │   ├── lock.js
    │   │   ├── nuke.js
    │   │   ├── role.js
    │   │   ├── slowmode.js
    │   │   ├── softban.js
    │   │   ├── timeout.js
    │   │   ├── unban.js
    │   │   ├── unlock.js
    │   │   └── warn.js
    │   │
    │   ├── 📁 ticket/         # Ticket commands
    │   │   └── ticket.js
    │   │
    │   └── 📁 utility/        # Utility commands
    │       ├── calc.js
    │       ├── embed.js
    │       ├── help.js
    │       ├── invite.js
    │       ├── ping.js
    │       ├── reminder.js
    │       └── weather.js
    │
    ├── 📁 events/             # Discord events
    │   ├── guildMemberAdd.js      # Member join
    │   ├── guildMemberRemove.js   # Member leave
    │   ├── guildMemberUpdate.js   # Member update (roles, etc.)
    │   ├── interactionCreate.js   # Slash commands, buttons, etc.
    │   ├── messageCreate.js       # Message sent (XP, AutoMod)
    │   ├── messageDelete.js       # Message deleted (logging)
    │   ├── messageUpdate.js       # Message edited (logging)
    │   └── ready.js               # Bot ready
    │
    ├── 📁 buttons/            # Button interaction handlers
    │   ├── giveaway.js        # Giveaway buttons
    │   ├── rps.js             # Rock Paper Scissors buttons
    │   ├── ticket.js          # Ticket buttons
    │   └── trivia.js          # Trivia buttons
    │
    ├── 📁 menus/              # Select menu handlers
    │   └── help.js            # Help menu
    │
    ├── 📁 config/             # Configuration
    │   └── config.js          # Main config file
    │
    └── 📁 utils/              # Utility functions
        ├── database.js        # Database operations
        └── scheduler.js       # Scheduled tasks (reminders, giveaways)
```

---

## 🔧 Troubleshooting

### Common Issues and Solutions

#### ❌ "Cannot find module 'discord.js'"
**Solution:** Run `npm install` in the bot folder.

#### ❌ "An invalid token was provided"
**Solution:** 
1. Go to Discord Developer Portal
2. Reset your bot token
3. Copy the new token
4. Update `.env` file with the new token

#### ❌ "Missing Permissions"
**Solution:** 
1. Enable the permissions listed in the invite section (not Administrator)
2. Make sure the bot's role is higher than the roles it's trying to manage

#### ❌ "Unknown interaction"
**Solution:** Run `npm run deploy` to register commands.

#### ❌ "Used disallowed intents"
**Solution:** Enable all intents in Discord Developer Portal → Bot section.

#### ❌ "SQLITE_CANTOPEN"
**Solution:** Make sure the bot has write permissions in its folder.

#### ❌ Commands not showing up
**Solution:**
1. Run `npm run deploy`
2. Wait a few minutes (Discord caches commands)
3. Try restarting Discord

#### ❌ Bot is online but not responding
**Solution:**
1. Check if commands are deployed (`npm run deploy`)
2. Check the console for errors
3. Make sure Message Content Intent is enabled

### Error Reading

When you see an error, look for:
1. **File name and line number** - Shows where the error occurred
2. **Error message** - Describes what went wrong
3. **Stack trace** - Shows the path the code took

**Example error:**
```
Error: Cannot read property 'id' of undefined
    at Object.execute (src/commands/moderation/ban.js:25:30)
```
This tells you: The error is in `ban.js` at line 25, column 30.

---

## ❓ FAQ

### How do I keep the bot running 24/7?

**Option 1: Use a VPS (Virtual Private Server)**
- [DigitalOcean](https://www.digitalocean.com/)
- [Vultr](https://www.vultr.com/)
- [Linode](https://www.linode.com/)
- [Hetzner](https://www.hetzner.com/)

**Option 2: Use a Bot Hosting Service**
- [Railway](https://railway.app/)
- [Heroku](https://www.heroku.com/)
- [Render](https://render.com/)

**Option 3: Use PM2 (on your own server)**
```bash
npm install -g pm2
pm2 start src/index.js --name "stribog"
pm2 save
pm2 startup
```

### How do I update the bot?

If you cloned from GitHub:
```bash
git pull origin main
npm install
npm run deploy
```

Then restart the bot.

### How do I backup the database?

The database file is `database.sqlite` in the bot folder. Simply copy this file to back up all data.

For server settings only, run `/config export` and keep the downloaded JSON
file. `/config import` validates that backup and shows a dry run before any
changes; add `confirm:true` to apply it. Imports are limited to the same guild
so channel and role ids are never copied between servers.

### Can I run multiple bots from the same code?

Yes! Create a copy of the bot folder and use different `.env` files with different tokens.

### How do I add more work jobs?

1. Open `src/commands/economy/work.js`
2. Find the `jobs` array
3. Add new jobs:

```javascript
const jobs = [
    { name: 'Developer', emoji: '💻', min: 100, max: 300 },
    { name: 'Designer', emoji: '🎨', min: 80, max: 250 },
    // Add more here
];
```

### How do I change the XP formula?

Edit `src/config/config.js` (`leveling.xpPerMessage`, `xpCooldown`, `baseXP`, `xpMultiplier`) and `src/utils/leveling.js`. Rank, setxp, and message XP all share that curve. Do **not** use `level * 100` in command files.

Giveaways store entries in SQLite (`giveaway_entries`). Ending / rerolling does **not** use 🎉 reactions. Welcome messages use `welcome_channel` on the guild row (or the system channel).

### How do I disable a feature?

**To disable a command:** Use `/permissions disable command:commandname`

**To remove a command entirely:**
1. Delete the command file from `src/commands/`
2. Run `npm run deploy`
3. Restart the bot

### How do I change the bot's language?

All text strings are in the command files. Search for the text you want to change and modify it. For example, to change "You don't have permission" messages, search for that text in the files and replace it.

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests

---

## 📧 Support

- **GitHub Issues:** [Report a bug](https://github.com/KodYazicam/Stribog-Bot/issues)
- **Discord:** Coming soon

---

<div align="center">

**Made with ❤️ by [KodYazicam](https://github.com/KodYazicam)**

⭐ Star this repository if you found it helpful!

</div>
