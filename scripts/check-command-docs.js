#!/usr/bin/env node
const { readFileSync } = require('fs');
const { join } = require('path');
const { loadCommands } = require('./command-reference');

const README_PATH = process.env.README_PATH || join(__dirname, '..', 'README.md');
const COMMAND_ROW = /^\|\s*`(\/[^`]+)`\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*`([^`]+)`\s*\|$/;

function normalizePermission(value) {
    return value.replace(/\*/g, '').replace(/\s+/g, '').toLowerCase();
}

function commandPermission(data) {
    if (!data.default_member_permissions) return 'everyone';
    const { PermissionFlagsBits } = require('discord.js');
    for (const [name, bit] of Object.entries(PermissionFlagsBits)) {
        if (String(bit) === String(data.default_member_permissions)) return name.toLowerCase();
    }
    return String(data.default_member_permissions);
}

function leafPaths(data) {
    const subcommands = (data.options || []).filter(option => option.type === 1);
    if (subcommands.length === 0) return [`/${data.name}`];
    return subcommands.map(subcommand => `/${data.name} ${subcommand.name}`);
}

function parseOptions(text, schema) {
    const names = new Set(schema.map(option => option.name));
    const values = new Map();
    let current = null;

    for (const token of text.trim().split(/\s+/).filter(Boolean)) {
        const match = token.match(/^([a-z0-9_]+):(.*)$/i);
        if (match && names.has(match[1])) {
            current = match[1];
            values.set(current, match[2]);
        } else if (current) {
            values.set(current, `${values.get(current)} ${token}`);
        } else {
            throw new Error(`unexpected token "${token}"`);
        }
    }

    return values;
}

function validateExample(example, commands) {
    const firstSpace = example.indexOf(' ');
    const commandName = (firstSpace === -1 ? example : example.slice(0, firstSpace)).slice(1);
    const command = commands.get(commandName);
    if (!command) throw new Error(`unknown command ${example.split(' ')[0]}`);

    const data = command.data.toJSON();
    const subcommands = (data.options || []).filter(option => option.type === 1);
    let schema = data.options || [];
    let consumedPrefix = `/${data.name}`;

    if (subcommands.length > 0) {
        const parts = example.split(/\s+/);
        const subcommand = subcommands.find(option => option.name === parts[1]);
        if (!subcommand) throw new Error(`missing or unknown subcommand in "${example}"`);
        schema = subcommand.options || [];
        consumedPrefix = `/${data.name} ${subcommand.name}`;
    }

    const rest = example.slice(consumedPrefix.length).trim();
    const values = parseOptions(rest, schema);

    for (const option of schema) {
        const value = values.get(option.name);
        if (option.required && !value) {
            throw new Error(`missing required option "${option.name}" in "${example}"`);
        }
        if (!value) continue;

        if ((option.type === 4 || option.type === 10) && !/^-?\d+$/.test(value)) {
            throw new Error(`option "${option.name}" must be numeric in "${example}"`);
        }
        if (option.type === 5 && !/^(true|false)$/i.test(value)) {
            throw new Error(`option "${option.name}" must be true or false in "${example}"`);
        }
        if (option.choices?.length && !option.choices.some(choice => String(choice.value) === value)) {
            throw new Error(`option "${option.name}" has unsupported value "${value}" in "${example}"`);
        }
        if (option.type === 4 && option.min_value !== undefined && Number(value) < option.min_value) {
            throw new Error(`option "${option.name}" is below its minimum in "${example}"`);
        }
        if (option.type === 4 && option.max_value !== undefined && Number(value) > option.max_value) {
            throw new Error(`option "${option.name}" is above its maximum in "${example}"`);
        }
    }
}

function main() {
    const commands = new Map(loadCommands().map(entry => [entry.command.data.name, entry.command]));
    const expectedPaths = new Set();
    const seenPaths = new Set();
    const errors = [];
    let rows = 0;

    for (const command of commands.values()) {
        for (const path of leafPaths(command.data.toJSON())) expectedPaths.add(path);
    }

    for (const line of readFileSync(README_PATH, 'utf8').split('\n')) {
        const match = line.match(COMMAND_ROW);
        if (!match) continue;
        rows += 1;

        const [, documentedPath, permission, description, example] = match;
        const commandName = documentedPath.split(' ')[0].slice(1);
        const command = commands.get(commandName);

        try {
            if (!command) throw new Error(`unknown command ${documentedPath}`);
            if (!description.trim()) throw new Error('empty description');
            const expectedPermission = commandPermission(command.data.toJSON());
            if (normalizePermission(permission) !== expectedPermission) {
                throw new Error(`permission "${permission.trim()}" should be "${expectedPermission}"`);
            }
            if (seenPaths.has(documentedPath)) throw new Error('duplicate command row');
            seenPaths.add(documentedPath);
            validateExample(example, commands);
        } catch (error) {
            errors.push(`${documentedPath}: ${error.message}`);
        }
    }

    for (const path of expectedPaths) {
        if (!seenPaths.has(path)) errors.push(`${path}: missing from README`);
    }
    for (const path of seenPaths) {
        if (!expectedPaths.has(path)) errors.push(`${path}: no matching command payload`);
    }

    if (errors.length > 0) {
        console.error(`Command docs check failed (${errors.length}):`);
        for (const error of errors) console.error(`- ${error}`);
        process.exitCode = 1;
        return;
    }

    console.log(`Command docs check passed: ${commands.size} commands, ${rows} documented rows.`);
}

main();
