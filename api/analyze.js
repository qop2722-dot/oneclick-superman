const { getLatestMarket } = require('./_lib/market');

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function n(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function round(value) {
  return Number.isFinite(Number(value)) ? Math.round(Number(value) * 100) / 100 : null;
}

function candle(row) {
  const range = Math.max(0.01, row.high - row.low);
  const body = Math.abs(row.close - row.open);
  const lower = Math.min(row.open, row.close) - row.low;
  return {
    range,
    body,
    lower,
    green: row.close >= row.open,
    closePosition: (row.close - row.low) / range,
    bodyRatio: body / range
  };
}

function heat(row, heatBy) {
  if (heatBy === 'volume') return row.volume || 0;
  if (heatBy === 'trades') return row.trades || 0;
  return row.money || 0;
}

function analyzeRow(row, params) {
  const c = candle(row);
  const notLongBlackBreak = !(c.green === false && c.bodyRatio > 0.55 && c.closePosition < 0.32);
  const stopK = c.green || c.lower > c.range * 0.35;
  const volumeTurn = row.volume > params.minVolume || row.money > params.minMoney;
  const trendPass = row.close > row.low + c.range * 0.55 || row.close >= row.open;
  const entryLow = round(row.low + c.range * 0.22);
  const entryHigh = round(row.low + c.range * 0.58);
  const stop = round(Math.min(row.low, entryLow) * 0.99);
  const nearZone = row.close >= entryLow * 0.97 && row.low <= entryHigh * 1.03;
  const entryOK = Boolean(trendPass && nearZone && stopK && volumeTurn && notLongBlackBreak);
  let score = 0;
  score += trendPass ? 26 : 0;
  score += nearZone ? 22 : 0;
  score += stopK ? 18 : 0;
  score += volumeTurn ? 16 : 0;
  score += notLongBlackBreak ? 10 : -20;
  score += row.close >= row.open ? 4 : 0;

  return {
    id: row.id,
    name: row.name,
    market: row.market,
    latestDate: row.date || '',
    open: round(row.open),
    high: round(row.high),
    low: round(row.low),
    close: round(row.close),
    volume: row.volume,
    money: row.money,
    trades: row.trades,
    heat: row.heat,
    score: Math.round(score),
    entryZone: { label: '進場區', source: '最新日線估算區', low: entryLow, high: entryHigh },
    stopZone: { label: '停損區', price: stop },
    conditions: { trendPass, nearZone, stopK, volumeTurn, notLongBlackBreak },
    strategyFlags: { latestOnly: true },
    metrics: { closePosition: round(c.closePosition), bodyRatio: round(c.bodyRatio) },
    advice: entryOK ? '可觀察，等確認' : '先等，不追高',
    entryOK,
    dataMode: 'latest-only'
  };
}

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    const params = {
      scope: String(req.query.scope || 'all'),
      heatBy: String(req.query.heatBy || 'money'),
      topHeat: clamp(n(req.query.topHeat, 30), 10, 100),
      maxResults: clamp(n(req.query.maxResults, 6), 3, 12),
      minVolume: n(req.query.minVolume, 500000),
      minMoney: n(req.query.minMoney, 50000000)
    };
    const market = await getLatestMarket(params.scope);
    const hot = market.data
      .map((row) => ({ ...row, heat: heat(row, params.heatBy) }))
      .sort((a, b) => b.heat - a.heat)
      .slice(0, params.topHeat);
    const analyzed = hot
      .map((row) => analyzeRow(row, params))
      .filter((row) => row.conditions.notLongBlackBreak)
      .sort((a, b) => b.score - a.score || b.heat - a.heat);
    const final = analyzed.slice(0, params.maxResults);
    return res.status(200).json({
      ok: true,
      mode: 'latest-only-stable-test',
      updatedAt: new Date().toISOString(),
      params,
      stats: {
        rawCount: market.data.length,
        hotCount: hot.length,
        analyzedCount: analyzed.length,
        finalCount: final.length,
        historyCount: 0
      },
      warnings: market.warnings || [],
      hot,
      analyzed,
      final
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message || String(error) });
  }
};
