const { getLatestMarket } = require('../_lib/market');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const scope = String(req.query.scope || 'all');
    const result = await getLatestMarket(scope);
    return res.status(200).json({
      ...result,
      note: 'Public backend currently returns latest official daily quotes. Historical expansion can be added with FinMind or exchange per-stock endpoints.'
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message || String(error) });
  }
};
