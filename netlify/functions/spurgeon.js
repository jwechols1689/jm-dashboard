exports.handler = async (event, context) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  try {
    const res = await fetch('https://www.ccel.org/ccel/spurgeon/morneve.today.html', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', 'Accept': 'text/html' }
    });
    const html = await res.text();
    return { statusCode: 200, headers, body: JSON.stringify(parseSpurgeon(html)) };
  } catch (err) {
    return { statusCode: 200, headers, body: JSON.stringify({ title: 'Morning and Evening', keyVerse: '', text: 'Visit ccel.org for today\'s Spurgeon devotional.' }) };
  }
};

function stripTags(h) {
  return h.replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<style[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();
}

function parseSpurgeon(html) {
  const mMatch = html.match(/Morning,\s+\w+\s+\d+/i);
  if (!mMatch) return { title:'Morning and Evening', keyVerse:'', text:'Visit ccel.org for today\'s devotional.' };
  const mIdx = html.indexOf(mMatch[0]);
  const eIdx = html.indexOf('Go To Evening', mIdx);
  const section = html.substring(mIdx, eIdx > mIdx ? eIdx : mIdx + 8000);
  const title = mMatch[0].trim();

  let keyVerse = '';
  const vMatch = section.match(/[\u201c\u201d"]([^\u201c\u201d"]{10,100})[\u201c\u201d"]/);
  if (vMatch) keyVerse = '\u201c' + vMatch[1].trim() + '\u201d';

  let text = stripTags(section);
  text = text.replace(/Morning,\s+\w+\s+\d+/i,'').trim();
  text = text.replace(/Go To (Morning|Evening) Reading/gi,'').trim();
  text = text.replace(/Please login or register[\s\S]*/gi,'').trim();
  text = text.replace(/\u00ab\s*Prev|\bNext\s*\u00bb/g,'').trim();
  if (keyVerse) {
    const kv = keyVerse.replace(/[\u201c\u201d]/g,'').substring(0,25);
    const ki = text.indexOf(kv);
    if (ki >= 0 && ki < 300) { const pe = text.indexOf('.',ki); if(pe>0) text = text.substring(pe+1).trim(); }
  }
  if (text.length > 1400) text = text.substring(0,1400).replace(/\s\S+$/,'') + '...';
  if (!text || text.length < 50) return { title, keyVerse, text:'Visit ccel.org for today\'s devotional.' };
  return { title, keyVerse, text };
}
