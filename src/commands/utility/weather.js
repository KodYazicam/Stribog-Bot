const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { colors } = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('weather')
        .setDescription('Get weather information for a city')
        .addStringOption(option =>
            option.setName('city')
                .setDescription('City name')
                .setRequired(true)),

    cooldown: 10,

    async execute(interaction) {
        const city = interaction.options.getString('city');

        await interaction.deferReply();

        try {
            const geoResponse = await fetch(
                `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
            );
            const geoData = await geoResponse.json();

            if (!geoData.results || geoData.results.length === 0) {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(colors.danger)
                            .setDescription(`City **${city}** not found.`)
                    ]
                });
            }

            const location = geoData.results[0];
            const { latitude, longitude, name, country, admin1 } = location;

            const weatherResponse = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`
            );
            const weatherData = await weatherResponse.json();

            const current = weatherData.current;
            const daily = weatherData.daily;

            const weatherEmoji = getWeatherEmoji(current.weather_code);
            const weatherDescription = getWeatherDescription(current.weather_code);
            const windDirection = getWindDirection(current.wind_direction_10m);

            const embed = new EmbedBuilder()
                .setColor(colors.info)
                .setTitle(`${weatherEmoji} Weather in ${name}${admin1 ? `, ${admin1}` : ''}, ${country}`)
                .addFields(
                    { name: '🌡️ Temperature', value: `${current.temperature_2m}°C`, inline: true },
                    { name: '🤔 Feels Like', value: `${current.apparent_temperature}°C`, inline: true },
                    { name: '💧 Humidity', value: `${current.relative_humidity_2m}%`, inline: true },
                    { name: '🌤️ Condition', value: weatherDescription, inline: true },
                    { name: '💨 Wind', value: `${current.wind_speed_10m} km/h ${windDirection}`, inline: true },
                    { name: '🌧️ Precipitation', value: `${current.precipitation} mm`, inline: true },
                    { name: '📊 Today', value: `High: ${daily.temperature_2m_max[0]}°C\nLow: ${daily.temperature_2m_min[0]}°C\nRain: ${daily.precipitation_probability_max[0]}%`, inline: true },
                    { name: '📅 Tomorrow', value: `High: ${daily.temperature_2m_max[1]}°C\nLow: ${daily.temperature_2m_min[1]}°C\nRain: ${daily.precipitation_probability_max[1]}%`, inline: true }
                )
                .setFooter({ text: 'Data from Open-Meteo' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.danger)
                        .setDescription('Failed to fetch weather data. Please try again later.')
                ]
            });
        }
    }
};

function getWeatherEmoji(code) {
    const codes = {
        0: '☀️',
        1: '🌤️', 2: '⛅', 3: '☁️',
        45: '🌫️', 48: '🌫️',
        51: '🌧️', 53: '🌧️', 55: '🌧️',
        56: '🌨️', 57: '🌨️',
        61: '🌧️', 63: '🌧️', 65: '🌧️',
        66: '🌨️', 67: '🌨️',
        71: '🌨️', 73: '🌨️', 75: '🌨️',
        77: '🌨️',
        80: '🌧️', 81: '🌧️', 82: '🌧️',
        85: '🌨️', 86: '🌨️',
        95: '⛈️',
        96: '⛈️', 99: '⛈️'
    };
    return codes[code] || '🌡️';
}

function getWeatherDescription(code) {
    const descriptions = {
        0: 'Clear sky',
        1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
        45: 'Fog', 48: 'Depositing rime fog',
        51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
        56: 'Light freezing drizzle', 57: 'Dense freezing drizzle',
        61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
        66: 'Light freezing rain', 67: 'Heavy freezing rain',
        71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow',
        77: 'Snow grains',
        80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers',
        85: 'Slight snow showers', 86: 'Heavy snow showers',
        95: 'Thunderstorm',
        96: 'Thunderstorm with slight hail', 99: 'Thunderstorm with heavy hail'
    };
    return descriptions[code] || 'Unknown';
}

function getWindDirection(degrees) {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
}
