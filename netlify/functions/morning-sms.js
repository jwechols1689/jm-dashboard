// Morning briefing SMS -- sent via Twilio each weekday at 6:30 AM Central
// Sends a summary text + link to the dashboard
// Schedule is configured in netlify.toml

const schedule = require('@netlify/functions').schedule;

const handler = async (event) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  const toNumber = process.env.MY_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber || !toNumber) {
    console.error('Twilio credentials not fully configured');
    return { statusCode: 500, body: 'Missing Twilio credentials' };
  }

  try {
    // Fetch today's data to build the summary
    const baseUrl = process.env.URL || 'https://jmdailydashboard.netlify.app';

    // Get weather
    let weatherLine = '';
    try {
      const wRes = await fetch(`${baseUrl}/.netlify/functions/weather`);
      const wData = await wRes.json();
      if (!wData.error) {
        weatherLine = `${Math.round(wData.temp)}° ${wData.description}. ${wData.dressRec}.`;
      }
    } catch(e) { weatherLine = 'Weather unavailable.'; }

    // Get reading
    const today = getTodayKey();
    const READING = getReadingForToday(today);
    const readingLine = READING ? `Reading: ${READING}` : 'Weekend rest day.';

    // Build the SMS
    const now = new Date();
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const dayName = days[now.getDay()];

    const message = [
      `Good morning, John-Mark. ${dayName}, ${now.toLocaleDateString('en-US',{month:'short',day:'numeric'})}.`,
      '',
      weatherLine,
      readingLine,
      '',
      `Your morning briefing: ${baseUrl}`,
      '',
      'Coram Deo.'
    ].join('\n');

    // Send via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const body = new URLSearchParams({ To: toNumber, From: fromNumber, Body: message });

    const res = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });

    const result = await res.json();
    console.log('SMS sent:', result.sid);

    return { statusCode: 200, body: JSON.stringify({ success: true, sid: result.sid }) };

  } catch (err) {
    console.error('Morning SMS error:', err);
    return { statusCode: 500, body: err.message };
  }
};

function getTodayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${dd}`;
}

function getReadingForToday(key) {
  const PLAN = {
    "2026-04-09":"Ex 13; Ps 71","2026-04-10":"Ex 14-15; John 6; Ps 72",
    "2026-04-13":"Ex 16; Ps 73","2026-04-14":"Ex 17-18; Mat 15; Ps 74",
    "2026-04-15":"Ex 19; Ps 75","2026-04-16":"Ex 20-21; Mk 7; Ps 76",
    "2026-04-17":"Ex 22; Ps 77","2026-04-20":"Ex 23-24; Mat 16; Ps 78",
    "2026-04-21":"Ex 25; Ps 79","2026-04-22":"Ex 26-27; Mk 8; Ps 80",
    "2026-04-23":"Ex 28; Ps 81","2026-04-24":"Ex 29-30; Mat 17; Ps 82",
    "2026-04-27":"Ex 31; Ps 83","2026-04-28":"Ex 32-33; Mk 9; Ps 84",
    "2026-04-29":"Ex 34; Ps 85","2026-04-30":"Ex 35-36; Mat 18; Ps 86"
  };
  return PLAN[key] || null;
}

// Schedule: weekdays at 6:30 AM Central (11:30 UTC -- UTC-5 in winter, UTC-6 in summer)
// Use 12:30 UTC to account for CDT (UTC-6)
exports.handler = schedule('30 12 * * 1-5', handler);
