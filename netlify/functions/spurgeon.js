exports.handler = async (event, context) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  try {
    const res = await fetch('https://www.ccel.org/ccel/spurgeon/morneve.today.html', {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html' }
    });
    const html = await res.text();
    return { statusCode: 200, headers, body: JSON.stringify(parseSpurgeon(html)) };
  } catch (err) {
    return { statusCode: 200, headers, body: JSON.stringify({ title: 'Morning and Evening', keyVerse: '', text: 'Visit ccel.org for today\'s Spurgeon devotional.' }) };
  }
};
function stripTags(h) {
  return h.replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<style[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
}
function parseSpurgeon(html) {
  const mMatch = html.match(/Morning,\s+\w+\s+\d+/i);
  if (!mMatch) return { title:'Morning and Evening', keyVerse:'', text:'Visit ccel.org for today\'s devotional.' };
  const mIdx = html.indexOf(mMatch[0]);
  const eIdx = html.indexOf('Go To Evening', mIdx);
  const section = html.substring(mIdx, eIdx > mIdx ? eIdx : mIdx + 8000);
  const title = mMatch[0].trim();
  let keyVerse = '';
  const vMatch = section.match(/[\u201c"]([^\u201c\u201d"]{10,100})[\u201d"]/);
  if (vMatch) keyVerse = '\u201c' + vMatch[1].trim() + '\u201d';
  let text = stripTags(section);
  text = text.replace(/Morning,\s+\w+\s+\d+/i,'').replace(/Go To.*?Reading/gi,'').replace(/Please login[\s\S]*/gi,'').trim();
  if (text.length > 1400) text = text.substring(0,1400).replace(/\s\S+$/,'') + '...';
  if (!text || text.length < 50) return { title, keyVerse, text:'Visit ccel.org for today\'s devotional.' };
  return { title, keyVerse, text };
}
