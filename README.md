# Stribog

A full-featured Discord bot built with Discord.js v14. Named after the Slavic god of wind, Stribog brings swift moderation, utility commands, and fun features to your server.

## Features

### Moderation
- **Ban** - Permanently ban members with optional message deletion
- **Kick** - Remove members from the server
- **Timeout** - Temporarily mute members (1 min to 28 days)
- **Warn** - Send warnings to members via DM
- **Clear** - Bulk delete messages with optional user filter

### Information
- **User Info** - Display detailed user information including roles, join date, and badges
- **Server Info** - Show comprehensive server statistics
- **Bot Info** - View bot statistics, uptime, and system information
- **Avatar** - Get user avatars in multiple formats with download links

### Fun
- **8Ball** - Ask the magic 8-ball a question
- **Coinflip** - Flip a coin
- **Dice** - Roll dice with customizable sides and count
- **Poll** - Create interactive polls with up to 5 options

### Utility
- **Ping** - Check bot and API latency
- **Help** - Interactive help menu with category selection
- **Invite** - Get bot invite link
- **Embed** - Create custom embed messages

## Requirements

- Node.js 18.0.0 or higher
- Discord.js v14
- A Discord bot token

## Installation

1. Clone the repository:
```bash
git clone https://github.com/Veleslobo/Stribog-Bot.git
cd Stribog-Bot
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Configure your `.env` file:
```env
TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
GUILD_ID=your_guild_id_here
```

## Getting Your Bot Token

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to the "Bot" section
4. Click "Reset Token" to get your bot token
5. Enable the following Privileged Gateway Intents:
   - Presence Intent
   - Server Members Intent
   - Message Content Intent

## Inviting the Bot

1. Go to the "OAuth2" section in the Developer Portal
2. Select "URL Generator"
3. Select the following scopes:
   - `bot`
   - `applications.commands`
4. Select the required permissions (Administrator recommended for full functionality)
5. Copy the generated URL and open it in your browser

## Usage

### Deploy Commands

Before running the bot for the first time, deploy the slash commands:

```bash
npm run deploy
```

**Note:** Guild commands update instantly. Global commands may take up to an hour to propagate.

### Start the Bot

```bash
npm start
```

For development with auto-restart:
```bash
npm run dev
```

## Project Structure

```
stribog/
├── src/
│   ├── commands/
│   │   ├── moderation/
│   │   │   ├── ban.js
│   │   │   ├── kick.js
│   │   │   ├── timeout.js
│   │   │   ├── warn.js
│   │   │   └── clear.js
│   │   ├── info/
│   │   │   ├── userinfo.js
│   │   │   ├── serverinfo.js
│   │   │   ├── botinfo.js
│   │   │   └── avatar.js
│   │   ├── fun/
│   │   │   ├── 8ball.js
│   │   │   ├── coinflip.js
│   │   │   ├── dice.js
│   │   │   └── poll.js
│   │   └── utility/
│   │       ├── ping.js
│   │       ├── help.js
│   │       ├── invite.js
│   │       └── embed.js
│   ├── events/
│   │   ├── ready.js
│   │   ├── interactionCreate.js
│   │   └── guildMemberAdd.js
│   ├── menus/
│   │   └── help.js
│   ├── config/
│   │   └── config.js
│   ├── index.js
│   └── deploy-commands.js
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Adding New Commands

1. Create a new file in the appropriate category folder under `src/commands/`
2. Use this template:

```javascript
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { colors } = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('commandname')
        .setDescription('Command description'),
    
    cooldown: 3,
    
    async execute(interaction, client) {
        // Command logic here
    }
};
```

3. Run `npm run deploy` to register the new command

## Configuration

Edit `src/config/config.js` to customize:

- **colors** - Embed colors for different message types
- **emojis** - Default emojis used in responses
- **cooldown** - Default command cooldown in seconds

## Permissions

The bot requires the following permissions for full functionality:

- Administrator (recommended)

Or individually:
- Send Messages
- Embed Links
- Read Message History
- Add Reactions
- Manage Messages
- Kick Members
- Ban Members
- Moderate Members

## Support

For issues and feature requests, please open an issue on GitHub.

## Contact

- GitHub: [VelesLobo](https://github.com/VelesLobo)
- Email: batuhanaramaz@gmail.com
- Instagram: [@4veles](https://instagram.com/4veles)

## License

This project is licensed under the MIT License.
