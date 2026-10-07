// 宝宝美语：离线缓存。网页先走网络（拿到最新版），录音和字体先用手机里存好的。
const PAGE = 'bt-page-v1';
const AUDIO = 'bt-audio';   // 录音的文件名就是英文句子的编号，内容不会变，可以一直存着
const FONTS = 'bt-fonts';
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon.svg'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(PAGE).then(c => c.addAll(CORE)).catch(() => {}));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith('bt-page-') && k !== PAGE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// 播放器会带 Range 请求；手机里已存的录音要自己切出对应的片段（Safari 需要 206）
async function audio(req) {
  const cache = await caches.open(AUDIO);
  let res = await cache.match(req.url);
  if (!res) {
    res = await fetch(req.url);
    if (!res.ok) return res;
    await cache.put(req.url, res.clone());
  }
  const range = req.headers.get('range');
  if (!range) return res;
  const buf = await res.arrayBuffer();
  const m = /bytes=(\d*)-(\d*)/.exec(range) || [];
  const start = Number(m[1]) || 0;
  const end = m[2] ? Math.min(Number(m[2]), buf.byteLength - 1) : buf.byteLength - 1;
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Range': `bytes ${start}-${end}/${buf.byteLength}`,
      'Content-Length': String(end - start + 1),
      'Accept-Ranges': 'bytes'
    }
  });
}

async function page(req) {
  const cache = await caches.open(PAGE);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (e) {
    return (await cache.match(req)) || (await cache.match('index.html')) || Response.error();
  }
}

async function font(req) {
  const cache = await caches.open(FONTS);
  const hit = await cache.match(req);
  const net = fetch(req).then(res => { if (res.ok || res.type === 'opaque') cache.put(req, res.clone()); return res; }).catch(() => hit);
  return hit || net;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin && /\/audio\/[0-9a-f]+\.mp3$/.test(url.pathname)) e.respondWith(audio(req));
  else if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') e.respondWith(font(req));
  else if (url.origin === location.origin) e.respondWith(page(req));
});
