#!/usr/bin/env node
const { readdirSync, statSync } = require('fs');
const { join, relative } = require('path');
const { PermissionFlagsBits } = require('discord.js');

const COMMANDS_DIR = join(__dirname, '..', 'src', 'commands');
const OPTION_TYPES = {
    1: 'subcommand',
    2: 'subcommand-group',
    3: 'string',
    4: 'integer',
    5: 'boolean',
    6: 'user',
    7: 'channel',
    8: 'role',
    9: 'mentionable',
    10: 'number',
    11: 'attachment'
};

function permissionName(value) {
    if (!value) return 'Everyone';
    for (const [name, bit] of Object.entries(PermissionFlagsBits)) {
        if (String(bit) === String(value)) return name;
    }
    return String(value);
}

function optionTypeName(option) {
    if (option.type === 3 && option.choices?.length) {
        return `choice(${option.choices.map(choice => choice.value).join('|')})`;
    }
    return OPTION_TYPES[option.type] || String(option.type);
}

function formatCommand(entry) {
    const data = entry.command.data.toJSON();
    const lines = [
        `# ${relative(COMMANDS_DIR, entry.file)}`,
        `/${data.name} [${permissionName(data.default_member_permissions)}] cooldown=${entry.command.cooldown ?? '-'}`
    ];

    for (const option of data.options || []) {
        const commandPath = `/${data.name}`;
        if (option.type === 1 || option.type === 2) {
            lines.push(`  ${commandPath} ${option.name} - ${option.description}`);
            for (const child of option.options || []) {
                lines.push(`    ${child.name}:${optionTypeName(child)}${child.required ? '*' : ''}`);
            }
        } else {
            lines.push(`  ${option.name}:${optionTypeName(option)}${option.required ? '*' : ''}`);
        }
    }

    return lines.join('\n');
}

function loadCommands(commandsDir = COMMANDS_DIR) {
    const commands = [];

    for (const folder of readdirSync(commandsDir).sort()) {
        const folderPath = join(commandsDir, folder);
        if (!statSync(folderPath).isDirectory()) continue;

        for (const file of readdirSync(folderPath).filter(name => name.endsWith('.js')).sort()) {
            const filePath = join(folderPath, file);
            const command = require(filePath);
            if (!command.data || !command.execute) continue;
            commands.push({ folder, file: filePath, command });
        }
    }

    return commands;
}

function main() {
    const commands = loadCommands();
    const lines = [
        '# Slash-command reference audit',
        '# Permissions are Discord defaults; * marks a required option.',
        ''
    ];

    for (const entry of commands) {
        lines.push(formatCommand(entry), '');
    }

    lines.push(`# ${commands.length} commands loaded.`);
    console.log(lines.join('\n'));
}

if (require.main === module) main();

module.exports = { formatCommand, loadCommands };
