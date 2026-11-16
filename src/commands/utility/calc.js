const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { colors } = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('calc')
        .setDescription('Calculate a math expression')
        .addStringOption(option =>
            option.setName('expression')
                .setDescription('Math expression to calculate')
                .setRequired(true)),

    cooldown: 3,

    async execute(interaction) {
        const expression = interaction.options.getString('expression');

        try {
            const compact = expression.replace(/\s/g, '');

            if (!/^[0-9+\-*/().%^]+$/.test(compact)) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.danger)
                            .setDescription('Invalid characters in expression. Only numbers and operators (+, -, *, /, %, ^, (, )) are allowed.')
                    ],
                    ephemeral: true
                });
            }

            const result = safeEval(expression);

            if (result === null || !isFinite(result)) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.danger)
                            .setDescription('Invalid expression or result is not a finite number.')
                    ],
                    ephemeral: true
                });
            }

            const formattedResult = Number.isInteger(result) 
                ? result.toLocaleString() 
                : parseFloat(result.toFixed(10)).toLocaleString();

            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.info)
                        .setTitle('🧮 Calculator')
                        .addFields(
                            { name: 'Expression', value: `\`${expression}\``, inline: false },
                            { name: 'Result', value: `\`${formattedResult}\``, inline: false }
                        )
                ]
            });

        } catch (error) {
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.danger)
                        .setDescription('Failed to evaluate expression. Please check your input.')
                ],
                ephemeral: true
            });
        }
    }
};

function safeEval(expr) {
    try {
        const tokens = [];
        let i = 0;

        while (i < expr.length) {
            const char = expr[i];

            if (/\s/.test(char)) {
                i++;
                continue;
            }

            if (/[0-9.]/.test(char)) {
                const number = expr.slice(i).match(/^(?:\d+(?:\.\d*)?|\.\d+)/);
                if (!number) return null;
                tokens.push(Number(number[0]));
                i += number[0].length;
                continue;
            }

            if (expr.startsWith('**', i)) {
                tokens.push('**');
                i += 2;
                continue;
            }

            if ('+-*/%()^'.includes(char)) {
                tokens.push(char === '^' ? '**' : char);
                i++;
                continue;
            }

            return null;
        }

        if (tokens.length === 0) return null;

        let position = 0;
        const peek = () => tokens[position];
        const take = () => tokens[position++];

        function parseExpression() {
            let value = parseTerm();

            while (peek() === '+' || peek() === '-') {
                const operator = take();
                const right = parseTerm();
                value = operator === '+' ? value + right : value - right;
            }

            return value;
        }

        function parseTerm() {
            let value = parseUnary();

            while (peek() === '*' || peek() === '/' || peek() === '%') {
                const operator = take();
                const right = parseUnary();

                if ((operator === '/' || operator === '%') && right === 0) {
                    throw new Error('division by zero');
                }

                if (operator === '*') value *= right;
                else if (operator === '/') value /= right;
                else value %= right;
            }

            return value;
        }

        function parseUnary() {
            if (peek() === '+') {
                take();
                return parseUnary();
            }

            if (peek() === '-') {
                take();
                return -parseUnary();
            }

            return parsePower();
        }

        function parsePower() {
            const base = parsePrimary();

            if (peek() === '**') {
                take();
                return Math.pow(base, parseUnary());
            }

            return base;
        }

        function parsePrimary() {
            const token = take();

            if (typeof token === 'number') return token;

            if (token === '(') {
                const value = parseExpression();
                if (take() !== ')') throw new Error('unbalanced parentheses');
                return value;
            }

            throw new Error('unexpected token');
        }

        const result = parseExpression();

        if (position !== tokens.length || !Number.isFinite(result)) return null;

        return result;
    } catch {
        return null;
    }
}
