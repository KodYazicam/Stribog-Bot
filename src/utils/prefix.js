const { ApplicationCommandOptionType, EmbedBuilder } = require('discord.js');
const { colors, prefix: defaultPrefix } = require('../config/config');

// Prefix execution is enabled per command category. Add a category here after
// its commands have been checked against the prefix option parser.
const PREFIX_CATEGORIES = new Set(['economy']);

function errorEmbed(description) {
    return new EmbedBuilder()
        .setColor(colors.danger)
        .setDescription(description);
}

function tokenize(input) {
    const tokens = [];
    let current = '';
    let quote = null;
    let hasContent = false;

    for (let index = 0; index < input.length; index += 1) {
        const character = input[index];

        if (quote) {
            if (character === quote) {
                quote = null;
            } else if (character === '\\' && index + 1 < input.length) {
                current += input[index + 1];
                index += 1;
            } else {
                current += character;
            }
            continue;
        }

        if (character === '"' || character === "'") {
            quote = character;
            hasContent = true;
        } else if (/\s/.test(character)) {
            if (hasContent || current) {
                tokens.push(current);
                current = '';
                hasContent = false;
            }
        } else {
            current += character;
            hasContent = true;
        }
    }

    if (quote) throw new Error('Unclosed quote in command arguments.');
    if (hasContent || current) tokens.push(current);
    return tokens;
}

function optionType(option) {
    if (option.type !== undefined) return option.type;
    if (typeof option.toJSON === 'function') return option.toJSON().type;
    return option.options ? ApplicationCommandOptionType.Subcommand : undefined;
}

function optionDefinitions(command, subcommandName) {
    const options = command.data.options ?? [];
    if (!subcommandName) return options;
    const subcommand = options.find(option =>
        optionType(option) === ApplicationCommandOptionType.Subcommand && option.name === subcommandName
    );
    return subcommand?.options ?? [];
}

function buildUsage(prefix, command, subcommandName) {
    const parts = [`${prefix}${command.data.name}`];
    if (subcommandName) parts.push(subcommandName);
    for (const option of optionDefinitions(command, subcommandName)) {
        parts.push(option.required ? `<${option.name}>` : `[${option.name}]`);
    }
    return parts.join(' ');
}

function parseMentionId(value, prefix) {
    const match = value.match(new RegExp(`^<${prefix}(!?)(\\d+)>$`));
    if (match) return match[2];
    return /^\d+$/.test(value) ? value : null;
}

async function parseOption(option, raw, message) {
    switch (optionType(option)) {
        case ApplicationCommandOptionType.User: {
            const id = parseMentionId(raw, '@');
            if (!id) return { error: `\`${option.name}\` must be a user mention or id.` };
            const user = message.mentions?.users?.get(id)
                || await message.client.users.fetch(id).catch(() => null);
            if (!user) return { error: `Could not find a user with id \`${id}\`.` };
            return { value: user };
        }
        case ApplicationCommandOptionType.Role: {
            const id = parseMentionId(raw, '@&');
            if (!id) return { error: `\`${option.name}\` must be a role mention or id.` };
            const role = message.guild.roles.cache.get(id)
                || await message.guild.roles.fetch(id).catch(() => null);
            if (!role) return { error: `Could not find a role with id \`${id}\`.` };
            return { value: role };
        }
        case ApplicationCommandOptionType.Channel: {
            const id = parseMentionId(raw, '#');
            if (!id) return { error: `\`${option.name}\` must be a channel mention or id.` };
            const channel = message.guild.channels.cache.get(id)
                || await message.guild.channels.fetch(id).catch(() => null);
            if (!channel) return { error: `Could not find a channel with id \`${id}\`.` };
            return { value: channel };
        }
        case ApplicationCommandOptionType.Integer: {
            if (!/^-?\d+$/.test(raw)) return { error: `\`${option.name}\` must be an integer.` };
            const value = Number(raw);
            if (!Number.isSafeInteger(value)) return { error: `\`${option.name}\` is out of range.` };
            if (option.min_value !== undefined && value < option.min_value) {
                return { error: `\`${option.name}\` must be at least ${option.min_value}.` };
            }
            if (option.max_value !== undefined && value > option.max_value) {
                return { error: `\`${option.name}\` must be at most ${option.max_value}.` };
            }
            return { value };
        }
        case ApplicationCommandOptionType.Number: {
            const value = Number(raw);
            if (!Number.isFinite(value)) return { error: `\`${option.name}\` must be a number.` };
            if (option.min_value !== undefined && value < option.min_value) {
                return { error: `\`${option.name}\` must be at least ${option.min_value}.` };
            }
            if (option.max_value !== undefined && value > option.max_value) {
                return { error: `\`${option.name}\` must be at most ${option.max_value}.` };
            }
            return { value };
        }
        case ApplicationCommandOptionType.Boolean: {
            const value = raw.toLowerCase();
            if (value === 'true') return { value: true };
            if (value === 'false') return { value: false };
            return { error: `\`${option.name}\` must be true or false.` };
        }
        case ApplicationCommandOptionType.String: {
            if (option.choices?.length) {
                const choice = option.choices.find(item => String(item.value) === raw);
                if (!choice) {
                    const names = option.choices.map(item => `\`${item.value}\``).join(', ');
                    return { error: `\`${option.name}\` must be one of: ${names}.` };
                }
                return { value: choice.value };
            }
            return { value: raw };
        }
        default:
            return { error: `Option type for \`${option.name}\` is not supported by prefix commands.` };
    }
}

