exports.handler = async (event, context) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  try {
    const res = await fetch('https://www.ccel.org/ccel/spurgeon/morneve.today.html', { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const html = await res.text();
    let clean = html.replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<style[\s\S]*?<\/style>/gi,'').replace(/<nav[\s\S]*?<\/nav>/gi,'').replace(/<header[\s\S]*?<\/header>/gi,'').replace(/<footer[\s\S]*?<\/footer>/gi,'');
    let title = 'Morning Devotional';
    const tm = clean.match(/Morning,\s+\w+\s+\d+/i);
    if (tm) title = tm[0].trim();
    let keyVerse = '';
    const vm = clean.match(/[\u201c"]([^\u201d"]{10,120})[\u201d"]/);
    if (vm && vm[1] && !vm[1].includes('{')) keyVerse = '\u201c' + vm[1].trim() + '\u201d';
    let text = clean.replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#\d+;/g,'').replace(/\s+/g,' ').trim();
    const si = text.indexOf(title);
    if (si !== -1) text = text.substring(si + title.length).trim();
    text = text.replace(/^[\s\u00ab\u00bb<>|\-\u2013\u2014]+/,'').trim();
    text = text.replace(/Go To (Evening|Morning).*$/i,'').trim();
    if (text.length > 1400) text = text.substring(0,1400).replace(/\s\S+$/,'') + '...';
    if (!text || text.length < 20) text = 'Visit ccel.org for today\'s Morning and Evening reading.';
    return { statusCode: 200, headers, body: JSON.stringify({ title, keyVerse, text }) };
  } catch (err) {
    return { statusCode: 200, headers, body: JSON.stringify({ title: 'Morning and Evening', keyVerse: '', text: 'Visit ccel.org for today\'s devotional.' }) };
  }
};
