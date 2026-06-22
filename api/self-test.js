const { getLatestMarket } = require('./_lib/market');

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

async function step(name, fn) {
  const startedAt = Date.now();
  try {
    const result = await fn();
    return { name, ok: true, ms: Date.now() - startedAt, result };
  } catch (error) {
    return { name, ok: false, ms: Date.now() - startedAt, error: error.message || String(error) };
  }
}

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const steps = [];
  steps.push({
    name: 'runtime',
    ok: true,
    result: {
      node: process.version,
      hasFinMindToken: Boolean(process.env.FINMIND_TOKEN),
      environment: process.env.VERCEL ? 'vercel' : 'local-or-unknown'
    }
  });

  steps.push(await step('market.latest.twse', async () => {
    const data = await getLatestMarket('twse');
    return { count: data.count, warnings: data.warnings };
  }));

  steps.push(await step('market.latest.tpex', async () => {
    const data = await getLatestMarket('tpex');
    return { count: data.count, warnings: data.warnings };
  }));

  const ok = steps.every((item) => item.ok);
  return res.status(ok ? 200 : 500).json({
    ok,
    checkedAt: new Date().toISOString(),
    steps
  });
};
