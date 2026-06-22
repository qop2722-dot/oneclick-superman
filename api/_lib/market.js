const TWSE_URL = 'https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL';
const TPEX_URL = 'https://www.tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes';

function getAny(obj, keys) {
  for (const key of keys) {
    if (obj && obj[key] !== undefined && obj[key] !== null && String(obj[key]).trim() !== '') return obj[key];
  }
  return '';
}

function text(value) {
  return String(value ?? '').trim();
}

function num(value) {
  if (value === null || value === undefined) return NaN;
  const cleaned = String(value).replace(/[,％%元股筆]/g, '').replace(/--/g, '').trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

function normalizeTWSE(row) {
  return {
    market: '上市',
    id: text(getAny(row, ['Code', '證券代號', '股票代號', 'code'])),
    name: text(getAny(row, ['Name', '證券名稱', '股票名稱', 'name'])),
    open: num(getAny(row, ['OpeningPrice', '開盤價', 'open'])),
    high: num(getAny(row, ['HighestPrice', '最高價', 'high'])),
    low: num(getAny(row, ['LowestPrice', '最低價', 'low'])),
    close: num(getAny(row, ['ClosingPrice', '收盤價', 'close'])),
    volume: num(getAny(row, ['TradeVolume', '成交股數', 'Trading_Volume', 'volume'])),
    money: num(getAny(row, ['TradeValue', '成交金額', 'Trading_money', 'money'])),
    trades: num(getAny(row, ['Transaction', '成交筆數', 'Trading_turnover', 'trades'])),
    source: 'TWSE'
  };
}

function normalizeTPEX(row) {
  return {
    market: '上櫃',
    id: text(getAny(row, ['SecuritiesCompanyCode', 'Code', '代號', '股票代號', 'code'])),
    name: text(getAny(row, ['CompanyName', 'Name', '名稱', '股票名稱', 'name'])),
    open: num(getAny(row, ['Open', 'OpeningPrice', '開盤', '開盤價', 'open'])),
    high: num(getAny(row, ['High', 'HighestPrice', '最高', '最高價', 'high'])),
    low: num(getAny(row, ['Low', 'LowestPrice', '最低', '最低價', 'low'])),
    close: num(getAny(row, ['Close', 'ClosingPrice', '收盤', '收盤價', 'close'])),
    volume: num(getAny(row, ['TradingShares', 'TradeVolume', '成交股數', '成交量', 'volume'])),
    money: num(getAny(row, ['TransactionAmount', 'TradeValue', '成交金額', 'money'])),
    trades: num(getAny(row, ['TransactionNumber', 'Transaction', '成交筆數', 'trades'])),
    source: 'TPEx'
  };
}

async function fetchJSON(url) {
  const res = await fetch(url, {
    headers: {
      'accept': 'application/json,text/plain,*/*',
      'user-agent': 'oneclick-superman/1.0'
    },
    cache: 'no-store'
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json();
}

function cleanRows(rows) {
  return rows
    .filter((x) => /^\d{4}$/.test(x.id))
    .filter((x) => Number.isFinite(x.open) && Number.isFinite(x.high) && Number.isFinite(x.low) && Number.isFinite(x.close))
    .filter((x) => Number.isFinite(x.volume) && x.volume > 0 && x.close > 0)
    .map((x) => ({
      ...x,
      money: Number.isFinite(x.money) ? x.money : 0,
      trades: Number.isFinite(x.trades) ? x.trades : 0
    }));
}

async function getLatestMarket(scope = 'all') {
  const rows = [];
  const warnings = [];
  const useTWSE = scope === 'all' || scope === 'twse' || scope.includes('twse');
  const useTPEX = scope === 'all' || scope === 'tpex' || scope.includes('tpex');

  const tasks = [];
  if (useTWSE) {
    tasks.push(fetchJSON(TWSE_URL).then((data) => rows.push(...data.map(normalizeTWSE))).catch((err) => warnings.push(`TWSE: ${err.message}`)));
  }
  if (useTPEX) {
    tasks.push(fetchJSON(TPEX_URL).then((data) => rows.push(...data.map(normalizeTPEX))).catch((err) => warnings.push(`TPEx: ${err.message}`)));
  }
  await Promise.all(tasks);

  const data = cleanRows(rows);
  if (data.length < 20) {
    throw new Error(`市場資料筆數太少：${data.length}。${warnings.join(' / ')}`);
  }

  return {
    ok: true,
    source: 'TWSE/TPEx backend proxy',
    updatedAt: new Date().toISOString(),
    count: data.length,
    warnings,
    data
  };
}

module.exports = { getLatestMarket };
