# 宝宝美语 Baby Talk —— 项目说明（给 Claude 看）

- 网址：https://2377568565.github.io/baby-talk/ ，GitHub Pages 从 `main` 分支根目录发布。
- 用户：在台湾的一对新手爸妈（宝宝 2026-08 出生）。太太英语流利，先生英语基础弱。用户习惯简体中文，不是程序员：回答用白话、给结果。
- 最重要的要求：英文必须是地道的美国日常口语。不确定的说法不收。儿歌只收公有领域的传统儿歌。
- 手机优先（320/360/390 宽度不能横向超出；白天、夜间都要看）。
- 内容只改 `content/*.txt`，然后 `python3 tools/build.py`（需要 `pip install opencc-python-reimplemented qrcode`）；`index.html` 不要手改。格式见 README.md。
- 改了英文句子，推送后 `.github/workflows/tts.yml` 会用 Kokoro 美式女声 af_heart 补录音并重新生成 `index.html`，推送前先 `git pull`。
- 提交说明用中文；代码和提交里不写模型名。
- 账号同步（2026-10-07 加，照搬学课网站的做法）：账号+密码，本机 PBKDF2 派生钥匙，AES-GCM 加密后经中转站 ntfy（频道 `bbtalk-42eaff1a6300df13`）送出，
  `.github/workflows/sync.yml` 每 30 分钟验签后存进 `data/sync.json`（只有密文）。同步：宝宝生日、收藏、设置。忘记密码无法找回。
  规则在 `tools/sync_core.js`（网页和同步任务共用），同步脚本 `tools/sync.js`。本机测试要用模拟中转站（localStorage `bt.devRelay`），测试数据绝不推到线上。
