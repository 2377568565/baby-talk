#!/usr/bin/env python3
"""宝宝美语：把 tts/script.json 里还没有录音的句子，用开源语音模型 Kokoro（美式女声 af_heart）合成 MP3。

在 GitHub Actions 里运行（.github/workflows/baby-tts.yml），需要下载模型，CPU 即可。
    python3 tools/tts.py            # 只录缺的；英文改过的句子编号会变，就会重录
    python3 tools/tts.py --all      # 全部重录（换声音时用）
输出 audio/<编号>.mp3 和 audio/index.json（已录好的编号列表）。
"""
import argparse, json, os, subprocess, sys, time
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'audio')
VOICE = 'af_heart'
SPEED = 0.95
SR = 24000


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--all', action='store_true')
    args = ap.parse_args()
    script = json.load(open(os.path.join(ROOT, 'tts', 'script.json'), encoding='utf-8'))
    os.makedirs(OUT, exist_ok=True)
    todo = {i: t for i, t in script.items() if args.all or not os.path.exists(os.path.join(OUT, i + '.mp3'))}
    print(f'共 {len(script)} 句，要录 {len(todo)} 句', flush=True)

    if todo:
        import torch
        from kokoro import KPipeline
        torch.set_num_threads(os.cpu_count() or 4)
        pipe = KPipeline(lang_code='a', repo_id='hexgrad/Kokoro-82M')
        t0 = time.time()
        pad = np.zeros(int(SR * 0.08), np.float32)
        for n, (i, text) in enumerate(sorted(todo.items()), 1):
            parts = [r.audio.numpy() for r in pipe(text, voice=VOICE, speed=SPEED) if r.audio is not None]
            if not parts:
                print('没有声音：', i, text)
                continue
            a = np.concatenate([pad] + parts + [pad])
            a = np.clip(a / max(1e-3, np.abs(a).max()) * 0.89, -1, 1)
            pcm = (a * 32767).astype('<i2').tobytes()
            subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-',
                            '-c:a', 'libmp3lame', '-b:a', '48k', os.path.join(OUT, i + '.mp3')], input=pcm, check=True)
            if n % 50 == 0:
                print(f'{n}/{len(todo)}  {time.time() - t0:.0f} 秒', flush=True)

    # 删掉已经不用的录音（英文改过或删掉的句子）
    for f in os.listdir(OUT):
        if f.endswith('.mp3') and f[:-4] not in script:
            os.remove(os.path.join(OUT, f))
    have = sorted(f[:-4] for f in os.listdir(OUT) if f.endswith('.mp3'))
    json.dump(have, open(os.path.join(OUT, 'index.json'), 'w'), separators=(',', ':'))
    print(f'已录好 {len(have)} 句')


if __name__ == '__main__':
    sys.exit(main())
