// Google Calendar function -- fetches today's events
// Dress recommendation logic based on event types per employee handbook context:
// Foundation/donor meetings = dressed up
// Outreach days = casual/practical
// Staff meetings = business casual
// Default = check context

const { google } = require('googleapis');

// Dress recommendation keywords -- based on TFE context
const DRESSED_UP_KEYWORDS = [
  'foundation', 'donor', 'funder', 'grant', 'board', 'presentation',
  'gala', 'fundraiser', 'lunch with', 'dinner with', 'meeting with'
];
const OUTREACH_KEYWORDS = [
  'outreach', 'glean up', 'glean-up', 'street', 'breaking bread',
  'neighborhood', 'cleanup', 'clean up', 'site visit', 'village tour'
];
const CASUAL_KEYWORDS = ['office', 'admin', 'internal', 'planning', 'staff meeting', 'team'];

function getDressNote(eventTitle, description) {
  const text = (eventTitle + ' ' + (description || '')).toLowerCase();

  if (DRESSED_UP_KEYWORDS.some(k => text.includes(k))) {
    return 'Business professional';
  }
  if (OUTREACH_KEYWORDS.some(k => text.includes(k))) {
    return 'Casual / work clothes';
  }
  if (CASUAL_KEYWORDS.some(k => text.includes(k))) {
    return 'Business casual';
  }
  return null;
}

function formatTime(dateTimeStr) {
  if (!dateTimeStr) return 'All day';
  const d = new Date(dateTimeStr);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  try {
    let auth;

    // Support both service account JSON and OAuth token
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/calendar.readonly']
      });
    } else {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ events: [], error: 'Google Calendar not configured yet.' })
      };
    }

    const calendar = google.calendar({ version: 'v3', auth });

    // Get today's events
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startOfDay,
      timeMax: endOfDay,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 10
    });

    const events = (res.data.items || []).map(ev => ({
      title: ev.summary || 'Untitled event',
      time: formatTime(ev.start.dateTime || ev.start.date),
      location: ev.location || null,
      dressNote: getDressNote(ev.summary || '', ev.description || '')
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ events })
    };

  } catch (err) {
    console.error('Calendar error:', err);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ events: [], error: err.message })
    };
  }
};
