const BASE_URL = 'https://api.bloomerang.co/v2';

async function bloomerangGet(path, apiKey) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' }
  });
  if (!res.ok) throw new Error(`Bloomerang error: ${res.status}`);
  return res.json();
}

exports.handler = async (event, context) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  const apiKey = process.env.BLOOMERANG_CRM_API_KEY;
  if (!apiKey) return { statusCode: 200, headers, body: JSON.stringify({ error: 'Bloomerang key not configured' }) };

  try {
    const now = new Date();
    const yearStart = `${now.getFullYear()}-01-01`;
    const today = now.toISOString().split('T')[0];
    const ninetyDaysAgo = new Date(now - 90*24*60*60*1000).toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(now - 30*24*60*60*1000).toISOString().split('T')[0];

    const txData = await bloomerangGet(`/transactions?startDate=${yearStart}&endDate=${today}&orderBy=Date&orderDirection=Desc&take=500`, apiKey);
    const transactions = txData.Results || [];

    const ytdGiving = transactions.reduce((sum, tx) => tx.Type !== 'Refund' ? sum + (tx.Amount || 0) : sum, 0);

    const byDonor = {};
    transactions.forEach(tx => {
      if (!tx.AccountId) return;
      byDonor[tx.AccountId] = (byDonor[tx.AccountId] || 0) + (tx.Amount || 0);
    });
    const donorSegments = { major: 0, mid: 0, base: 0 };
    Object.values(byDonor).forEach(total => {
      if (total >= 1000) donorSegments.major++;
      else if (total >= 250) donorSegments.mid++;
      else donorSegments.base++;
    });

    const activeTx = await bloomerangGet(`/transactions?startDate=${ninetyDaysAgo}&endDate=${today}&take=500`, apiKey);
    const activeIds = new Set((activeTx.Results || []).map(tx => tx.AccountId).filter(Boolean));
    const activeDonors = activeIds.size;

    const recentIds = new Set(transactions.filter(tx => tx.Date >= thirtyDaysAgo).map(tx => tx.AccountId));
    const olderIds = new Set(transactions.filter(tx => tx.Date < thirtyDaysAgo).map(tx => tx.AccountId));
    let newDonors30d = 0;
    recentIds.forEach(id => { if (!olderIds.has(id)) newDonors30d++; });

    const recentGifts = transactions.slice(0, 5).map(tx => ({
      amount: tx.Amount, date: tx.Date,
      donor: tx.AccountId ? `Donor #${tx.AccountId}` : 'Anonymous',
      fund: tx.Fund ? tx.Fund.Name : null
    }));

    return {
      statusCode: 200, headers,
      body: JSON.stringify({
        ytdGiving: Math.round(ytdGiving),
        annualGoal: 400000,
        activeDonors,
        newDonors30d,
        recentGifts,
        donorSegments,
        asOf: today
      })
    };
  } catch (err) {
    return { statusCode: 200, headers, body: JSON.stringify({ error: err.message }) };
  }
};
