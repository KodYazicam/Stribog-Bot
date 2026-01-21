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
            const sanitized = expression.replace(/[^0-9+\-*/().%^\s]/g, '');
            
            if (sanitized !== expression.replace(/\s/g, '')) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.danger)
                            .setDescription('Invalid characters in expression. Only numbers and operators (+, -, *, /, %, ^, (, )) are allowed.')
                    ],
                    ephemeral: true
                });
            }

            const processed = sanitized.replace(/\^/g, '**');
            
            const result = safeEval(processed);

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
        const tokens = expr.match(/(\d+\.?\d*|\+|\-|\*|\/|\%|\*\*|\(|\))/g);
        if (!tokens) return null;

        let result = 0;
        let currentOp = '+';
        let stack = [];
        let num = 0;
        let i = 0;

        while (i < tokens.length) {
            const token = tokens[i];

            if (!isNaN(parseFloat(token))) {
                num = parseFloat(token);
            } else if (token === '(') {
                let depth = 1;
                let j = i + 1;
                let subExpr = '';
                
                while (j < tokens.length && depth > 0) {
                    if (tokens[j] === '(') depth++;
                    if (tokens[j] === ')') depth--;
                    if (depth > 0) subExpr += tokens[j];
                    j++;
                }
                
                num = safeEval(subExpr);
                i = j - 1;
            } else if (['+', '-', '*', '/', '%', '**'].includes(token)) {
                if (currentOp === '+') stack.push(num);
                else if (currentOp === '-') stack.push(-num);
                else if (currentOp === '*') stack.push(stack.pop() * num);
                else if (currentOp === '/') {
                    if (num === 0) return null;
                    stack.push(stack.pop() / num);
                }
                else if (currentOp === '%') stack.push(stack.pop() % num);
                else if (currentOp === '**') stack.push(Math.pow(stack.pop(), num));
                
                currentOp = token;
                num = 0;
            }
            i++;
        }

        if (currentOp === '+') stack.push(num);
        else if (currentOp === '-') stack.push(-num);
        else if (currentOp === '*') stack.push(stack.pop() * num);
        else if (currentOp === '/') {
            if (num === 0) return null;
            stack.push(stack.pop() / num);
        }
        else if (currentOp === '%') stack.push(stack.pop() % num);
        else if (currentOp === '**') stack.push(Math.pow(stack.pop(), num));

        result = stack.reduce((a, b) => a + b, 0);
        return result;
    } catch {
        return null;
    }
}
