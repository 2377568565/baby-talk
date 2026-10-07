/* 宝宝美语：账号同步的共同规则（网页和 GitHub 同步任务用同一份，做法和学课网站一样）
   每条消息 = {p: 内容(JSON 字符串), s: 签名}。内容里带发消息那台设备的公钥 pk，身份码 uid = sha256(pk) 前 32 位。
   签名对得上才算数，所以别人冒充不了、改不了你的数据。时间一律用中转站（ntfy）的服务器时间。
   u：注册账号（账号编号 aid → 身份码 + 用密码加密的身份钥匙）
   w：写一格同步数据（用密码加密的密文；只有账号本人能写） */
(function (root) {
  var C = (typeof globalThis !== 'undefined' && globalThis.crypto) || root.crypto;
  var ID = /^[uw]_[0-9a-f]{10,24}$/;
  function b64u(buf) { var s = '', a = new Uint8Array(buf); for (var i = 0; i < a.length; i++) s += String.fromCharCode(a[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function unb64u(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; var b = atob(s), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
  function enc(s) { return new TextEncoder().encode(s); }
  function hex(buf) { return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); }
  function uidOf(pk) { return C.subtle.digest('SHA-256', enc(pk)).then(function (h) { return hex(h).slice(0, 32); }); }
  function rid(prefix) { var a = new Uint8Array(10); C.getRandomValues(a); return prefix + '_' + hex(a); }

  function open(msg) {
    try {
      var m = typeof msg === 'string' ? JSON.parse(msg) : msg;
      if (!m || typeof m.p !== 'string' || typeof m.s !== 'string' || m.p.length > 3500) return Promise.resolve(null);
      var P = JSON.parse(m.p);
      if (!P || P.v !== 1 || typeof P.pk !== 'string' || P.pk.length > 200 || !ID.test(P.id || '')) return Promise.resolve(null);
      var xy = P.pk.split('.'); if (xy.length !== 2) return Promise.resolve(null);
      return C.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: xy[0], y: xy[1], ext: true }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify'])
        .then(function (k) { return C.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, k, unb64u(m.s), enc(m.p)); })
        .then(function (ok) { return ok ? uidOf(P.pk).then(function (u) { return { P: P, uid: u }; }) : null; })
        .catch(function () { return null; });
    } catch (e) { return Promise.resolve(null); }
  }
  function norm(S) { S.v = 1; S.seen = S.seen || {}; S.accounts = S.accounts || {}; S.vault = S.vault || {}; S.last = S.last || 0; return S; }
  function apply(S, P, uid, t) {
    norm(S);
    if (P.op === 'u') {   // 同一个身份可以重新提交（以后改密码用）；别人的账号名不能抢
      if (!/^[0-9a-f]{32}$/.test(P.aid || '') || typeof P.ek !== 'string' || P.ek.length > 1600 || !/^[A-Za-z0-9_-]+$/.test(P.ek)) return 'bad';
      var ac = S.accounts[P.aid];
      if (ac && ac.uid !== uid) return 'taken';
      S.accounts[P.aid] = { uid: uid, ek: P.ek, ts: t }; return '';
    }
    if (P.op === 'w') {   // 每格一段密文；空内容表示删除这一格
      var a2 = S.accounts[P.aid]; if (!a2) return 'noacct'; if (a2.uid !== uid) return 'notyours';
      if (!/^[0-9a-f]{16}$/.test(P.slot || '') || typeof P.d !== 'string' || P.d.length > 2900 || !/^[A-Za-z0-9_-]*$/.test(P.d)) return 'bad';
      var V = S.vault[P.aid] || (S.vault[P.aid] = {});
      if (!P.d) { delete V[P.slot]; return ''; }
      if (!V[P.slot] && Object.keys(V).length >= 500) return 'limit';
      V[P.slot] = { d: P.d, ts: t }; return '';
    }
    return 'bad';
  }
  /* 把中转站里的新消息（按时间顺序）合进数据。msgs: [{id, time(秒), event, message}] */
  function merge(S, msgs) {
    norm(S);
    msgs = msgs.filter(function (m) { return m && m.event === 'message' && typeof m.message === 'string' && !S.seen[m.id]; })
      .sort(function (a, b) { return a.time - b.time || (a.id < b.id ? -1 : 1); });
    var out = [];
    return msgs.reduce(function (chain, m) {
      return chain.then(function () { return open(m.message); }).then(function (r) {
        S.seen[m.id] = m.time; if (m.time > S.last) S.last = m.time;
        var why = r ? apply(S, r.P, r.uid, m.time * 1000) : 'sig';
        out.push({ id: m.id, why: why });
      });
    }, Promise.resolve()).then(function () { return out; });
  }
  /* 这台设备的身份钥匙：第一次用时生成，存在这台设备上 */
  function keys(store) {
    var j = null; try { j = JSON.parse(store.get('sk') || 'null'); } catch (e) { /* 坏了就重建 */ }
    var ready = j && j.d && j.x && j.y
      ? C.subtle.importKey('jwk', j, { name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign']).then(function (k) { return { k: k, pk: j.x + '.' + j.y }; })
      : C.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']).then(function (kp) {
        return C.subtle.exportKey('jwk', kp.privateKey).then(function (jw) {
          store.set('sk', JSON.stringify({ kty: 'EC', crv: 'P-256', x: jw.x, y: jw.y, d: jw.d }));
          return { k: kp.privateKey, pk: jw.x + '.' + jw.y };
        });
      });
    return ready.then(function (K) { return uidOf(K.pk).then(function (u) { K.uid = u; return K; }); });
  }
  function sign(K, P) {
    P.v = 1; P.pk = K.pk; P.t = Date.now(); var p = JSON.stringify(P);
    return C.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, K.k, enc(p)).then(function (sig) { return JSON.stringify({ p: p, s: b64u(sig) }); });
  }
  root.BTSync = { open: open, apply: apply, merge: merge, norm: norm, keys: keys, sign: sign, rid: rid, b64u: b64u, unb64u: unb64u, enc: enc, hex: hex };
})(typeof module !== 'undefined' && module.exports ? module.exports : this);
