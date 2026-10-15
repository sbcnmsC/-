# Lexicon Brawl · 像素背词大乱斗

像素风雅思单词游戏：奖励成长 + 艾宾浩斯复习 + 错题集 + 自动发音 + 多人血条对战。纯静态页面，无需构建，打开 `index.html` 即可使用。

## 功能

**学习**
- 奖励反馈：XP、连击加成、升级、每日目标、连续打卡、成就徽章
- 艾宾浩斯复习：5 分钟 → 30 分钟 → 12 小时 → 1 天 → 2 天 → 4 天 → 7 天 → 15 天，答错回到起点
- 干扰项自动排除语义相近的选项（如 impact / influence 都含“影响”），洗牌使用 Fisher–Yates；做完一轮可点“再来一轮”
- 错题集：自动收录（含对战中答错的词），同一词连续答对 3 次后移出，可单独练习
- 例句与发音：切词自动发音，可设为 单词 / 例句 / 两者 / 关闭；答对答错有 8-bit 音效，可关闭
- 手机优化：大点击区域、安全区适配、震动反馈

**对战（2–8 人，房主选对决或组队）**
- 血条取代分数：答对攻击、答错或超时反噬 6 HP，队伍血量归零即出局
- 每个单词独立倒计时（默认 10 秒），切词重置
- 11 种道具（连击 3 次必掉，血量低于 35% 时掉率提高，最多持有 3 个）
  - 干扰：迷雾、黑屏、冻结、镜像（单词倒写）、乱码（元音变 *）、限时（只剩 4 秒）、炸弹
  - 增益：护盾、治疗、双倍、净化
- 对决模式点击对手可锁定攻击目标；组队为红蓝两队共享血条
- 开战 3-2-1 同步倒计时；结算显示答对、答错、最高连击与正确率
- 对手断线不会让已造成的伤害消失；护盾计时不依赖设备时钟

## 目录

```
index.html        页面结构
style.css         样式（主题变量、像素组件、手机适配）
words.js          词库，格式 ["单词","词性","释义","例句"]
net.js            联机传输层（PeerJS 星型转发，供 GitHub Pages / 本地使用）
app.js            全部逻辑（学习 / 计划 / 对战）
tools/bundle.py   合并为单个 HTML：python3 tools/bundle.py → dist/lexicon-brawl.html
dist/             合并后的单文件版本（可直接用于 Claude 页面发布）
tests/            自动化测试（jsdom，模拟多人对战、联机、学习逻辑）
```

## 部署到 GitHub Pages

1. 推送到仓库后打开 **Settings → Pages**
2. Source 选 `Deploy from a branch`，分支 `main`，目录 `/ (root)`
3. 访问 `https://<你的用户名>.github.io/<仓库名>/`

## 本地运行

```bash
python3 -m http.server 8000   # 然后打开 http://localhost:8000
```

学习进度保存在浏览器 `localStorage`，换设备或清除数据会丢失。

## 关于联机

- **Claude 发布页**：使用内置 `room` 能力同步（presence 里放伤害计数、护盾和道具事件）。
- **GitHub Pages / 本地**：自动改用 `net.js` 的 PeerJS（WebRTC）星型转发。先输入房间号的人成为房主，其他人连接房主；**房主离开则房间关闭**。依赖 jsDelivr 加载 PeerJS 以及 PeerJS 公共信令服务器，网络受限（如部分国内网络）时可能连不上。想更稳可以自建 [PeerServer](https://github.com/peers/peerjs-server)，在 `net.js` 里给 `new Peer()` 传入 `host/port` 即可。
- 战斗逻辑只依赖 `peers()` / `presence(patch)` / `onPeers(fn)` 三个接口，可替换为其他实时后端。

## 测试

```bash
npm install && npm test
```

覆盖：3 人混战与 2v2 组队、护盾/冻结/治疗、超时、断线、结算与重开、同义干扰项、洗牌均匀性、PeerJS 房主转发（使用模拟 PeerJS，未经真实 WebRTC 验证）。

## 说明

- 示例词库 48 个，选自高频词表，释义与例句为自编
- 头像与道具图标是代码绘制的 8×8 像素图，无外部图片
- 字体用 Google Fonts（DotGothic16 / Press Start 2P），离线时自动回退到系统字体

## License

MIT
