module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  return res.status(200).json({
    ok: true,
    message: '一鍵超人後台 API 正常',
    time: new Date().toISOString(),
    runtime: 'vercel-node'
  });
};
