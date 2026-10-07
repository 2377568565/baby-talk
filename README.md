# 宝宝美语 Baby Talk

**网址：https://2377568565.github.io/baby-talk/**

给爸妈用的宝宝英语口语网站：0–6 岁分成 5 个年龄阶段，每个阶段按生活场景（喂奶、换尿布、洗澡、哄睡……）整理地道的美国口语，
每句有中文意思、使用场合说明，能搜索、能听发音、能收藏。另有 20 首没有版权的传统英文儿歌。手机优先。

## 文件
| 路径 | 内容 |
|---|---|
| `content/*.txt` | **全部句子**（按阶段一个文件，改内容只改这里） |
| `src/` | 网页外框 `shell.html`、样式 `style.css`、程序 `app.js` |
| `tools/build.py` | 把内容和程序合成 `index.html`（同样输入得到同样输出） |
| `tools/tts.py` | 用开源语音模型 Kokoro（美式女声 af_heart）给句子录音 |
| `index.html` | 生成好的网站（不要手改） |
| `sw.js`、`manifest.webmanifest` | 离线缓存、加到主画面 |
| `tools/images.js` | 生成图标和分享预览图 `og.png` |
| `tts/script.json` | 要录音的句子清单（生成的） |
| `audio/` | 录好的 MP3 和 `index.json`（由 GitHub Actions 生成） |

## 改内容
`content/*.txt` 的格式：

```
# 阶段编号 | 年龄 | 名称 | 英文名 | 起始月 | 结束月
intro: 阶段简介
how: 方法（可多行）
ms: 里程碑年龄 | 内容（可多行）

## 场景编号 | 图标 | 中文名 | 英文名 | 搜索关键词（空格隔开）
note: 场景说明（可省）
英文句子 | 中文意思 | 地道说明（可空） | 其他说法（可空，多个用 / 隔开）
```

- `//` 开头的行是注释。图标名称见 `src/app.js` 里的 `ICONS`。
- 收藏和录音都按“英文句子”识别：改了英文就算新的一句，会重新录音；只改中文或说明不影响。

改完运行：

```
pip install opencc-python-reimplemented qrcode
python3 tools/build.py
```

推送后，如果 `tts/script.json` 有变化，`.github/workflows/tts.yml` 会自动给新句子录音，并重新生成 `index.html` 提交回来。

## 朗读
有录音的句子播放 MP3（微信、LINE 里也能听）；还没录音的句子用手机自带的美式英语朗读（Safari、Chrome 可以，部分 App 内置浏览器不行）。
慢速 = 录音 0.72 倍速。

## 繁体
“我的 › 文字”可以切换简体、繁體。繁体由 OpenCC（台湾用语）在生成时自动转换。
