(function () {
'use strict';

// ---------- 存储（读不到也能用） ----------
const LS = {
  get(k, d) { try { const v = localStorage.getItem('bt.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('bt.' + k, JSON.stringify(v)); } catch (e) { /* 隐私模式 */ } }
};

const S = {
  script: LS.get('script', 's'),          // s 简体 / t 繁體
  theme: LS.get('theme', 'auto'),          // auto / light / dark
  birth: LS.get('birth', ''),
  nick: LS.get('nick', ''),
  favs: LS.get('favs', []),
  showZh: LS.get('showZh', true),
  slowDefault: LS.get('slowDefault', false),
  follow: LS.get('follow', false),        // 全部播放时留出跟读时间
  voice: LS.get('voice', ''),
  recent: LS.get('recent', []),
  stage: null,
  q: '',
  qStage: 'all'
};

let D, UI;
function loadData() {
  D = JSON.parse(document.getElementById(S.script === 't' ? 'dataT' : 'dataS').textContent);
  UI = JSON.parse(document.getElementById('uiT').textContent);
  D.byId = {};
  D.ps.forEach((p, n) => { p.n = n; if (!D.byId[p.i]) D.byId[p.i] = p; });
  D.audioSet = new Set(D.audio);
  D.main = D.stages.filter(s => s.id !== 'songs');
  D.songs = D.stages.find(s => s.id === 'songs');
}
function T(s) { return S.script === 't' ? (UI[s] || s) : s; }
const $ = (sel, el) => (el || document).querySelector(sel);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- 图标（线条） ----------
const ICONS = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/>',
  bottle: '<path d="M10.5 6c0-1.6 1.5-1.9 1.5-3.5 0 1.6 1.5 1.9 1.5 3.5"/><path d="M9 6h6"/><rect x="7.5" y="6" width="9" height="15.5" rx="3"/><path d="M7.5 11h3M7.5 14.5h3M7.5 18h3"/>',
  bubbles: '<circle cx="9" cy="14" r="5"/><circle cx="17" cy="7" r="3"/><circle cx="18.3" cy="15.5" r="1.8"/>',
  diaper: '<path d="M3.5 6.5h17v3c0 5.5-4 9-8.5 9s-8.5-3.5-8.5-9z"/><path d="M8 18.2c.6-2.6 2-4.2 4-4.2s3.4 1.6 4 4.2"/>',
  tub: '<path d="M3 12h18v2a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5z"/><path d="M6 12V6.5a2.5 2.5 0 0 1 5 0"/><path d="M7.5 19l-1 2M16.5 19l1 2M14 8.5h.01M17 6.5h.01M16.5 10h.01"/>',
  shirt: '<path d="M8 3.5 3.5 6.5l2 4 2.5-1v11h8v-11l2.5 1 2-4L16 3.5c-.8 1.5-2.2 2.3-4 2.3S8.8 5 8 3.5z"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  cloud: '<path d="M7 18.5a4.5 4.5 0 0 1-.4-9A6 6 0 0 1 18 10a4.3 4.3 0 0 1-.5 8.5z"/>',
  star: '<path d="M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-2.9-5.4 2.9 1.1-6-4.5-4.2 6.1-.8z"/>',
  rattle: '<circle cx="9" cy="9" r="5.5"/><path d="M13 13l7 7"/><path d="M6.8 7.6c.6-.8 1.5-1.2 2.4-1.2"/>',
  stroller: '<path d="M3 5h2.2L8 14.5h10.5"/><path d="M8.3 9.5H20a6 6 0 0 0-6-6h-.5v6"/><circle cx="9" cy="18.5" r="2"/><circle cx="17" cy="18.5" r="2"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10C19.5 15.4 12 20 12 20z"/>',
  hand: '<path d="M8 12.5V6a1.5 1.5 0 0 1 3 0v5M11 10.5V4.5a1.5 1.5 0 0 1 3 0v6M14 10.5V6a1.5 1.5 0 0 1 3 0v7c0 4.5-2.5 8-6.5 8-2.5 0-4-1.3-5.4-3.4L3.4 15a1.6 1.6 0 0 1 2.6-1.8L8 15.5"/>',
  medical: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><path d="M12 8v8M8 12h8"/>',
  spoon: '<ellipse cx="12" cy="7" rx="3.5" ry="4.5"/><path d="M12 11.5V21"/>',
  steps: '<path d="M7.5 3c1.7 0 2.5 2 2.5 4.5S9 11 7.5 11 5 9.5 5 7.5 5.8 3 7.5 3zM5.7 13.5h3.8M16.5 9c1.7 0 2.5 2 2.5 4.5s-1 3.5-2.5 3.5-2.5-1.5-2.5-3.5S14.8 9 16.5 9zM14.7 19.5h3.8"/>',
  shield: '<path d="M12 3l7.5 3v5.5c0 4.5-3.2 8.2-7.5 9.5-4.3-1.3-7.5-5-7.5-9.5V6z"/><path d="M9 12l2 2 4-4"/>',
  wave: '<path d="M8 12.5V6a1.5 1.5 0 0 1 3 0v5M11 10.5V4.5a1.5 1.5 0 0 1 3 0v6M14 10.5V6a1.5 1.5 0 0 1 3 0v7c0 4.5-2.5 8-6.5 8-2.5 0-4-1.3-5.4-3.4L3.4 15a1.6 1.6 0 0 1 2.6-1.8L8 15.5"/><path d="M19.5 3.5c.9.8 1.5 1.8 1.7 3"/>',
  chat: '<path d="M4.5 5h15a1 1 0 0 1 1 1v9.5a1 1 0 0 1-1 1H10L5.5 20v-3.5h-1a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/><path d="M8 9.5h8M8 12.5h5"/>',
  home: '<path d="M3.5 11 12 4l8.5 7"/><path d="M6 9.5V20h12V9.5"/><path d="M10 20v-5h4v5"/>',
  book: '<path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5c-3.5-.5-6.5 0-8.5 1.5z"/><path d="M12 6.5v13"/>',
  tooth: '<path d="M7.5 3.5c1.7 0 2.8.9 4.5.9s2.8-.9 4.5-.9c2.2 0 3.5 2 3.5 4.3 0 3-1.5 4.2-2 7.7-.4 2.8-.9 5-2.3 5-1.6 0-1.5-5.5-3.7-5.5s-2.1 5.5-3.7 5.5c-1.4 0-1.9-2.2-2.3-5-.5-3.5-2-4.7-2-7.7 0-2.3 1.3-4.3 3.5-4.3z"/>',
  car: '<path d="M3.5 16.5v-4l2-5h13l2 5v4h-2M7 16.5h9.5"/><path d="M3.5 12.5h17"/><circle cx="7.5" cy="17" r="1.8"/><circle cx="16.5" cy="17" r="1.8"/>',
  bowl: '<path d="M3.5 11h17a8.5 8.5 0 0 1-17 0z"/><path d="M9 20.5h6M12.5 8l5.5-4.5M15.5 8.5 21 5"/>',
  sparkle: '<path d="M11 3c.6 4.5 2.5 6.4 7 7-4.5.6-6.4 2.5-7 7-.6-4.5-2.5-6.4-7-7 4.5-.6 6.4-2.5 7-7z"/><path d="M19 15c.3 1.8 1 2.5 2.5 2.8-1.5.3-2.2 1-2.5 2.7-.3-1.7-1-2.4-2.5-2.7 1.5-.3 2.2-1 2.5-2.8z"/>',
  smile: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 14c.8 1.3 2 2 3.5 2s2.7-.7 3.5-2M9 9.5v.6M15 9.5v.6"/>',
  please: '<path d="M4.5 5h15a1 1 0 0 1 1 1v9.5a1 1 0 0 1-1 1H10L5.5 20v-3.5h-1a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/><path d="M12 13.8s-3-1.8-3-3.8a1.5 1.5 0 0 1 3-.6 1.5 1.5 0 0 1 3 .6c0 2-3 3.8-3 3.8z"/>',
  tree: '<path d="M12 21v-6"/><path d="M12 3c3 0 5.5 2.4 5.5 5.4 1.3.7 2 2 2 3.3 0 2.1-1.8 3.8-4 3.8h-7c-2.2 0-4-1.7-4-3.8 0-1.3.7-2.6 2-3.3C6.5 5.4 9 3 12 3z"/>',
  paw: '<ellipse cx="12" cy="16" rx="4.5" ry="3.8"/><circle cx="5.5" cy="10.5" r="1.8"/><circle cx="9.2" cy="6.3" r="1.8"/><circle cx="14.8" cy="6.3" r="1.8"/><circle cx="18.5" cy="10.5" r="1.8"/>',
  drop: '<path d="M12 3s6.5 7 6.5 11.5a6.5 6.5 0 0 1-13 0C5.5 10 12 3 12 3z"/>',
  split: '<path d="M12 21v-7L6 8M12 14l6-6M6 4v4h0M6 4h4M18 4v4M18 4h-4"/>',
  swap: '<path d="M4 8h15l-3.5-3.5M20 16H5l3.5 3.5"/>',
  crown: '<path d="M4 18.5h16M4.5 16 3.5 7l5 4 3.5-6 3.5 6 5-4-1 9z"/>',
  cart: '<path d="M3 4h2.5l2.2 10.5h10.5L20.5 7.5H6.5"/><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  question: '<circle cx="12" cy="12" r="8.5"/><path d="M9.5 9.5a2.5 2.5 0 0 1 5 .2c0 1.8-2.5 2.2-2.5 4M12 16.8v.4"/>',
  medal: '<circle cx="12" cy="15" r="5.5"/><path d="M8.5 10.5 6 3.5h4l2 5 2-5h4l-2.5 7"/>',
  backpack: '<path d="M6.5 9a5.5 5.5 0 0 1 11 0v11.5h-11z"/><path d="M9.5 4.5v-1h5v1M9 14.5h6v6H9z"/>',
  people: '<circle cx="8.5" cy="8" r="3"/><circle cx="16.5" cy="9" r="2.5"/><path d="M3 20c0-3.3 2.5-6 5.5-6s5.5 2.7 5.5 6M14.5 14.4c.6-.3 1.3-.4 2-.4 2.5 0 4.5 2.4 4.5 5.5"/>',
  bulb: '<path d="M9 17.5h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.3.3.5.9.5 1.4v1.2h6v-1.2c0-.5.2-1.1.5-1.4A6 6 0 0 0 12 3z"/>',
  list: '<path d="M9.5 6.5H20M9.5 12H20M9.5 17.5H20M3.5 6.5l1.2 1.2 2-2.2M3.5 12l1.2 1.2 2-2.2M3.5 17.5l1.2 1.2 2-2.2"/>',
  pencil: '<path d="M4 20l1-4.5L15.5 5a2.1 2.1 0 0 1 3 3L8 18.5z"/><path d="M13.5 7l3 3"/>',
  gift: '<rect x="3.5" y="8" width="17" height="4" rx="1"/><path d="M5 12v8.5h14V12M12 8v12.5M12 8c-1-3-5-4-5-1.5C7 8 12 8 12 8zM12 8c1-3 5-4 5-1.5C17 8 12 8 12 8z"/>',
  ball: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c-2.5 2.3-3.8 5.1-3.8 8.5s1.3 6.2 3.8 8.5M12 3.5c2.5 2.3 3.8 5.1 3.8 8.5s-1.3 6.2-3.8 8.5"/>',
  music: '<path d="M9 18V5.5l11-2V16"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>'
};
const UI_ICONS = {
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.3-4.3"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none"/>',
  stop: '<rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" stroke="none"/>',
  turtle: '<path d="M4.5 15.5c0-4 3.2-7 7-7s7 3 7 7z"/><path d="M18.5 13.5h1.3a1.6 1.6 0 0 0 0-3.2h-1M3 15.5h17.5M7 15.5l-.8 2.5M16 15.5l.8 2.5M9 11.5l2.5 4M14 11.5l-2.5 4"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.4"/>',
  back: '<path d="M14.5 5 7.5 12l7 7"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M2.8 12h2.4M18.8 12h2.4M4.9 19.1l1.7-1.7M17.4 6.6l1.7-1.7"/>',
  user: '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20.5c.8-3.7 3.8-6 7.5-6s6.7 2.3 7.5 6"/>',
  x: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  refresh: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4v4h-4"/>',
  chev: '<path d="M6 9.5l6 6 6-6"/>',
  ear: '<path d="M7 9a5 5 0 0 1 10 0c0 3-2.5 3.8-3 6.5-.4 2.2-1.6 4-3.8 4-1.5 0-2.7-1-3-2.3"/><path d="M10 9.5a2 2 0 0 1 4 0c0 1.3-1 1.6-1.5 2.4"/>',
  repeat: '<path d="M4 11V9.5A3.5 3.5 0 0 1 7.5 6H19l-3-3M20 13v1.5a3.5 3.5 0 0 1-3.5 3.5H5l3 3"/>',
  cards: '<rect x="3.5" y="7" width="13" height="13.5" rx="2.5"/><path d="M8 3.5h10a2.5 2.5 0 0 1 2.5 2.5v11"/>',
  share: '<path d="M12 15V3.5M7.5 8 12 3.5 16.5 8"/><path d="M5 12v6.5A2 2 0 0 0 7 20.5h10a2 2 0 0 0 2-2V12"/>',
  download: '<path d="M12 3.5V15M7.5 10.5 12 15l4.5-4.5"/><path d="M4.5 19.5h15"/>',
  copy: '<rect x="8" y="8" width="12.5" height="12.5" rx="2.5"/><path d="M16 8V5.5A2 2 0 0 0 14 3.5H5.5a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2H8"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  phone: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10.5 18.5h3"/>'
};
const SITE_URL = 'https://2377568565.github.io/baby-talk/';
function ico(name, cls) {
  const body = ICONS[name] || UI_ICONS[name] || '';
  return '<svg class="ico ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + body + '</svg>';
}

// ---------- 年龄与阶段 ----------
function ageInfo() {
  if (!S.birth) return null;
  const b = new Date(S.birth + 'T00:00:00');
  if (isNaN(b)) return null;
  const now = new Date();
  const days = Math.floor((now - b) / 86400000);
  if (days < 0) return null;
  let months = (now.getFullYear() - b.getFullYear()) * 12 + now.getMonth() - b.getMonth();
  if (now.getDate() < b.getDate()) months--;
  months = Math.max(0, months);
  let text;
  if (days < 100) text = T('宝宝') + ' ' + days + ' ' + T('天');
  else if (months < 24) text = T('宝宝') + ' ' + months + ' ' + T('个月');
  else text = T('宝宝') + ' ' + Math.floor(months / 12) + ' ' + T('岁') + (months % 12 ? ' ' + (months % 12) + ' ' + T('个月') : '');
  const st = D.main.find(s => months < s.to) || D.main[D.main.length - 1];
  return { days, months, text, stage: st.id };
}
function currentStageId() {
  const a = ageInfo();
  return a ? a.stage : 's0';
}
function stageById(id) { return D.stages.find(s => s.id === id); }
function setAccent(id) { document.documentElement.setAttribute('data-stage', id || 's0'); }

// ---------- 主题 ----------
function applyTheme() {
  const r = document.documentElement;
  if (S.theme === 'light' || S.theme === 'dark') r.setAttribute('data-theme', S.theme);
  else r.removeAttribute('data-theme');
}

// ---------- 朗读 ----------
const synth = window.speechSynthesis || null;
let voices = [];
function loadVoices() {
  if (!synth) return;
  voices = synth.getVoices().filter(v => /^en[-_]US/i.test(v.lang));
}
if (synth) { loadVoices(); synth.onvoiceschanged = loadVoices; }
const PREFERRED = ['Samantha', 'Ava', 'Allison', 'Susan', 'Zoe', 'Google US English', 'Microsoft Aria', 'Microsoft Jenny', 'Microsoft Ava'];
function pickVoice() {
  if (!voices.length) loadVoices();
  if (S.voice) { const v = voices.find(x => x.voiceURI === S.voice); if (v) return v; }
  for (const name of PREFERRED) {
    const v = voices.find(x => x.name.indexOf(name) === 0);
    if (v) return v;
  }
  return voices[0] || null;
}
const audio = new Audio();
audio.preload = 'auto';
const AUDIO_BASE = 'audio/';
let playToken = 0;

function stopAll() {
  playToken++;
  try { audio.pause(); } catch (e) { /* 忽略 */ }
  if (synth) synth.cancel();
  document.querySelectorAll('.playing').forEach(el => el.classList.remove('playing'));
}

// 播放一句，结束后 resolve(true)；被打断或失败 resolve(false)
function say(id, text, slow) {
  const token = ++playToken;
  try { audio.pause(); } catch (e) { /* 忽略 */ }
  if (synth) synth.cancel();
  return new Promise(resolve => {
    const done = ok => { if (token === playToken) resolve(ok); else resolve(false); };
    const tts = () => {
      if (!synth) { toast(T('这个浏览器不能朗读。请用 Safari 或 Chrome 打开。')); return done(false); }
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      const v = pickVoice();
      if (v) u.voice = v;
      u.rate = slow ? 0.62 : 0.92;
      u.pitch = 1.05;
      u.onend = () => done(true);
      u.onerror = () => done(false);
      synth.speak(u);
    };
    if (D.audioSet.has(id)) {
      audio.onended = () => done(true);
      audio.onerror = () => { audio.onerror = null; tts(); };
      audio.src = AUDIO_BASE + id + '.mp3';
      audio.playbackRate = slow ? 0.72 : 1;
      try { audio.preservesPitch = true; } catch (e) { /* 旧浏览器 */ }
      const pr = audio.play();
      if (pr && pr.catch) pr.catch(() => { if (token === playToken) tts(); });
    } else tts();
  });
}

function playPhrase(p, slow, el) {
  stopAll();
  const card = el || document.querySelector('.pc[data-n="' + p.n + '"]');
  if (card) card.classList.add('playing');
  const t0 = Date.now();
  return say(p.i, p.e, slow).then(ok => {
    if (card) card.classList.remove('playing');
    return { ok, ms: Date.now() - t0 };
  });
}

// 全部播放（可选：每句之后留出跟读时间）
let seq = null;
function playAll(list) {
  if (seq) { stopSeq(); return; }
  const me = seq = { i: 0, list };
  keepAwake(true);
  updateSeqBar();
  const step = () => {
    if (seq !== me) return;
    if (me.i >= list.length) { stopSeq(); return; }
    const p = list[me.i];
    const card = document.querySelector('.pc[data-n="' + p.n + '"]');
    if (card) card.scrollIntoView({ block: 'center', behavior: reduceMotion() ? 'auto' : 'smooth' });
    updateSeqBar();
    playPhrase(p, S.slowDefault, card).then(r => {
      if (seq !== me) return;
      if (!r.ok && r.ms < 200) { stopSeq(); return; }
      me.i++;
      const gap = S.follow ? Math.max(1600, r.ms * 1.4) : 650;
      me.timer = setTimeout(step, gap);
    });
  };
  step();
}
function stopSeq() {
  if (seq && seq.timer) clearTimeout(seq.timer);
  seq = null;
  keepAwake(false);
  stopAll();
  updateSeqBar();
}
let wakeLock = null;
function keepAwake(on) {
  try {
    if (on && navigator.wakeLock && !wakeLock) navigator.wakeLock.request('screen').then(l => { wakeLock = l; }).catch(() => {});
    if (!on && wakeLock) { wakeLock.release(); wakeLock = null; }
  } catch (e) { /* 不支持 */ }
}
// 先把这一页的录音下载好，点的时候马上出声
function prefetch(list) {
  if (location.protocol === 'file:' || !window.fetch) return;
  const ids = [];
  list.forEach(p => { if (D.audioSet.has(p.i)) ids.push(p.i); (p.a || []).forEach(a => { if (D.audioSet.has(a[0])) ids.push(a[0]); }); });
  let k = 0;
  const next = () => { if (k >= ids.length) return; fetch(AUDIO_BASE + ids[k++] + '.mp3').then(r => r.blob()).catch(() => {}).then(next); };
  setTimeout(() => { next(); next(); }, 500);
}
function updateSeqBar() {
  const b = $('#playall');
  if (!b) return;
  if (seq) {
    b.classList.add('on');
    b.innerHTML = ico('stop') + '<span>' + T('停止') + ' · ' + Math.min(seq.i + 1, seq.list.length) + '/' + seq.list.length + '</span>';
  } else {
    b.classList.remove('on');
    b.innerHTML = ico('play') + '<span>' + T('全部播放') + '</span>';
  }
}
function reduceMotion() { return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches; }

// ---------- 小提示 ----------
let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

// ---------- 句子卡片 ----------
function words(s) { return s.replace(/[^A-Za-z' -]/g, ' ').trim().split(/\s+/).filter(Boolean).length; }
function isFav(i) { return S.favs.indexOf(i) >= 0; }

function card(p, opts) {
  opts = opts || {};
  const st = D.stages[p.s], m = st.mods[p.m];
  const hasMore = p.t || (p.a && p.a.length);
  const en = opts.hl ? opts.hl(p.e, 'en') : esc(p.e);
  const zh = opts.hl ? opts.hl(p.z, 'zh') : esc(p.z);
  let crumb = '';
  if (opts.crumb) {
    crumb = '<a class="crumb" href="#m-' + st.id + '-' + m.id + '">' + esc(st.id === 'songs' ? T('儿歌') : st.age) + ' · ' + esc(m.zh) + '</a>';
  }
  let more = '';
  if (hasMore) {
    more = '<div class="pc-more"><div class="pc-more-in">';
    if (p.t) more += '<p class="tip">' + (opts.hl ? opts.hl(p.t, 'tip') : esc(p.t)) + '</p>';
    if (p.a && p.a.length) {
      more += '<div class="alts"><span class="alts-h">' + T('也可以说') + '</span>';
      p.a.forEach(a => {
        more += '<button class="alt" data-act="alt" data-id="' + a[0] + '" data-text="' + esc(a[1]) + '">' + ico('play', 'sm') + '<span lang="en">' + esc(a[1]) + '</span></button>';
      });
      more += '</div>';
    }
    more += '</div></div>';
  }
  const easy = words(p.e) <= 3 && st.id !== 'songs' ? '<span class="easy-dot" title="' + T('短句') + '"></span>' : '';
  return '<article class="pc" data-n="' + p.n + '" style="--i:' + (opts.i || 0) + '">' + crumb +
    '<div class="pc-row">' +
      '<button class="pc-main" data-act="play" aria-label="' + T('播放') + '">' +
        '<span class="pc-en" lang="en">' + en + easy + '</span>' +
        '<span class="pc-zh">' + zh + '</span>' +
      '</button>' +
      '<button class="pc-play" data-act="play" aria-label="' + T('播放') + '">' + ico('play') + '<span class="eq" aria-hidden="true"><i></i><i></i><i></i></span></button>' +
    '</div>' +
    '<div class="pc-tools">' +
      '<button class="tool" data-act="slow">' + ico('turtle') + '<span>' + T('慢速') + '</span></button>' +
      (hasMore ? '<button class="tool" data-act="more" aria-expanded="false">' + ico('info') + '<span>' + (p.t ? T('地道说明') : T('其他说法')) + '</span></button>' : '') +
      '<button class="tool fav' + (isFav(p.i) ? ' on' : '') + '" data-act="fav" aria-pressed="' + isFav(p.i) + '" aria-label="' + T('收藏') + '">' + ico('heart') + '</button>' +
    '</div>' + more +
  '</article>';
}

// ---------- 路由 ----------
const TABS = [
  { id: 'home', icon: 'home', label: () => T('首页') },
  { id: 'search', icon: 'search', label: () => T('搜索') },
  { id: 'saved', icon: 'heart', label: () => T('收藏') },
  { id: 'me', icon: 'user', label: () => T('我的') }
];
function renderTabs(active) {
  const nav = $('#tabs');
  let h = '<span class="tab-ink" aria-hidden="true"></span>';
  TABS.forEach(t => {
    h += '<a href="#' + (t.id === 'home' ? '' : t.id) + '" class="tab' + (t.id === active ? ' on' : '') + '" data-tab="' + t.id + '"' + (t.id === active ? ' aria-current="page"' : '') + '>' + ico(t.icon) + '<span>' + t.label() + '</span></a>';
  });
  nav.innerHTML = h;
  const idx = TABS.findIndex(t => t.id === active);
  nav.style.setProperty('--tab', idx);
}

const scrollMem = {};
let lastRoute = null;
function route() {
  const h = decodeURIComponent((location.hash || '').replace(/^#/, ''));
  if (lastRoute != null) scrollMem[lastRoute] = window.scrollY;
  stopSeq();
  let tab = 'home', html = '', after = null, cls = 'fade';
  let m;
  if ((m = h.match(/^m-([a-z0-9]+)-([a-z0-9]+)$/))) {
    const st = stageById(m[1]);
    const mod = st && st.mods.find(x => x.id === m[2]);
    if (mod) { html = viewModule(st, mod); cls = 'push'; setAccent(st.id); }
  } else if ((m = h.match(/^easy-([a-z0-9]+)$/))) {
    const st = stageById(m[1]);
    if (st) { html = viewEasy(st); cls = 'push'; setAccent(st.id); }
  } else if (h === 'search') { tab = 'search'; html = viewSearch(); after = afterSearch; }
  else if (h === 'saved') { tab = 'saved'; html = viewSaved(); }
  else if (h === 'me') { tab = 'me'; html = viewMe(); after = afterMe; }
  else if ((m = h.match(/^quiz-([a-z0-9]+)-([a-z0-9]+)$/))) {
    const list = quizSource(m[1], m[2]);
    if (list && list.length) { html = viewQuiz(list, m[1], m[2]); cls = 'push'; after = startQuiz; if (stageById(m[1])) setAccent(m[1]); }
  }
  else if ((m = h.match(/^guide-([a-z0-9]+)$/))) {
    const st = stageById(m[1]);
    if (st) { html = viewGuide(st); cls = 'push'; setAccent(st.id); }
  }
  if (!html) { html = viewHome(); setAccent(S.stage); after = afterHome; }
  const v = $('#view');
  v.className = '';
  v.innerHTML = html;
  void v.offsetWidth;
  v.className = 'enter-' + cls;
  renderTabs(tab);
  if (after) after();
  const y = scrollMem[h] || 0;
  window.scrollTo(0, cls === 'push' && !scrollMem[h] ? 0 : y);
  lastRoute = h;
  const cards = [...v.querySelectorAll('.pc')].slice(0, 40).map(c => D.ps[+c.dataset.n]);
  if (cards.length) prefetch(cards);
}

// ---------- 首页 ----------
function todayPick(st) {
  const pool = [];
  st.mods.forEach(m => m.ps.forEach(n => { if (words(D.ps[n].e) <= 8) pool.push(n); }));
  const d = new Date();
  const key = d.getFullYear() * 400 + d.getMonth() * 32 + d.getDate() + (S.shuffle || 0) * 7919;
  let h = 2166136261;
  String(key + st.id).split('').forEach(c => { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; });
  return D.ps[pool[h % pool.length]];
}

function viewHome() {
  const st = stageById(S.stage);
  const age = ageInfo();
  const now = currentStageId();
  let h = '<header class="top">' +
    '<div class="brand"><span class="logo" aria-hidden="true">' + logoSvg() + '</span><span class="brand-t"><b>' + T('宝宝美语') + '</b><i lang="en">Baby Talk</i></span></div>' +
    '<a class="agechip" href="#me">' + (age ? esc(age.text) : T('设定宝宝生日')) + '</a>' +
    '</header>';
  if (!S.birth && !LS.get('welcomed', false)) {
    h += '<section class="welcome"><b>' + T('欢迎来到宝宝美语') + '</b>' +
      '<p>' + T('填上宝宝的生日，首页会自动打开适合宝宝年龄的内容。只存在这台手机里。') + '</p>' +
      '<div class="wrow"><label class="sr" for="wbirth">' + T('宝宝生日') + '</label><input id="wbirth" type="date" max="' + todayStr() + '">' +
      '<button class="pill solid" data-act="wsave">' + T('好了') + '</button></div>' +
      '<button class="ghost wskip" data-act="wskip">' + T('先逛逛') + '</button></section>';
  }
  h += '<a class="searchbar" href="#search">' + ico('search') + '<span>' + T('搜中文或英文，例如：尿布、bath') + '</span></a>';

  h += '<div class="stages" role="tablist" aria-label="' + T('年龄阶段') + '">';
  D.main.forEach(s => {
    h += '<button role="tab" class="stg' + (s.id === S.stage ? ' on' : '') + '" data-act="stage" data-id="' + s.id + '" aria-selected="' + (s.id === S.stage) + '" style="--c:var(--' + s.id + ')">' +
      '<b>' + esc(s.age) + '</b><span>' + esc(s.name) + '</span>' + (s.id === now && age ? '<em>' + T('现在') + '</em>' : '') + '</button>';
  });
  h += '</div>';

  const tp = todayPick(st);
  h += '<section class="today" data-n="' + tp.n + '">' +
    '<div class="today-h"><span>' + T('今日一句') + '</span><button class="ghost" data-act="shuffle" aria-label="' + T('换一句') + '">' + ico('refresh') + '<span>' + T('换一句') + '</span></button></div>' +
    '<button class="today-main" data-act="playn" data-n="' + tp.n + '"><span class="today-en" lang="en">' + esc(tp.e) + '</span><span class="today-zh">' + esc(tp.z) + '</span></button>' +
    '<div class="today-f"><a class="crumb" href="#m-' + st.id + '-' + st.mods[tp.m].id + '">' + esc(st.mods[tp.m].zh) + ' ›</a>' +
    '<button class="today-play" data-act="playn" data-n="' + tp.n + '" aria-label="' + T('播放') + '">' + ico('play') + '</button></div>' +
    '</section>';

  h += '<p class="intro">' + esc(st.intro) + '</p>';
  h += '<div class="quick">' +
    '<a class="qcard" href="#easy-' + st.id + '"><span class="qi">' + ico('star') + '</span><span><b>' + T('新手先学') + '</b><small>' + T('最短、最常用的句子') + '</small></span></a>' +
    '<a class="qcard" href="#guide-' + st.id + '"><span class="qi">' + ico('ear') + '</span><span><b>' + T('怎么跟宝宝说') + '</b><small>' + T('方法和语言里程碑') + '</small></span></a>' +
    '</div>';

  h += '<h2 class="sec">' + T('生活场景') + '<small>' + st.mods.length + ' ' + T('个场景') + ' · ' + st.mods.reduce((a, m) => a + m.ps.length, 0) + ' ' + T('句') + '</small></h2>';
  h += '<div class="mods">';
  st.mods.forEach((m, i) => {
    h += '<a class="mod" href="#m-' + st.id + '-' + m.id + '" style="--i:' + i + '"><span class="mi">' + ico(m.icon) + '</span><b>' + esc(m.zh) + '</b><small lang="en">' + esc(m.en) + '</small><em>' + m.ps.length + '</em></a>';
  });
  h += '</div>';

  if (D.songs) {
    h += '<h2 class="sec">' + T('儿歌童谣') + '<small>' + T('一行一行学') + '</small></h2><div class="songs">';
    D.songs.mods.forEach(m => {
      h += '<a class="song" href="#m-songs-' + m.id + '"><span class="mi">' + ico('music') + '</span><b lang="en">' + esc(m.en) + '</b><small>' + esc(m.zh) + '</small></a>';
    });
    h += '</div>';
  }
  h += '<p class="foot">' + T('所有句子都是美国家庭日常真的会说的话。点句子听发音，点“慢速”放慢听。') + '</p>';
  return h;
}

function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function afterHome() { /* 预留 */ }
function setBirth(v) {
  S.birth = v; LS.set('birth', v);
  S.stage = currentStageId(); LS.set('stage', S.stage);
  const a = ageInfo();
  toast(a ? a.text : T('已清除生日'));
}

function logoSvg() {
  return '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M8 7h24a5 5 0 0 1 5 5v12a5 5 0 0 1-5 5H18l-7 6v-6H8a5 5 0 0 1-5-5V12a5 5 0 0 1 5-5z" fill="var(--acc)"/><circle cx="14.5" cy="18" r="2" fill="var(--surface)"/><circle cx="25.5" cy="18" r="2" fill="var(--surface)"/><path d="M15.5 23c1.2 1.3 2.8 2 4.5 2s3.3-.7 4.5-2" stroke="var(--surface)" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
}

// ---------- 场景页 ----------
function pageHead(title, sub, backHref) {
  return '<header class="phead"><a class="back" href="' + (backHref || '#') + '" data-act="back" aria-label="' + T('返回') + '">' + ico('back') + '</a>' +
    '<div class="phead-t"><b>' + title + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</div></header>';
}
function seqBar(quizHref) {
  return '<div class="seqbar"><button id="playall" class="pill" data-act="playall">' + ico('play') + '<span>' + T('全部播放') + '</span></button>' +
    (quizHref ? '<a class="pill" href="' + quizHref + '">' + ico('cards') + '<span>' + T('练一练') + '</span></a>' : '') +
    '<button class="pill toggle' + (S.follow ? ' on' : '') + '" data-act="follow" aria-pressed="' + S.follow + '">' + ico('repeat') + '<span>' + T('跟读') + '</span></button>' +
    '<button class="pill toggle' + (S.slowDefault ? ' on' : '') + '" data-act="slowall" aria-pressed="' + S.slowDefault + '">' + ico('turtle') + '<span>' + T('慢速') + '</span></button></div>';
}
function viewModule(st, mod) {
  const isSong = st.id === 'songs';
  let h = pageHead(esc(mod.zh), '<span lang="en">' + esc(mod.en) + '</span> · ' + (isSong ? T('儿歌') : esc(st.age)));
  h += '<div class="mhero"><span class="mi big">' + ico(mod.icon) + '</span>' + (mod.note ? '<p>' + esc(mod.note) + '</p>' : '<p>' + mod.ps.length + ' ' + T('句') + '</p>') + '</div>';
  h += seqBar(isSong ? '' : '#quiz-' + st.id + '-' + mod.id);
  h += '<div class="list' + (isSong ? ' lyrics' : '') + (S.showZh ? '' : ' nozh') + '">';
  mod.ps.forEach((n, i) => { h += card(D.ps[n], { i }); });
  h += '</div>';
  // 同阶段的下一个场景
  const idx = st.mods.indexOf(mod);
  const next = st.mods[(idx + 1) % st.mods.length];
  if (next && next !== mod) {
    h += '<a class="next" href="#m-' + st.id + '-' + next.id + '"><span>' + T('下一个场景') + '</span><b>' + esc(next.zh) + ' ›</b></a>';
  }
  return h;
}
function easyList(st) {
  const all = [];
  st.mods.forEach(m => m.ps.forEach(n => all.push(D.ps[n])));
  return all.map(p => ({ p, w: words(p.e) })).filter(x => x.w <= 4)
    .sort((a, b) => a.w - b.w || a.p.e.length - b.p.e.length || a.p.n - b.p.n).slice(0, 30).map(x => x.p);
}
function viewEasy(st) {
  const list = easyList(st);
  let h = pageHead(T('新手先学'), esc(st.age) + ' · ' + list.length + ' ' + T('句'));
  h += '<div class="mhero"><span class="mi big">' + ico('star') + '</span><p>' + T('英文不熟也没关系，先从这些最短、最常用的句子开始。每天挑一个场景，只用英文说。') + '</p></div>';
  h += seqBar('#quiz-' + st.id + '-easy');
  h += '<div class="list' + (S.showZh ? '' : ' nozh') + '">';
  list.forEach((p, i) => { h += card(p, { i, crumb: true }); });
  return h + '</div>';
}
function viewGuide(st) {
  let h = pageHead(T('怎么跟宝宝说'), esc(st.age) + ' · ' + esc(st.name));
  h += '<section class="guide"><h2 class="sec">' + T('方法') + '</h2><ol class="how">';
  st.how.forEach(x => { h += '<li>' + esc(x) + '</li>'; });
  h += '</ol>';
  if (st.ms.length) {
    h += '<h2 class="sec">' + T('语言里程碑') + '</h2><ul class="ms">';
    st.ms.forEach(x => { h += '<li><b>' + esc(x[0]) + '</b><span>' + esc(x[1]) + '</span></li>'; });
    h += '</ul><p class="note">' + T('出处：美国疾病控制与预防中心（CDC）“Learn the Signs. Act Early.” 发育里程碑（2022 年版），列的是大多数孩子（约 75%）在这个年龄会做到的事。每个孩子的节奏不同；双语宝宝开口的时间和单语宝宝在同样的范围内，两种语言会的词要加起来算。有疑问请问儿科医生。') + '</p>';
  }
  return h + '</section>';
}

// ---------- 练一练（看中文，自己先说，再看答案） ----------
function quizSource(a, b) {
  if (a === 'saved') return S.favs.map(i => D.byId[i]).filter(Boolean);
  const st = stageById(a);
  if (!st) return null;
  if (b === 'easy') return easyList(st);
  const mod = st.mods.find(x => x.id === b);
  return mod ? mod.ps.map(n => D.ps[n]) : null;
}
let QZ = null;
function viewQuiz(list, a, b) {
  let title;
  if (a === 'saved') title = T('我的收藏');
  else if (b === 'easy') title = T('新手先学');
  else title = esc(stageById(a).mods.find(x => x.id === b).zh);
  QZ = { all: list, title };
  return pageHead(T('练一练'), title + ' · ' + list.length + ' ' + T('句')) + '<div class="quiz" id="quiz" aria-live="polite"></div>';
}
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function startQuiz(list) {
  QZ.list = shuffle(list || QZ.all);
  QZ.i = 0; QZ.shown = false; QZ.miss = [];
  renderQuiz();
}
function renderQuiz(dir) {
  const box = $('#quiz');
  if (!box) return;
  const n = QZ.list.length;
  if (QZ.i >= n) {
    const ok = n - QZ.miss.length;
    box.innerHTML = '<div class="qz-done"><span class="mi big">' + ico(QZ.miss.length ? 'star' : 'medal') + '</span>' +
      '<h2>' + T('练完了！') + '</h2><p>' + T('会了') + ' <b>' + ok + '</b> / ' + n + ' ' + T('句') + '</p>' +
      (QZ.miss.length ? '<button class="pill solid" data-act="qz-again">' + ico('repeat') + '<span>' + T('再练不会的') + ' ' + QZ.miss.length + ' ' + T('句') + '</span></button>' : '') +
      '<button class="pill" data-act="qz-all">' + T('全部重新练') + '</button>' +
      '<a class="pill" href="#" data-act="back">' + T('返回') + '</a></div>';
    return;
  }
  const p = QZ.list[QZ.i];
  let h = '<div class="qz-prog" aria-hidden="true"><span style="transform:scaleX(' + (QZ.i / n) + ')"></span></div>' +
    '<p class="qz-count">' + (QZ.i + 1) + ' / ' + n + '</p>' +
    '<div class="qz-card' + (QZ.shown ? ' shown' : '') + (dir ? ' in' : '') + '" data-n="' + p.n + '">' +
      '<p class="qz-label">' + T('用英文怎么说？') + '</p>' +
      '<p class="qz-zh">' + esc(p.z) + '</p>' +
      '<div class="qz-ans"><p class="qz-en" lang="en">' + esc(p.e) + '</p>' +
        '<div class="qz-tools"><button class="pill" data-act="qz-play">' + ico('play') + '<span>' + T('再听一次') + '</span></button>' +
        '<button class="pill" data-act="qz-slow">' + ico('turtle') + '<span>' + T('慢速') + '</span></button></div>' +
        (p.t ? '<p class="qz-tip">' + esc(p.t) + '</p>' : '') +
      '</div>' +
    '</div>';
  if (!QZ.shown) h += '<p class="qz-hint">' + T('先自己小声说一遍，再看答案。') + '</p><button class="pill solid wide" data-act="qz-show">' + T('看答案') + '</button>';
  else h += '<div class="qz-row"><button class="pill wide" data-act="qz-next" data-k="0">' + T('还不熟') + '</button><button class="pill solid wide" data-act="qz-next" data-k="1">' + T('我会了') + '</button></div>';
  box.innerHTML = h;
}

// ---------- 搜索 ----------
function norm(s) { return s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9㐀-鿿\s]/g, ' ').replace(/\s+/g, ' ').trim(); }
let IDX = null;
function buildIndex() {
  // 另一种字体的数据也放进索引：简体模式下打繁体字也找得到，反过来也一样
  const O = JSON.parse(document.getElementById(S.script === 't' ? 'dataS' : 'dataT').textContent);
  IDX = D.ps.map(p => {
    const st = D.stages[p.s], m = st.mods[p.m];
    const o = O.ps[p.n], ost = O.stages[p.s], om = ost.mods[p.m];
    const alts = (p.a || []).map(a => a[1]).join(' ');
    const en = norm(p.e + ' ' + alts);
    return { p, en, enw: en.split(' '), zh: p.z + ' ' + o.z, tip: ((p.t || '') + ' ' + (o.t || '')).toLowerCase(),
      mod: m.zh + ' ' + m.kw + ' ' + om.zh + ' ' + om.kw + ' ' + m.en.toLowerCase() + ' ' + st.name + ' ' + ost.name };
  });
}
function search(q) {
  if (!IDX) buildIndex();
  const raw = q.trim();
  if (!raw) return [];
  const isZh = /[㐀-鿿]/.test(raw);
  const terms = isZh ? raw.split(/\s+/).filter(Boolean) : norm(raw).split(' ').filter(Boolean);
  const qn = norm(raw);
  const out = [];
  IDX.forEach(x => {
    let score = 0;
    for (const t of terms) {
      let s = 0;
      if (isZh || /[㐀-鿿]/.test(t)) {
        if (x.zh.indexOf(t) >= 0) s = 10;
        else if (x.mod.indexOf(t) >= 0) s = 4;
        else if (x.tip.indexOf(t) >= 0) s = 2;
      } else {
        if (x.enw.indexOf(t) >= 0) s = 10;
        else if (x.enw.some(w => w.indexOf(t) === 0)) s = 7;
        else if (t.length >= 3 && x.en.indexOf(t) >= 0) s = 4;
        else if (x.mod.toLowerCase().indexOf(t) >= 0) s = 3;
        else if (t.length >= 3 && x.tip.indexOf(t) >= 0) s = 1;
      }
      if (!s) return;
      score += s;
    }
    if (!isZh && terms.length > 1 && x.en.indexOf(qn) >= 0) score += 8;
    if (isZh && x.zh.indexOf(raw) >= 0) score += 4;
    if (isZh && x.p.z.indexOf(raw) === 0) score += 2;
    if (D.stages[x.p.s].id === S.stage) score += 1;
    score -= Math.min(3, x.p.e.length / 40);
    out.push({ p: x.p, score });
  });
  out.sort((a, b) => b.score - a.score || a.p.n - b.p.n);
  // 同一句英文（不同场景）只留一次
  const seen = new Set();
  return out.filter(r => { if (seen.has(r.p.i)) return false; seen.add(r.p.i); return true; });
}
function highlighter(q) {
  const raw = q.trim();
  const terms = /[㐀-鿿]/.test(raw) ? raw.split(/\s+/) : norm(raw).split(' ');
  const parts = terms.filter(Boolean).map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!parts.length) return null;
  const re = new RegExp('(' + parts.join('|') + ')', 'gi');
  return (text) => {
    const e = esc(text);
    return e.replace(/(<[^>]+>)|([^<]+)/g, (m0, tag, txt) => tag ? tag : txt.replace(re, '<mark>$1</mark>'));
  };
}
const SUGGEST = () => [T('尿布'), T('喝奶'), T('睡觉'), T('洗澡'), T('哭'), T('爱你'), T('拍嗝'), T('出门'), T('吃饭'), T('生气'), T('谢谢'), 'diaper', 'good night', 'bath', 'hungry', 'love'];
function viewSearch() {
  let h = '<div class="sbox"><label class="sfield">' + ico('search') +
    '<input id="q" type="search" enterkeyhint="search" autocomplete="off" placeholder="' + T('输入中文或英文') + '" value="' + esc(S.q) + '">' +
    '<button class="clear" data-act="clear" aria-label="' + T('清除') + '"' + (S.q ? '' : ' hidden') + '>' + ico('x') + '</button></label>' +
    '<div class="sfilter">' + ['all'].concat(D.stages.map(s => s.id)).map(id => {
      const label = id === 'all' ? T('全部') : (id === 'songs' ? T('儿歌') : stageById(id).age);
      return '<button class="chip' + (S.qStage === id ? ' on' : '') + '" data-act="qstage" data-id="' + id + '">' + esc(label) + '</button>';
    }).join('') + '</div></div><div id="results"></div>';
  return h;
}
function renderResults() {
  const box = $('#results');
  if (!box) return;
  const q = S.q;
  if (!q.trim()) {
    let h = '<div class="empty"><p>' + T('试试这些') + '</p><div class="sugg">';
    SUGGEST().forEach(s => { h += '<button class="chip" data-act="sugg" data-q="' + esc(s) + '"' + (/[a-z]/.test(s) ? ' lang="en"' : '') + '>' + esc(s) + '</button>'; });
    h += '</div>';
    if (S.recent.length) {
      h += '<p>' + T('最近搜索') + '</p><div class="sugg">';
      S.recent.forEach(s => { h += '<button class="chip ghost" data-act="sugg" data-q="' + esc(s) + '">' + esc(s) + '</button>'; });
      h += '</div>';
    }
    box.innerHTML = h + '</div>';
    return;
  }
  let res = search(q);
  if (S.qStage !== 'all') res = res.filter(r => D.stages[r.p.s].id === S.qStage);
  if (!res.length) {
    box.innerHTML = '<div class="empty"><p>' + T('没有找到。换个说法试试，比如用更短的词。') + '</p></div>';
    return;
  }
  const hl = highlighter(q);
  const shown = res.slice(0, 60);
  let h = '<p class="count">' + T('找到') + ' ' + res.length + ' ' + T('句') + (res.length > 60 ? '，' + T('先显示前 60 句') : '') + '</p><div class="list' + (S.showZh ? '' : ' nozh') + '">';
  shown.forEach((r, i) => { h += card(r.p, { crumb: true, hl, i: Math.min(i, 8) }); });
  box.innerHTML = h + '</div>';
}
let searchTimer, recentTimer;
function afterSearch() {
  const q = $('#q');
  renderResults();
  q.addEventListener('input', () => {
    S.q = q.value;
    $('.clear').hidden = !S.q;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(renderResults, 120);
    clearTimeout(recentTimer);
    recentTimer = setTimeout(rememberQuery, 1800);
  });
  q.addEventListener('keydown', e => { if (e.key === 'Enter') { rememberQuery(); q.blur(); } });
  if (!S.q) setTimeout(() => { try { q.focus({ preventScroll: true }); } catch (e) { q.focus(); } }, 60);
}
function rememberQuery() {
  const q = S.q.trim();
  if (!q || !search(q).length) return;
  S.recent = [q].concat(S.recent.filter(x => x !== q)).slice(0, 8);
  LS.set('recent', S.recent);
}

// ---------- 收藏 ----------
function viewSaved() {
  let h = '<header class="ptitle"><h1>' + T('我的收藏') + '</h1>' + (S.favs.length ? '<span>' + S.favs.length + ' ' + T('句') + '</span>' : '') + '</header>';
  const list = S.favs.map(i => D.byId[i]).filter(Boolean);
  if (!list.length) {
    return h + '<div class="empty big"><span class="mi big">' + ico('heart') + '</span><p>' + T('还没有收藏。在任何句子下面点小爱心，就会出现在这里。') + '</p><a class="pill solid" href="#">' + T('去首页看看') + '</a></div>';
  }
  h += seqBar(list.length >= 2 ? '#quiz-saved-all' : '') + '<div class="list' + (S.showZh ? '' : ' nozh') + '">';
  list.forEach((p, i) => { h += card(p, { crumb: true, i: Math.min(i, 8) }); });
  return h + '</div>';
}

// ---------- 我的 ----------
function seg(name, cur, opts) {
  return '<div class="seg" role="radiogroup">' + opts.map(o => '<button role="radio" data-act="set" data-k="' + name + '" data-v="' + o[0] + '" aria-checked="' + (cur === o[0]) + '" class="' + (cur === o[0] ? 'on' : '') + '">' + o[1] + '</button>').join('') + '</div>';
}
function viewMe() {
  const age = ageInfo();
  const today = new Date();
  const max = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
  let h = '<header class="ptitle"><h1>' + T('我的') + '</h1></header>';
  h += '<section class="panel"><h2>' + T('宝宝') + '</h2>' +
    '<label class="row" for="birth"><span>' + T('生日') + '</span><input id="birth" type="date" max="' + max + '" value="' + esc(S.birth) + '"></label>' +
    '<p class="hint">' + (age ? esc(age.text) + ' · ' + T('首页会自动打开') + ' ' + esc(stageById(age.stage).age) + ' ' + T('的内容') : T('填了生日，首页会自动打开适合宝宝年龄的阶段。')) + '</p>' +
    '</section>';
  h += '<section class="panel"><h2>' + T('声音') + '</h2>' +
    '<div class="row"><span>' + T('全部播放时') + '</span>' + seg('follow', String(S.follow), [['false', T('连续播放')], ['true', T('留时间跟读')]]) + '</div>';
  const usingTTS = D.audio.length < D.ps.length;
  if (synth && usingTTS) {
    h += '<label class="row" for="voice"><span>' + T('手机朗读声音') + '</span><select id="voice"><option value="">' + T('自动选择') + '</option>' +
      voices.map(v => '<option value="' + esc(v.voiceURI) + '"' + (v.voiceURI === S.voice ? ' selected' : '') + '>' + esc(v.name) + '</option>').join('') + '</select></label>' +
      '<button class="pill" data-act="testvoice">' + ico('play') + '<span>' + T('试听') + '</span></button>';
  }
  h += '<p class="hint">' + (D.audio.length ? T('有预录美式语音的句子会先播放录音；其他句子用手机自带的美式英语朗读。') : T('目前用手机自带的美式英语朗读。iPhone 建议在“设置 › 辅助功能 › 朗读内容 › 声音 › 英语（美国）”下载 Samantha 或 Ava（增强版），声音会自然很多。')) + '</p></section>';
  h += '<section class="panel"><h2>' + T('显示') + '</h2>' +
    '<div class="row"><span>' + T('外观') + '</span>' + seg('theme', S.theme, [['auto', T('跟随系统')], ['light', T('白天')], ['dark', T('夜间')]]) + '</div>' +
    '<div class="row"><span>' + T('文字') + '</span>' + seg('script', S.script, [['s', '简体'], ['t', '繁體']]) + '</div>' +
    '<div class="row"><span>' + T('中文意思') + '</span>' + seg('showZh', String(S.showZh), [['true', T('显示')], ['false', T('先隐藏')]]) + '</div>' +
    '<p class="hint">' + T('“先隐藏”适合自我练习：看英文想意思，点一下句子再显示。夜里喂奶时可以切到“夜间”，屏幕比较不刺眼。') + '</p></section>';
  h += '<section class="panel"><h2>' + T('离线使用') + '</h2>' +
    '<p class="hint">' + T('把全部录音存到手机里，没有网络也能听（约 14 MB）。') + '</p>' +
    '<button class="pill" id="dl" data-act="download">' + ico('download') + '<span>' + (LS.get('offline', false) ? T('已存好，可以再更新一次') : T('下载全部录音')) + '</span></button>' +
    '<h3>' + T('加到手机主画面') + '</h3>' +
    '<ul class="steps"><li><b>iPhone</b>' + T('用 Safari 打开，点下方的“分享”按钮，再点“加入主画面”。') + '</li>' +
    '<li><b>' + T('安卓') + '</b>' + T('用 Chrome 打开，点右上角 ⋮，再点“加到主屏幕”。') + '</li>' +
    '<li><b>LINE</b>' + T('先点右上角的 ⋮ 或分享，选“用默认浏览器开启”，再照上面的步骤。') + '</li></ul>' +
    '<p class="hint">' + T('加到主画面后，打开就像一个 App，没有网址栏。') + '</p></section>';
  h += '<section class="panel share"><h2>' + T('分享给朋友') + '</h2>' +
    '<div class="qr">' + qrSvg() + '</div>' +
    '<p class="url" lang="en">' + SITE_URL + '</p>' +
    '<div class="seqbar"><button class="pill" data-act="copy">' + ico('copy') + '<span>' + T('复制网址') + '</span></button>' +
    (navigator.share ? '<button class="pill solid" data-act="share">' + ico('share') + '<span>' + T('分享') + '</span></button>' : '') + '</div></section>';
  h += '<section class="panel about"><h2>' + T('给爸妈的话') + '</h2>' +
    '<p>' + T('这个网站是给爸妈用的，不是给宝宝看的。宝宝学语言靠的是跟真人互动：你的声音、表情和回应。') + '</p>' +
    '<p>' + T('英语流利的一方可以多跟宝宝说英语；另一方说中文也很好，宝宝可以同时学会两种语言。也想说英语的一方，先从“新手先学”的短句开始，挑一个固定场景（例如换尿布）只说英文。带口音没关系，重要的是多说、多回应、充满感情。') + '</p>' +
    '<p>' + T('内容原则：只收美国家庭日常真的会说的话，每句附中文意思和使用场合；儿歌只收没有版权的传统儿歌。') + '</p>' +
    '<p class="small">' + T('共') + ' ' + D.main.length + ' ' + T('个年龄阶段') + '、' + D.main.reduce((a, s) => a + s.mods.length, 0) + ' ' + T('个生活场景') + '、' + D.ps.length + ' ' + T('句（含儿歌）') + '。</p></section>';
  return h;
}
function qrSvg() {
  const t = document.getElementById('qr');
  return t ? t.innerHTML : '';
}
async function downloadAll(btn) {
  if (location.protocol === 'file:' || !('caches' in window)) { toast(T('请用网址打开网站再下载')); return; }
  const ids = D.audio.slice();
  let done = 0, failed = 0;
  btn.disabled = true;
  const label = btn.querySelector('span');
  const work = async () => {
    while (ids.length) {
      const id = ids.pop();
      try { const r = await fetch(AUDIO_BASE + id + '.mp3'); if (!r.ok) failed++; else await r.blob(); } catch (e) { failed++; }
      done++;
      if (done % 10 === 0 || !ids.length) label.textContent = T('下载中') + ' ' + done + ' / ' + D.audio.length;
    }
  };
  await Promise.all([work(), work(), work(), work()]);
  btn.disabled = false;
  if (failed) { label.textContent = T('有些没下载到，再点一次'); return; }
  LS.set('offline', true);
  label.textContent = T('全部存好了');
  toast(T('全部录音已存到手机里'));
}

function afterMe() {
  const b = $('#birth');
  if (b) b.addEventListener('change', () => { setBirth(b.value); route(); });
  const v = $('#voice');
  if (v) v.addEventListener('change', () => { S.voice = v.value; LS.set('voice', S.voice); });
}

// ---------- 事件 ----------
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act;
  const pc = el.closest('.pc');
  const p = pc ? D.ps[+pc.dataset.n] : null;
  switch (act) {
    case 'play':
      if (pc && pc.closest('.nozh') && !pc.classList.contains('reveal')) pc.classList.add('reveal');
      if (seq) stopSeq();
      if (pc.classList.contains('playing')) { stopAll(); break; }
      playPhrase(p, false, pc);
      break;
    case 'slow':
      if (seq) stopSeq();
      playPhrase(p, true, pc);
      break;
    case 'alt':
      e.preventDefault();
      if (seq) stopSeq();
      stopAll();
      el.classList.add('playing');
      say(el.dataset.id, el.dataset.text, false).then(() => el.classList.remove('playing'));
      break;
    case 'playn': {
      const q = D.ps[+el.dataset.n];
      const box = el.closest('.today');
      stopAll();
      if (box) box.classList.add('playing');
      say(q.i, q.e, false).then(() => box && box.classList.remove('playing'));
      break;
    }
    case 'more': {
      const open = !pc.classList.contains('open');
      pc.classList.toggle('open', open);
      el.setAttribute('aria-expanded', open);
      break;
    }
    case 'fav': {
      const i = p.i;
      if (isFav(i)) S.favs = S.favs.filter(x => x !== i); else S.favs.unshift(i);
      LS.set('favs', S.favs);
      const on = isFav(i);
      document.querySelectorAll('.pc').forEach(c => {
        if (D.ps[+c.dataset.n].i === i) { const f = c.querySelector('.fav'); f.classList.toggle('on', on); f.setAttribute('aria-pressed', on); }
      });
      el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
      try { if (on && navigator.vibrate) navigator.vibrate(8); } catch (e2) { /* 不支持 */ }
      toast(on ? T('已收藏') : T('已取消收藏'));
      break;
    }
    case 'stage':
      S.stage = el.dataset.id; LS.set('stage', S.stage);
      setAccent(S.stage);
      scrollMem[''] = 0;
      { const y = window.scrollY; route(); window.scrollTo(0, y); }
      break;
    case 'shuffle': {
      S.shuffle = (S.shuffle || 0) + 1;
      const y = window.scrollY;
      const old = $('.today');
      old.classList.add('out');
      setTimeout(() => { route(); window.scrollTo(0, y); }, reduceMotion() ? 0 : 160);
      break;
    }
    case 'playall': {
      const list = [...document.querySelectorAll('.list .pc')].map(c => D.ps[+c.dataset.n]);
      playAll(list);
      break;
    }
    case 'follow':
    case 'slowall': {
      const k = act === 'follow' ? 'follow' : 'slowDefault';
      S[k] = !S[k]; LS.set(k, S[k]);
      el.classList.toggle('on', S[k]); el.setAttribute('aria-pressed', S[k]);
      if (act === 'follow') toast(S[k] ? T('每句之后会停一下，让你跟着说') : T('连续播放'));
      break;
    }
    case 'back':
      if (history.length > 1 && lastFromInside) { e.preventDefault(); history.back(); }
      break;
    case 'qstage':
      S.qStage = el.dataset.id;
      document.querySelectorAll('.sfilter .chip').forEach(c => c.classList.toggle('on', c === el));
      renderResults();
      break;
    case 'sugg': {
      S.q = el.dataset.q;
      const q = $('#q'); q.value = S.q; $('.clear').hidden = false;
      renderResults(); rememberQuery();
      break;
    }
    case 'clear': {
      S.q = ''; const q = $('#q'); q.value = ''; el.hidden = true; renderResults(); q.focus();
      break;
    }
    case 'set': {
      const k = el.dataset.k, v = el.dataset.v;
      const val = v === 'true' ? true : v === 'false' ? false : v;
      S[k] = val; LS.set(k, val);
      if (k === 'theme') applyTheme();
      if (k === 'script') { loadData(); IDX = null; document.documentElement.lang = val === 't' ? 'zh-Hant' : 'zh-Hans'; }
      el.parentNode.querySelectorAll('button').forEach(b => { const on = b === el; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); });
      if (k === 'script') route();
      break;
    }
    case 'qz-show':
      QZ.shown = true; renderQuiz();
      playPhrase(QZ.list[QZ.i], false, $('.qz-card'));
      break;
    case 'qz-play':
    case 'qz-slow':
      playPhrase(QZ.list[QZ.i], act === 'qz-slow', $('.qz-card'));
      break;
    case 'qz-next':
      stopAll();
      if (el.dataset.k === '0') QZ.miss.push(QZ.list[QZ.i]);
      QZ.i++; QZ.shown = false; renderQuiz(1);
      break;
    case 'qz-again': startQuiz(QZ.miss); break;
    case 'qz-all': startQuiz(); break;
    case 'wsave': {
      const v = $('#wbirth').value;
      if (!v) { toast(T('先选宝宝的生日')); break; }
      LS.set('welcomed', true); setBirth(v); setAccent(S.stage); route();
      break;
    }
    case 'wskip':
      LS.set('welcomed', true);
      { const w = $('.welcome'); w.classList.add('out'); setTimeout(() => w.remove(), reduceMotion() ? 0 : 220); }
      break;
    case 'download': downloadAll(el); break;
    case 'copy': {
      const done = () => toast(T('网址已复制'));
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(SITE_URL).then(done, () => selectUrl());
      else selectUrl();
      break;
    }
    case 'share':
      navigator.share({ title: T('宝宝美语 Baby Talk'), text: T('给爸妈用的宝宝美语：0–6 岁地道美国口语，能搜索、能听发音。'), url: SITE_URL }).catch(() => {});
      break;
    case 'testvoice':
      stopAll();
      say('', "Hi sweetie! Mommy loves you so much.", false);
      break;
  }
});

function selectUrl() {
  const u = $('.url');
  if (!u) return;
  const r = document.createRange(); r.selectNodeContents(u);
  const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
  toast(T('网址已选取，长按复制'));
}
// 再点一次当前的标签：回到顶部
document.addEventListener('click', e => {
  const t = e.target.closest('.tab.on');
  if (t && !location.hash.match(/^#(m|easy|guide|quiz)-/)) { e.preventDefault(); window.scrollTo({ top: 0, behavior: reduceMotion() ? 'auto' : 'smooth' }); }
});

let lastFromInside = false;
window.addEventListener('hashchange', () => { lastFromInside = true; route(); });

// ---------- 启动 ----------
loadData();
applyTheme();
document.documentElement.lang = S.script === 't' ? 'zh-Hant' : 'zh-Hans';
S.stage = S.birth ? currentStageId() : LS.get('stage', 's0');
if (!stageById(S.stage) || S.stage === 'songs') S.stage = 's0';
setAccent(S.stage);
route();
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && /github\.io$|^localhost$/.test(location.hostname)) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
}
})();
