// 宝宝美语：生成图标和分享预览图（og.png）。只有改了标志或分享图时才需要运行。
//   node tools/images.js        （需要 Playwright 和 Chromium）
const path = require('path');
let pw;
try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const ROOT = path.join(__dirname, '..');

const LOGO = (bg, pad) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-pad} ${-pad} ${40 + 2 * pad} ${40 + 2 * pad}">
<rect x="${-pad}" y="${-pad}" width="${40 + 2 * pad}" height="${40 + 2 * pad}" fill="${bg}"/>
<path d="M8 8h24a5 5 0 0 1 5 5v11a5 5 0 0 1-5 5H18l-7 6v-6H8a5 5 0 0 1-5-5V13a5 5 0 0 1 5-5z" fill="#D9704B"/>
<circle cx="14.5" cy="18" r="2" fill="#fff"/><circle cx="25.5" cy="18" r="2" fill="#fff"/>
<path d="M15.5 22.5c1.2 1.3 2.8 2 4.5 2s3.3-.7 4.5-2" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`;

const OG = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@700;800&family=Lexend:wght@500&family=Noto+Sans+SC:wght@500;800&display=block">
<style>
html,body{margin:0;width:1200px;height:630px;overflow:hidden}
body{background:#F6F3FA;font-family:"Noto Sans SC",sans-serif;color:#2A2540;position:relative}
.dots{position:absolute;inset:0;background:radial-gradient(circle at 1040px 120px,#F3D2C3 0 150px,transparent 151px),radial-gradient(circle at 1150px 560px,#E3DAF5 0 120px,transparent 121px)}
.wrap{position:absolute;left:84px;top:78px;right:84px}
.brand{display:flex;align-items:center;gap:22px}
.brand svg{width:96px;height:96px}
.t b{display:block;font:800 76px/1 "Noto Sans SC";letter-spacing:.02em}
.t i{display:block;font:700 34px/1.2 "Baloo 2";font-style:normal;color:#D9704B;letter-spacing:.08em;margin-top:6px}
.sub{margin:34px 0 0;font:500 32px/1.5 "Noto Sans SC";color:#6B6582}
.bubble{position:absolute;left:84px;bottom:70px;padding:26px 34px;border-radius:34px 34px 34px 10px;background:#fff;border:2px solid #F0D9CF;box-shadow:0 14px 40px rgba(42,37,64,.08)}
.bubble .en{font:500 46px/1.2 "Lexend"}
.bubble .zh{font:500 26px/1.4 "Noto Sans SC";color:#6B6582;margin-top:8px}
.ages{position:absolute;right:84px;bottom:86px;display:flex;flex-direction:column;gap:12px;align-items:flex-end}
.ages span{font:800 26px/1 "Baloo 2";padding:12px 20px;border-radius:16px;background:#fff;border:2px solid var(--c);color:#2A2540}
.ages span::before{content:"";display:inline-block;width:14px;height:14px;border-radius:50%;background:var(--c);margin-right:12px;vertical-align:1px}
</style></head><body><div class="dots"></div>
<div class="wrap"><div class="brand">${LOGO('transparent', 0)}<div class="t"><b>宝宝美语</b><i>Baby Talk</i></div></div>
<p class="sub">0–6 岁 · 每个生活场景 · 地道美国口语<br>能搜索、能听美式发音</p></div>
<div class="bubble"><div class="en">Look who's awake!</div><div class="zh">看看谁醒啦！</div></div>
<div class="ages"><span style="--c:#D9704B">0–6 个月</span><span style="--c:#2E9470">1–2 岁</span><span style="--c:#8263D0">3–6 岁</span></div>
</body></html>`;

(async () => {
  const b = await pw.chromium.launch();
  const shot = async (html, w, h, file) => {
    const pg = await b.newPage({ viewport: { width: w, height: h } });
    await pg.setContent(html, { waitUntil: 'networkidle' });
    await pg.evaluate(() => document.fonts && document.fonts.ready);
    await pg.screenshot({ path: path.join(ROOT, file) });
    await pg.close();
  };
  const icon = (size, pad) => `<style>html,body{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>` + LOGO('#F6F3FA', pad);
  await shot(icon(180, 0), 180, 180, 'icon-180.png');
  await shot(icon(192, 0), 192, 192, 'icon-192.png');
  await shot(icon(512, 0), 512, 512, 'icon-512.png');
  await shot(icon(512, 6), 512, 512, 'icon-512-maskable.png');
  await shot(OG, 1200, 630, 'og.png');
  await b.close();
  console.log('ok');
})();
