#!/usr/bin/env python3
"""宝宝美语：把 content/*.txt 和 src/ 合成一个网页 index.html。

    pip install opencc-python-reimplemented
    python3 tools/build.py                    # 生成 index.html 和 tts/script.json
    python3 tools/build.py --fragment out.html  # 另外生成不带 <head> 的版本（预览用）

同样的输入得到同样的输出。网页里每一句的编号 = 英文句子的 sha1 前 10 位，
所以收藏和录音只跟英文有关；改了英文就是新的一句（要重新录音）。
"""
import argparse, glob, hashlib, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # 网站根目录
SITE_URL = 'https://2377568565.github.io/baby-talk/'
ICONS = None


def pid(en):
    return hashlib.sha1(en.encode('utf-8')).hexdigest()[:10]


def parse(path):
    stages, st, mod = [], None, None
    for n, raw in enumerate(open(path, encoding='utf-8'), 1):
        line = raw.strip()
        if not line or line.startswith('//'):
            continue
        where = f'{os.path.basename(path)}:{n}'
        if line.startswith('# '):
            f = [x.strip() for x in line[2:].split('|')]
            if len(f) != 6:
                sys.exit(f'{where} 阶段行要有 6 栏：编号 | 年龄 | 名称 | 英文名 | 起始月 | 结束月')
            st = {'id': f[0], 'age': f[1], 'name': f[2], 'en': f[3], 'from': int(f[4]), 'to': int(f[5]),
                  'intro': '', 'how': [], 'ms': [], 'mods': []}
            stages.append(st)
            mod = None
        elif line.startswith('## '):
            f = [x.strip() for x in line[3:].split('|')]
            if len(f) != 5:
                sys.exit(f'{where} 场景行要有 5 栏：编号 | 图标 | 中文名 | 英文名 | 搜索关键词')
            if f[1] not in ICONS:
                sys.exit(f'{where} 没有这个图标：{f[1]}（可用：{" ".join(sorted(ICONS))}）')
            mod = {'id': f[0], 'icon': f[1], 'zh': f[2], 'en': f[3], 'kw': f[4], 'note': '', 'ps': []}
            st['mods'].append(mod)
        elif re.match(r'^(intro|how|ms|note):', line):
            key, val = line.split(':', 1)
            val = val.strip()
            if key == 'intro':
                st['intro'] = val
            elif key == 'how':
                st['how'].append(val)
            elif key == 'ms':
                a, b = [x.strip() for x in val.split('|', 1)]
                st['ms'].append([a, b])
            else:
                mod['note'] = val
        else:
            if mod is None:
                sys.exit(f'{where} 句子前面要先有场景行（## 开头）')
            f = [x.strip() for x in line.split('|')]
            if len(f) < 2 or len(f) > 4 or not f[0] or not f[1]:
                sys.exit(f'{where} 句子行格式：英文 | 中文 | 说明 | 其他说法')
            f += [''] * (4 - len(f))
            alts = [a.strip() for a in f[3].split(' / ') if a.strip()]
            mod['ps'].append({'e': f[0], 'z': f[1], 't': f[2], 'a': alts})
    return stages


def load_icons():
    src = open(os.path.join(ROOT, 'src', 'app.js'), encoding='utf-8').read()
    m = re.search(r'const ICONS = \{(.*?)\n\};', src, re.S)
    return set(re.findall(r'^\s*([a-z0-9]+):', m.group(1), re.M))


def build_data(stages, audio):
    ps, seen_mod = [], set()
    out = []
    for si, st in enumerate(stages):
        mods = []
        for mi, m in enumerate(st['mods']):
            key = st['id'] + '/' + m['id']
            if key in seen_mod:
                sys.exit('场景编号重复：' + key)
            seen_mod.add(key)
            idx = []
            for p in m['ps']:
                i = pid(p['e'])
                row = {'i': i, 'e': p['e'], 'z': p['z'], 's': si, 'm': mi}
                if p['t']:
                    row['t'] = p['t']
                if p['a']:
                    row['a'] = [[pid(a), a] for a in p['a']]
                idx.append(len(ps))
                ps.append(row)
            mods.append({'id': m['id'], 'icon': m['icon'], 'zh': m['zh'], 'en': m['en'], 'kw': m['kw'],
                         'note': m['note'], 'ps': idx})
        out.append({k: st[k] for k in ('id', 'age', 'name', 'en', 'from', 'to', 'intro', 'how', 'ms')} | {'mods': mods})
    ids = sorted({p['i'] for p in ps} | {a[0] for p in ps for a in p.get('a', [])})
    have = [i for i in ids if i in audio]
    return {'stages': out, 'ps': ps, 'audio': have}


def script_json(data):
    s = {}
    for p in data['ps']:
        s[p['i']] = p['e']
        for i, a in p.get('a', []):
            s[i] = a
    return dict(sorted(s.items()))


