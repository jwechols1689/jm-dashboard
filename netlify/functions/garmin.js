// Garmin Connect health data function
// Uses the garminconnect Python library via a child process
// Credentials stored in Netlify env vars

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  const email = process.env.GARMIN_EMAIL;
  const password = process.env.GARMIN_PASSWORD;

  if (!email || !password) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        error: 'Garmin credentials not configured',
        bodyBattery: null,
        sleepHours: null,
        avgStress: null
      })
    };
  }

  try {
    // Write a temp Python script to fetch Garmin data
    const script = `
import json
import sys
from datetime import date
from garminconnect import Garmin

try:
    client = Garmin("${email}", "${password}")
    client.login()
    today = date.today().isoformat()

    stats = client.get_stats(today)
    sleep_data = client.get_sleep_data(today)
    stress_data = client.get_stress_data(today)

    body_battery = None
    try:
        bb = client.get_body_battery(today)
        if bb and len(bb) > 0:
            # Get most recent body battery reading
            body_battery = bb[-1].get('value', None) if isinstance(bb[-1], dict) else None
    except:
        pass

    sleep_hours = None
    try:
        if sleep_data and 'dailySleepDTO' in sleep_data:
            sleep_seconds = sleep_data['dailySleepDTO'].get('sleepTimeSeconds', 0)
            sleep_hours = round(sleep_seconds / 3600, 1)
    except:
        pass

    avg_stress = None
    try:
        if stats:
            avg_stress = stats.get('averageStressLevel', None)
    except:
        pass

    print(json.dumps({
        'bodyBattery': body_battery,
        'sleepHours': sleep_hours,
        'avgStress': avg_stress,
        'restingHR': stats.get('restingHeartRate') if stats else None
    }))
except Exception as e:
    print(json.dumps({'error': str(e)}))
`;

    const tmpScript = '/tmp/garmin_fetch.py';
    fs.writeFileSync(tmpScript, script);

    // Install garminconnect if not available, then run
    try {
      execSync('pip install garminconnect --quiet --break-system-packages 2>/dev/null || true');
    } catch(e) { /* already installed */ }

    const output = execSync(`python3 ${tmpScript}`, { timeout: 20000 }).toString().trim();
    const data = JSON.parse(output);

    if (data.error) {
      return { statusCode: 200, headers, body: JSON.stringify({ error: data.error }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify(data) };

  } catch (err) {
    console.error('Garmin error:', err);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ error: 'Could not fetch Garmin data: ' + err.message })
    };
  }
};