async function parsePrefixCommand(content, message, client, prefix = defaultPrefix) {
    let tokens;
    try {
        tokens = tokenize(content);
    } catch (error) {
        return { error: error.message };
    }

    if (tokens.length === 0) return null;

    const command = client.commands.get(tokens[0].toLowerCase());
    if (!command || !PREFIX_CATEGORIES.has(command.category)) return null;

    let subcommandName = null;
    let args = tokens.slice(1);
    const topLevelOptions = command.data.options ?? [];

    if (topLevelOptions.some(option => optionType(option) === ApplicationCommandOptionType.Subcommand)) {
        const requested = args.shift()?.toLowerCase();
        const subcommand = topLevelOptions.find(option =>
            optionType(option) === ApplicationCommandOptionType.Subcommand && option.name === requested
        );
        if (!subcommand) {
            return {
                command,
                error: `Unknown subcommand. Usage: ${buildUsage(prefix, command)}`
            };
        }
        subcommandName = subcommand.name;
    }

    const values = {};
    for (const option of optionDefinitions(command, subcommandName)) {
        const raw = args.shift();
        if (raw === undefined) {
            if (option.required) {
                return {
                    command,
                    subcommand: subcommandName,
                    error: `Missing required option \`${option.name}\`. Usage: ${buildUsage(prefix, command, subcommandName)}`
                };
            }
            values[option.name] = null;
            continue;
        }

        const parsed = await parseOption(option, raw, message);
        if (parsed.error) {
            return {
                command,
                subcommand: subcommandName,
                error: `${parsed.error} Usage: ${buildUsage(prefix, command, subcommandName)}`
            };
        }
        values[option.name] = parsed.value;
    }

    if (args.length > 0) {
        return {
            command,
            subcommand: subcommandName,
            error: `Too many arguments. Usage: ${buildUsage(prefix, command, subcommandName)}`
        };
    }

    return { command, subcommand: subcommandName, values };
}

function optionGet(parsed, name) {
    return parsed.values[name] ?? null;
}

function createPrefixInteraction(message, parsed, prefix = defaultPrefix) {
    const replies = [];
    let lastReply = null;

    const cleanPayload = payload => {
        if (typeof payload === 'string') return { content: payload };
        const copy = { ...payload };
        delete copy.ephemeral;
        return copy;
    };

    return {
        commandName: parsed.command.data.name,
        commandLabel: `${prefix}${parsed.command.data.name}`,
        guild: message.guild,
        channel: message.channel,
        member: message.member,
        user: message.author,
        client: message.client,
        replied: false,
        deferred: false,
        replies,
        options: {
            getSubcommand: () => parsed.subcommand,
            getSubcommandGroup: () => null,
            getUser: name => {
                const value = optionGet(parsed, name);
                return value && typeof value === 'object' ? value : null;
            },
            getMember: name => optionGet(parsed, name),
            getRole: name => optionGet(parsed, name),
            getChannel: name => optionGet(parsed, name),
            getString: name => optionGet(parsed, name),
            getInteger: name => optionGet(parsed, name),
            getNumber: name => optionGet(parsed, name),
            getBoolean: name => optionGet(parsed, name),
            getAttachment: name => optionGet(parsed, name)
        },
        isChatInputCommand: () => true,
        isAutocomplete: () => false,
        isButton: () => false,
        isStringSelectMenu: () => false,
        isModalSubmit: () => false,
        async reply(payload) {
            if (this.replied) return this.followUp(payload);
            this.replied = true;
            const cleaned = cleanPayload(payload);
            replies.push(cleaned);
            lastReply = await message.reply(cleaned);
            return lastReply;
        },
        async followUp(payload) {
            const cleaned = cleanPayload(payload);
            replies.push(cleaned);
            lastReply = await message.reply(cleaned);
            return lastReply;
        },
        async deferReply() {
            this.deferred = true;
            return null;
        },
        async editReply(payload) {
            const cleaned = cleanPayload(payload);
            replies.push(cleaned);
            this.replied = true;
            if (lastReply?.edit) {
                lastReply = await lastReply.edit(cleaned);
            } else {
                lastReply = await message.reply(cleaned);
            }
            return lastReply;
        }
    };
}

async function handlePrefixMessage(message, client, { prefix = defaultPrefix } = {}) {
    if (!prefix || message.author?.bot || !message.guild || !message.member) return false;
    if (!message.content?.startsWith(prefix)) return false;

    const content = message.content.slice(prefix.length).trim();
    if (!content) return false;

    const parsed = await parsePrefixCommand(content, message, client, prefix);
    if (!parsed) return false;

    if (parsed.error) {
        await message.reply({ embeds: [errorEmbed(parsed.error)] });
        return true;
    }

    const interaction = createPrefixInteraction(message, parsed, prefix);
    const { execute } = require('../events/interactionCreate');
    await execute(interaction, client);
    return true;
}

module.exports = {
    PREFIX_CATEGORIES,
    handlePrefixMessage,
    parsePrefixCommand,
    createPrefixInteraction,
    buildUsage
};
