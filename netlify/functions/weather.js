// Weather function -- AccuWeather Current Conditions + 1-day forecast
// Location key for Midland, TX 79701

const MIDLAND_LOCATION_KEY = '329893'; // AccuWeather location key for Midland, TX

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  const apiKey = process.env.ACCUWEATHER_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'AccuWeather API key not configured' }) };
  }

  try {
    // Current conditions
    const currentRes = await fetch(
      `https://dataservice.accuweather.com/currentconditions/v1/${MIDLAND_LOCATION_KEY}?apikey=${apiKey}&details=true`
    );
    const currentData = await currentRes.json();

    // 1-day forecast for high/low
    const forecastRes = await fetch(
      `https://dataservice.accuweather.com/forecasts/v1/daily/1day/${MIDLAND_LOCATION_KEY}?apikey=${apiKey}&details=false&metric=false`
    );
    const forecastData = await forecastRes.json();

    const current = currentData[0];
    const forecast = forecastData.DailyForecasts[0];

    const temp = current.Temperature.Imperial.Value;
    const wind = current.Wind.Speed.Imperial.Value;
    const description = current.WeatherText;
    const high = forecast.Temperature.Maximum.Value;
    const low = forecast.Temperature.Minimum.Value;

    // Dress recommendation based on temp and wind
    // Note: calendar events will refine this further (foundation meeting vs outreach day)
    // The calendar function adds dressNote to each event
    let dressRec = getDressRecommendation(temp, wind, description);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ temp, wind, description, high, low, dressRec })
    };
  } catch (err) {
    console.error('Weather error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};

function getDressRecommendation(temp, wind, desc) {
  // Base on temperature bands -- calendar events override this with context
  const cold = temp < 45;
  const cool = temp >= 45 && temp < 65;
  const warm = temp >= 65 && temp < 85;
  const hot = temp >= 85;
  const windy = wind > 15;
  const rain = desc && (desc.toLowerCase().includes('rain') || desc.toLowerCase().includes('shower') || desc.toLowerCase().includes('storm'));

  if (cold) return rain ? 'Heavy coat + rain gear' : (windy ? 'Heavy coat + wind layer' : 'Heavy coat + layers');
  if (cool) return rain ? 'Light jacket + rain layer' : (windy ? 'Jacket + wind layer' : 'Light jacket');
  if (warm && rain) return 'Light layer + umbrella';
  if (warm) return 'Light layers -- check calendar';
  if (hot) return rain ? 'Light + umbrella' : 'Light breathable -- Midland summer';
  return 'Check forecast';
}
