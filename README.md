# 🌪️ Stribog Discord Bot

<div align="center">
  <img src="https://img.shields.io/badge/discord.js-v14-5865F2?style=for-the-badge&logo=discord&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/SQLite-Database-003B57?style=for-the-badge&logo=sqlite&logoColor=white" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" />
</div>

<br>

> Named after **Stribog**, the Slavic god of wind, storms, and air. This bot brings powerful features to your Discord server like the unstoppable wind.

## ✨ Features

### 🔨 Moderation (12 Commands)
| Command | Description |
|---------|-------------|
| `/ban` | Ban a user from the server |
| `/kick` | Kick a user from the server |
| `/timeout` | Timeout a user |
| `/warn` | Warn a user |
| `/clear` | Delete messages in bulk |
| `/unban` | Unban a user |
| `/slowmode` | Set channel slowmode |
| `/lock` | Lock a channel |
| `/unlock` | Unlock a channel |
| `/softban` | Ban and immediately unban (clears messages) |
| `/nuke` | Clone and delete a channel |
| `/role` | Add or remove roles from users |

### 📊 Information (4 Commands)
| Command | Description |
|---------|-------------|
| `/userinfo` | Get information about a user |
| `/serverinfo` | Get server information |
| `/botinfo` | Get bot statistics and info |
| `/avatar` | Get user's avatar |

### 🎮 Fun (7 Commands)
| Command | Description |
|---------|-------------|
| `/8ball` | Ask the magic 8ball |
| `/coinflip` | Flip a coin |
| `/dice` | Roll dice |
| `/poll` | Create a poll |
| `/rps` | Play Rock Paper Scissors |
| `/trivia` | Play trivia games |
| `/meme` | Get random memes from Reddit |

### 🛠️ Utility (7 Commands)
| Command | Description |
|---------|-------------|
| `/ping` | Check bot latency |
| `/help` | View all commands |
| `/invite` | Get bot invite link |
| `/embed` | Create custom embeds |
| `/reminder` | Set reminders |
| `/calc` | Calculate math expressions |
| `/weather` | Get weather information |

### 💰 Economy (8 Commands)
| Command | Description |
|---------|-------------|
| `/balance` | Check your balance |
| `/daily` | Claim daily reward |
| `/work` | Work to earn coins |
| `/give` | Give coins to another user |
| `/leaderboard` | View economy leaderboard |
| `/deposit` | Deposit coins to bank |
| `/withdraw` | Withdraw coins from bank |
| `/shop` | View and buy items |

### 📈 Leveling (3 Commands)
| Command | Description |
|---------|-------------|
| `/rank` | View your or someone's rank |
| `/xpleaderboard` | View XP leaderboard |
| `/setxp` | Set user's XP (Admin) |

### 🎉 Giveaway System
| Command | Description |
|---------|-------------|
| `/giveaway start` | Start a new giveaway |
| `/giveaway end` | End a giveaway early |
| `/giveaway reroll` | Reroll giveaway winners |

### 🎫 Ticket System
| Command | Description |
|---------|-------------|
| `/ticket setup` | Setup the ticket system |
| `/ticket panel` | Send a ticket panel |
| `/ticket close` | Close a ticket |
| `/ticket add` | Add user to ticket |
| `/ticket remove` | Remove user from ticket |

### ⚙️ Admin (2 Commands)
| Command | Description |
|---------|-------------|
| `/automod` | Configure automod settings |
| `/setlog` | Configure logging channels |

### 🛡️ AutoMod Features
- Anti-link protection
- Anti-spam protection
- Bad words filter
- Excessive caps filter
- Mass mentions filter
- Domain whitelist

### 📝 Logging System
- Message edit/delete logs
- Member join/leave logs
- Role changes
- Nickname changes
- Mod action logs
- Ticket logs

## 📦 Installation

### Prerequisites
- Node.js 18 or higher
- npm or yarn

### Setup

1. Clone the repository
```bash
git clone https://github.com/Veleslobo/Stribog-Bot.git
cd Stribog-Bot
```

2. Install dependencies
```bash
npm install
```

3. Create a `.env` file
```env
TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
```

4. Deploy slash commands
```bash
npm run deploy
```

5. Start the bot
```bash
npm start
```

For development with auto-restart:
```bash
npm run dev
```

## 🗂️ Project Structure

```
stribog/
├── src/
│   ├── commands/
│   │   ├── admin/       # Admin commands
│   │   ├── economy/     # Economy commands
│   │   ├── fun/         # Fun commands
│   │   ├── giveaway/    # Giveaway commands
│   │   ├── info/        # Information commands
│   │   ├── leveling/    # Leveling commands
│   │   ├── moderation/  # Moderation commands
│   │   ├── ticket/      # Ticket commands
│   │   └── utility/     # Utility commands
│   ├── events/          # Discord events
│   ├── buttons/         # Button handlers
│   ├── menus/           # Select menu handlers
│   ├── utils/           # Utility functions
│   │   ├── database.js  # SQLite database
│   │   └── scheduler.js # Scheduled tasks
│   ├── config/          # Configuration
│   ├── index.js         # Main entry point
│   └── deploy-commands.js
├── data/                # SQLite database storage
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## 🔧 Configuration

Edit `src/config/config.js` to customize:
- Embed colors
- Cooldown settings
- Leveling XP rates
- Economy settings
- And more...

## 📊 Database

The bot uses SQLite with the following tables:
- `users` - User economy data
- `guilds` - Server settings
- `warnings` - User warnings
- `giveaways` - Giveaway data
- `giveaway_entries` - Giveaway participants
- `tickets` - Ticket data
- `reminders` - User reminders
- `user_guild_data` - Per-server user XP/levels
- `shop_items` - Server shop items
- `inventory` - User inventories

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👤 Author

**VelesLobo**
- GitHub: [@VelesLobo](https://github.com/VelesLobo)
- Email: batuhanaramaz@gmail.com
- Instagram: [@4veles](https://instagram.com/4veles)

---

<div align="center">
  <b>🌪️ Stribog - The Wind of Discord 🌪️</b>
  <br>
  <sub>Built with ❤️ using Discord.js v14</sub>
</div>
