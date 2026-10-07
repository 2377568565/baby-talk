// 宝宝美语：账号同步。把中转站（ntfy）里的新消息验签、检查后写进 data/sync.json。
// 中转站只保留 12 小时，所以 .github/workflows/sync.yml 每 30 分钟运行一次；也可以本机运行：node tools/sync.js
const fs = require('fs'), path = require('path');
const { BTSync } = require('./sync_core.js');

const FILE = path.join(__dirname, '..', 'data', 'sync.json');
const TOPIC = process.env.BT_TOPIC || 'bbtalk-42eaff1a6300df13';
const RELAY = (process.env.BT_RELAY || 'https://ntfy.sh').replace(/\/+$/, '');

async function fetchText(url) {
  for (let i = 0; ; i++) {
    try { const r = await fetch(url); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.text(); }
    catch (e) { if (i >= 3) throw e; await new Promise(ok => setTimeout(ok, 4000 * (i + 1))); }
  }
}

(async () => {
  let S; try { S = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (e) { S = {}; }
  BTSync.norm(S);
  const before = JSON.stringify(S);
  const since = S.last ? Math.max(0, S.last - 120) : 'all';
  const txt = await fetchText(`${RELAY}/${TOPIC}/json?poll=1&since=${since}`);
  const msgs = txt.split('\n').map(l => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean);
  const out = await BTSync.merge(S, msgs);
  const cut = Math.floor(Date.now() / 1000) - 2 * 86400;   // 两天前的消息编号不用再记
  for (const k of Object.keys(S.seen)) if (S.seen[k] < cut) delete S.seen[k];
  console.log(`中转站消息 ${msgs.length} 条，新处理 ${out.length} 条：` + (out.map(o => o.why || 'ok').join(', ') || '无'));
  // 只有“已读消息编号”变了不用保存：中转站的旧消息下次还会读到，已经处理过的会被跳过
  const core = o => JSON.stringify({ a: o.accounts, v: o.vault });
  if (core(S) === core(JSON.parse(before)) && fs.existsSync(FILE)) { console.log('账号数据没有变化'); return; }
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(S));
  console.log(`已写入：账号 ${Object.keys(S.accounts).length} 个`);
})().catch(e => { console.error(e); process.exit(1); });
