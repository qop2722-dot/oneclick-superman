module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const token = process.env.FINMIND_TOKEN;
  if (!token) {
    return res.status(400).json({ ok: false, error: 'FINMIND_TOKEN is not configured on the server.' });
  }

  try {
    const url = new URL('https://api.finmindtrade.com/api/v4/data');
    for (const [key, value] of Object.entries(req.query || {})) {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
    }
    const apiRes = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, accept: 'application/json' },
      cache: 'no-store'
    });
    const json = await apiRes.json().catch(() => ({}));
    return res.status(apiRes.ok ? 200 : apiRes.status).json({ ok: apiRes.ok, ...json });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message || String(error) });
  }
};
