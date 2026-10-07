# 宝宝美语 Baby Talk —— 项目说明（给 Claude 看）

- 网址：https://2377568565.github.io/baby-talk/ ，GitHub Pages 从 `main` 分支根目录发布。
- 用户：在台湾的一对新手爸妈（宝宝 2026-08 出生）。太太英语流利，先生英语基础弱。用户习惯简体中文，不是程序员：回答用白话、给结果。
- 最重要的要求：英文必须是地道的美国日常口语。不确定的说法不收。儿歌只收公有领域的传统儿歌。
- 手机优先（320/360/390 宽度不能横向超出；白天、夜间都要看）。
- 内容只改 `content/*.txt`，然后 `python3 tools/build.py`（需要 `pip install opencc-python-reimplemented qrcode`）；`index.html` 不要手改。格式见 README.md。
- 改了英文句子，推送后 `.github/workflows/tts.yml` 会用 Kokoro 美式女声 af_heart 补录音并重新生成 `index.html`，推送前先 `git pull`。
- 提交说明用中文；代码和提交里不写模型名。
