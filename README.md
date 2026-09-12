# 🌬️ Stribog Discord Bot

<div align="center">

![Discord.js](https://img.shields.io/badge/Discord.js-v14-5865F2?style=for-the-badge&logo=discord&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-Database-003B57?style=for-the-badge&logo=sqlite&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)

**A powerful, feature-rich Discord bot with moderation, economy, leveling, giveaways, tickets, and much more!**

[Features](#-features) • [Installation](#-installation) • [Configuration](#-configuration) • [Commands](#-commands) • [Customization](#-customization)

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
- **Give** - Transfer coins to other users
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
- **Transcripts** - Save ticket conversations
- **Staff Controls** - Add/remove users from tickets

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

### 🎮 Fun Commands
- **8ball** - Ask the magic 8-ball
- **Coinflip** - Flip a coin
- **Dice** - Roll dice
- **RPS** - Rock Paper Scissors
- **Trivia** - Answer trivia questions
- **Meme** - Get random memes
- **Poll** - Create polls

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
3. Under **"Bot Permissions"**, check:
   - ✅ `Administrator` (easiest option)
   
   Or select individual permissions:
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
DISCORD_TOKEN=paste_your_bot_token_here

# Discord Client ID (from Discord Developer Portal)
CLIENT_ID=paste_your_client_id_here

# Your Discord Server ID (right-click server → Copy Server ID)
GUILD_ID=paste_your_server_id_here

# Weather API Key (optional, for /weather command)
# Get one free at: https://www.weatherapi.com/
WEATHER_API_KEY=your_weather_api_key_here
```

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

### Admin Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `/setlog` | Set logging channel | `/setlog channel:#channel` |
| `/automod` | Configure auto-moderation | `/automod antispam enable:true` |
| `/permissions` | Manage command permissions | `/permissions allow command:ping role:@Member` |

### Moderation Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `/ban` | Ban a user | `/ban user:@user reason:Breaking rules` |
| `/unban` | Unban a user | `/unban user_id:123456789` |
| `/kick` | Kick a user | `/kick user:@user reason:Spam` |
| `/timeout` | Timeout a user | `/timeout user:@user duration:1h reason:Spam` |
| `/warn` | Warn a user | `/warn user:@user reason:Warning` |
| `/warn list` | View warnings | `/warn list user:@user` |
| `/warn remove` | Remove warning | `/warn remove user:@user id:1` |
| `/warn clear` | Clear all warnings | `/warn clear user:@user` |
| `/clear` | Delete messages | `/clear amount:50` |
| `/slowmode` | Set slowmode | `/slowmode seconds:5` |
| `/lock` | Lock channel | `/lock reason:Maintenance` |
| `/unlock` | Unlock channel | `/unlock` |
| `/softban` | Softban user | `/softban user:@user` |
| `/nuke` | Nuke channel | `/nuke` |
| `/role` | Manage roles | `/role add user:@user role:@Role` |

### Economy Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `/balance` | Check balance | `/balance` or `/balance user:@user` |
| `/daily` | Claim daily reward | `/daily` |
| `/work` | Work for coins | `/work` |
| `/give` | Give coins to user | `/give user:@user amount:100` |
| `/deposit` | Deposit to bank | `/deposit amount:500` |
| `/withdraw` | Withdraw from bank | `/withdraw amount:500` |
| `/leaderboard` | Economy rankings | `/leaderboard` |
| `/shop` | View/manage shop | `/shop view` |
| `/shop add` | Add shop item | `/shop add name:VIP role:@VIP price:1000` |
| `/shop buy` | Buy from shop | `/shop buy item:VIP` |

### Leveling Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `/rank` | View your rank | `/rank` or `/rank user:@user` |
| `/xpleaderboard` | XP rankings | `/xpleaderboard` |
| `/setxp` | Set user XP | `/setxp user:@user amount:1000` |

### Giveaway Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `/giveaway start` | Start giveaway | `/giveaway start duration:1h winners:1 prize:Nitro` |
| `/giveaway end` | End giveaway early | `/giveaway end message_id:123456` |
| `/giveaway reroll` | Reroll winners | `/giveaway reroll message_id:123456` |

### Ticket Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `/ticket setup` | Setup ticket system | `/ticket setup category:#category log:#log-channel` |
| `/ticket panel` | Create ticket panel | `/ticket panel channel:#channel title:Support` |
| `/ticket close` | Close a ticket | `/ticket close reason:Resolved` |
| `/ticket add` | Add user to ticket | `/ticket add user:@user` |
| `/ticket remove` | Remove user | `/ticket remove user:@user` |

### Fun Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `/8ball` | Ask magic 8-ball | `/8ball question:Will I win?` |
| `/coinflip` | Flip a coin | `/coinflip` |
| `/dice` | Roll dice | `/dice sides:20` |
| `/rps` | Rock Paper Scissors | `/rps` |
| `/trivia` | Trivia game | `/trivia` |
| `/meme` | Random meme | `/meme` |
| `/poll` | Create poll | `/poll question:Pineapple on pizza? option1:Yes option2:No` |

### Utility Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `/help` | Help menu | `/help` |
| `/ping` | Bot latency | `/ping` |
| `/reminder` | Set reminder | `/reminder time:30m message:Meeting` |
| `/calc` | Calculator | `/calc expression:5+5*2` |
| `/weather` | Weather info | `/weather location:London` |
| `/embed` | Create embed | `/embed title:Hello description:World` |
| `/invite` | Bot invite link | `/invite` |
| `/userinfo` | User information | `/userinfo user:@user` |
| `/serverinfo` | Server information | `/serverinfo` |
| `/botinfo` | Bot information | `/botinfo` |
| `/avatar` | User avatar | `/avatar user:@user` |

### Permission Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `/permissions allow` | Allow role to use command | `/permissions allow command:ban role:@Moderator` |
| `/permissions deny` | Deny role from command | `/permissions deny command:ban role:@Member` |
| `/permissions remove` | Remove permission rule | `/permissions remove command:ban role:@Member` |
| `/permissions reset` | Reset all rules for command | `/permissions reset command:ban` |
| `/permissions disable` | Disable command | `/permissions disable command:meme channel:#general` |
| `/permissions enable` | Enable command | `/permissions enable command:meme` |
| `/permissions view` | View permissions | `/permissions view command:ban` |
| `/permissions list` | List all rules | `/permissions list` |

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
1. Make sure the bot has Administrator permission
2. Or enable all required permissions individually
3. Make sure the bot's role is higher than the roles it's trying to manage

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
