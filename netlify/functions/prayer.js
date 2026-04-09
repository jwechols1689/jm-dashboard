// Prayer aggregator function
// Sources: Echo Prayer feed + Google Drive tracker spreadsheets
// Anonymizes by first/last initial per TFE privacy guidelines

const { google } = require('googleapis');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  const items = [];
  const errors = [];

  // ── 1. Echo Prayer feed ──────────────────────────────────────
  try {
    const echoRes = await fetch('https://app.echoprayer.com/feed/the-fields-edge', {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json, text/html' }
    });
    const echoText = await echoRes.text();

    // Echo renders as a JS app -- try to find any JSON data in the response
    // Look for prayer request patterns in the HTML
    const prayerMatches = echoText.match(/["']body["']\s*:\s*["']([^"']{10,300})["']/g) || [];
    prayerMatches.slice(0, 4).forEach(match => {
      const text = match.replace(/["']body["']\s*:\s*["']/, '').replace(/["']$/, '');
      if (text && text.length > 10) {
        items.push({ category: 'Community', request: text.trim() });
      }
    });

    // If no JSON data found, note it for fallback
    if (prayerMatches.length === 0) {
      items.push({
        category: 'Echo Prayer',
        request: 'Visit app.echoprayer.com/feed/the-fields-edge for live community prayer requests.'
      });
    }
  } catch (e) {
    errors.push('Echo: ' + e.message);
  }

  // ── 2. Google Drive Tracker spreadsheets ────────────────────
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly', 'https://www.googleapis.com/auth/drive.readonly']
      });
      const sheets = google.sheets({ version: 'v4', auth });
      const drive = google.drive({ version: 'v3', auth });

      // Search for tracker files
      const trackerNames = ['Wage Tracker', 'Interaction Tracker', 'Outreach Tracker'];
      for (const name of trackerNames) {
        try {
          const searchRes = await drive.files.list({
            q: `name contains '${name}' and mimeType = 'application/vnd.google-apps.spreadsheet'`,
            fields: 'files(id, name)',
            pageSize: 1
          });

          if (searchRes.data.files && searchRes.data.files.length > 0) {
            const fileId = searchRes.data.files[0].id;

            // Get the sheet data -- look for case notes column
            const dataRes = await sheets.spreadsheets.values.get({
              spreadsheetId: fileId,
              range: 'A1:Z100' // Get first 100 rows, all columns
            });

            const rows = dataRes.data.values || [];
            if (rows.length > 1) {
              const headers_row = rows[0].map(h => h.toLowerCase());

              // Find case notes column and name column
              const notesCol = headers_row.findIndex(h =>
                h.includes('note') || h.includes('case') || h.includes('prayer') || h.includes('comment')
              );
              const nameCol = headers_row.findIndex(h =>
                h.includes('name') || h.includes('first')
              );
              const dateCol = headers_row.findIndex(h =>
                h.includes('date') || h.includes('time')
              );

              if (notesCol >= 0) {
                // Get last 14 days of entries
                const cutoff = new Date();
                cutoff.setDate(cutoff.getDate() - 14);

                rows.slice(1).forEach(row => {
                  const note = row[notesCol] || '';
                  if (note.length < 10) return;

                  // Check if note contains prayer-related content
                  const prayerKeywords = ['pray', 'prayer', 'struggling', 'need', 'help', 'sick', 'hospital', 'difficult', 'hard', 'ask', 'request', 'concern', 'family', 'housing', 'job', 'health'];
                  const hasPrayer = prayerKeywords.some(k => note.toLowerCase().includes(k));

                  if (hasPrayer) {
                    // Anonymize -- use first/last initial if name found
                    let label = anonymize(row[nameCol] || '');
                    const cleanNote = sanitizePrayerNote(note);

                    const category = name.replace(' Tracker', '');
                    items.push({
                      category,
                      request: label ? `${label}: ${cleanNote}` : cleanNote
                    });
                  }
                });
              }
            }
          }
        } catch (trackerErr) {
          errors.push(`${name}: ${trackerErr.message}`);
        }
      }
    } catch (authErr) {
      errors.push('Google auth: ' + authErr.message);
    }
  }

  // ── 3. Format week label ─────────────────────────────────────
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + 1); // Monday
  const weekLabel = `Week of ${weekStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`;

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      items: items.slice(0, 8),
      weekLabel,
      errors: errors.length ? errors : undefined
    })
  };
};

function anonymize(fullName) {
  if (!fullName || fullName.trim().length === 0) return '';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase() + '.';
  return parts[0][0].toUpperCase() + '.' + parts[parts.length-1][0].toUpperCase() + '.';
}

function sanitizePrayerNote(note) {
  // Remove specific identifying information
  // Remove phone numbers
  let clean = note.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[phone]');
  // Remove email addresses
  clean = clean.replace(/\S+@\S+\.\S+/g, '[email]');
  // Remove addresses (basic pattern)
  clean = clean.replace(/\d+\s+\w+\s+(st|ave|blvd|dr|rd|ln|way|ct)\b\.?/gi, '[address]');
  // Limit length
  if (clean.length > 200) clean = clean.substring(0, 200).replace(/\s\S+$/, '') + '...';
  return clean.trim();
}
