// Spurgeon Morning and Evening -- fetches from CCEL today URL
// Falls back to a direct date URL if needed

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  try {
    const res = await fetch('https://www.ccel.org/ccel/spurgeon/morneve.today.html', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TFE-Dashboard/1.0)' }
    });
    const html = await res.text();

    // Parse the relevant content from CCEL's HTML
    const parsed = parseSpurgeon(html);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(parsed)
    };
  } catch (err) {
    console.error('Spurgeon error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: err.message,
        title: 'Morning and Evening',
        text: 'Visit ccel.org for today\'s devotional.',
        keyVerse: ''
      })
    };
  }
};

function parseSpurgeon(html) {
  // Extract the morning reading section
  // CCEL structure: h2 with "Morning, [Date]", then key verse in blockquote/italic, then body text

  let title = 'Morning Devotional';
  let keyVerse = '';
  let text = '';

  // Extract h2 title (e.g. "Morning, April 9")
  const h2Match = html.match(/<h2[^>]*>\s*Morning,[^<]+<\/h2>/i);
  if (h2Match) {
    title = h2Match[0].replace(/<[^>]+>/g, '').trim();
  }

  // Extract key verse -- usually in an em or italic tag near the top of the reading
  const verseMatch = html.match(/<em[^>]*>[""]([^"]+)[""]<\/em>/i) ||
                     html.match(/<i[^>]*>[""]([^"]+)[""]<\/i>/i) ||
                     html.match(/[""]([^"""]{5,80})[""][\s\S]{0,30}<\/em>/i);
  if (verseMatch) {
    keyVerse = '"' + verseMatch[1].trim() + '"';
  }

  // Extract body paragraphs -- everything between the verse and the nav links
  // Remove all HTML tags and get clean text
  const bodySection = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '');

  // Find content between Morning heading and the nav links
  const contentMatch = bodySection.match(/Morning,\s+\w+\s+\d+[\s\S]*?(?=Go To Evening|Next|Prev|login|register)/i);
  if (contentMatch) {
    text = contentMatch[0]
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/Morning,\s+\w+\s+\d+/i, '')
      .replace(/[""].*?[""]/, '') // remove key verse from body
      .trim();

    // Limit to reasonable length for dashboard display
    if (text.length > 1200) {
      text = text.substring(0, 1200).replace(/\s\S+$/, '') + '...';
    }
  }

  if (!text) {
    text = 'Visit CCEL for today\'s full Morning and Evening reading by C.H. Spurgeon.';
  }

  return { title, keyVerse, text };
}