def qr_svg(url):
    import qrcode
    q = qrcode.QRCode(border=0, error_correction=qrcode.constants.ERROR_CORRECT_M)
    q.add_data(url)
    q.make()
    m = q.get_matrix()
    n = len(m)
    d = ''.join(f'M{x} {y}h1v1h-1z' for y, row in enumerate(m) for x, v in enumerate(row) if v)
    return (f'<svg viewBox="0 0 {n} {n}" role="img" aria-label="网址二维码" shape-rendering="crispEdges">'
            f'<path fill="#2A2540" d="{d}"/></svg>')


def js_json(obj):
    return json.dumps(obj, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')


def main():
    global ICONS
    ap = argparse.ArgumentParser()
    ap.add_argument('--fragment', help='另外输出不带 <head> 的网页（预览用）')
    args = ap.parse_args()
    import opencc
    cc = opencc.OpenCC('s2twp')

    ICONS = load_icons()
    stages = []
    for f in sorted(glob.glob(os.path.join(ROOT, 'content', '*.txt'))):
        stages += parse(f)
    audio_idx = os.path.join(ROOT, 'audio', 'index.json')
    audio = set(json.load(open(audio_idx))) if os.path.exists(audio_idx) else set()
    data = build_data(stages, audio)

    # 繁体：整份数据用 OpenCC（台湾用语）转换；界面文字是 app.js 里所有 T('…') 的字串
    data_s = js_json(data)
    tw = lambda x: cc.convert(x).replace('“', '「').replace('”', '」')  # 台湾习惯用「」
    data_t = tw(data_s)
    app = open(os.path.join(ROOT, 'src', 'app.js'), encoding='utf-8').read()
    ui = {}
    for s in sorted(set(re.findall(r"T\('([^']*)'\)", app))):
        t = tw(s)
        if t != s:
            ui[s] = t
    css = open(os.path.join(ROOT, 'src', 'style.css'), encoding='utf-8').read()
    qr = qr_svg(SITE_URL)
    shell = open(os.path.join(ROOT, 'src', 'shell.html'), encoding='utf-8').read()

    body = (shell.replace('/*STYLE*/', css)
            .replace('/*DATA_S*/', data_s)
            .replace('/*DATA_T*/', data_t)
            .replace('/*UI_T*/', js_json(ui))
            .replace('/*QR*/', qr)
            .replace('/*APP*/', app))
    head = ('<!doctype html>\n<html lang="zh-Hans">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
            '<meta name="theme-color" content="#F6F3FA" media="(prefers-color-scheme: light)">\n'
            '<meta name="theme-color" content="#14121D" media="(prefers-color-scheme: dark)">\n'
            '<meta name="apple-mobile-web-app-capable" content="yes">\n'
            '<meta name="description" content="给爸妈用的宝宝美语：0–6 岁每个阶段、每个生活场景，地道的美国口语，能搜索、能听发音。">\n'
            '<meta name="apple-mobile-web-app-title" content="宝宝美语">\n'
            '<meta name="apple-mobile-web-app-status-bar-style" content="default">\n'
            f'<link rel="canonical" href="{SITE_URL}">\n'
            '<link rel="manifest" href="manifest.webmanifest">\n'
            '<link rel="icon" href="icon.svg" type="image/svg+xml">\n'
            '<link rel="apple-touch-icon" href="icon-180.png">\n'
            '<meta property="og:type" content="website">\n'
            '<meta property="og:site_name" content="宝宝美语 Baby Talk">\n'
            '<meta property="og:title" content="宝宝美语 Baby Talk｜0–6 岁地道美国口语">\n'
            '<meta property="og:description" content="给爸妈用的宝宝英语：按年龄和生活场景整理的美国日常口语，能搜索、能听美式发音。">\n'
            f'<meta property="og:url" content="{SITE_URL}">\n'
            f'<meta property="og:image" content="{SITE_URL}og.png">\n'
            '<meta property="og:image:width" content="1200">\n'
            '<meta property="og:image:height" content="630">\n'
            '<meta name="twitter:card" content="summary_large_image">\n')
    full = head + body.replace('<!--HEAD_END-->', '</head>\n<body>') + '\n</body>\n</html>\n'
    open(os.path.join(ROOT, 'index.html'), 'w', encoding='utf-8').write(full)

    os.makedirs(os.path.join(ROOT, 'tts'), exist_ok=True)
    with open(os.path.join(ROOT, 'tts', 'script.json'), 'w', encoding='utf-8') as f:
        json.dump(script_json(data), f, ensure_ascii=False, indent=0)
        f.write('\n')
    n_audio = len(data['audio'])
    if args.fragment:  # 预览版不带录音文件，全部用手机自带的朗读
        data['audio'] = []
        frag = (shell.replace('/*STYLE*/', css).replace('/*DATA_S*/', js_json(data))
                .replace('/*DATA_T*/', tw(js_json(data))).replace('/*UI_T*/', js_json(ui)).replace('/*QR*/', qr).replace('/*APP*/', app))
        open(args.fragment, 'w', encoding='utf-8').write(frag.replace('<!--HEAD_END-->', ''))

    n = len(data['ps'])
    nm = sum(len(s['mods']) for s in data['stages'])
    print(f'{len(data["stages"])} 个阶段，{nm} 个场景，{n} 句；有录音 {n_audio} 句；网页 {len(full) // 1024} KB')


if __name__ == '__main__':
    main()
