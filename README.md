# 东方幻存神签 · 博丽神社御神签

依据工作区中的《本书使用方法》第 2–3 页制作的一键抽签程序。完整内置 128 番神签原页与全书 18 页漫画，采用纸张、墨色与朱印的图形风格，无第三方前端依赖。四种抽签动画均由 **Blender 5.3** 制作并渲染为透明 3D 序列帧，再由 Canvas 按本次结果实时播放。

![抽签首页](docs/preview-home.webp)

| 抽签结果 | 漫画阅读器 |
| --- | --- |
| ![抽签结果](docs/preview-result.webp) | ![漫画阅读器](docs/preview-reader.webp) |

![手机端抽签页](docs/preview-mobile.webp)

## 启动

直接双击 `index.html` 即可打开。若需要在本机或同一局域网内的手机上访问，推荐启动本地服务：

```powershell
node serve.mjs
# 打开 http://127.0.0.1:4173
```

需要让手机访问时，在项目目录运行：

```powershell
npm run start:lan
# 或
node serve.mjs --lan
```

终端会列出类似 `http://192.168.1.23:4173` 的局域网地址。然后：

1. 让手机和电脑连接同一个 Wi-Fi / 局域网。
2. 在手机浏览器中打开终端列出的地址（不要用 `127.0.0.1`）。
3. 如果打不开，允许 Windows 防火墙中的 Node.js 入站访问，并确认路由器没有开启 AP 隔离。

普通本机预览仍可用 `npm start`；不需要安装任何前端依赖。

## 四种抽签方式

| 方式 | 书页规则 | 程序实现 |
| --- | --- | --- |
| 硬币法 | 七枚硬币依次对应 64、32、16、8、4、2、1；正面取数、反面记 0，相加后加 1 | Blender 金属硬币抛掷、翻面动画；七枚硬币按各自结果落到正/裏，最后求和 |
| 八面骰 | 掷三次八面骰；首掷奇数记 0、偶数记 64，第二掷 ×8，第三掷 −8 | Blender 八面体骰抛起、翻滚、落桌；每个结果对应单独的落定朝向 |
| 六面骰 | 第一掷 ×36 + 第二掷 ×6 + 第三掷 −42；不在 1–128 之间就整组重掷 | Blender 3D 六面骰抛掷、弹跳、落定；越界自动重掷并显示重掷次数 |
| 签箱法 | 从 128 支签中直接抽出一支 | Blender 签箱与签纸动画，签纸抽出后叠印本次签号 |

![骰子落定](docs/preview-dice.webp)

书中还特别注明：三次六面骰无法保证每个签号概率完全均等。程序忠实保留了这一规则与提示。

## 功能

- **一键抽签**：固定的主按钮；四种抽签动画均为 Blender 渲染的真实 3D 画面，随机结果决定最终朝向。
- **方式切换**：四张方式卡，支持鼠标、触屏和方向键切换。
- **结果展示**：原页神签大图、签号、角色名，以及文字版完整签文（称号、能力、诗句、全部运势栏目，不含原书评价）；点击签图可直接放大查看原页，支持鼠标、触屏和键盘。原图灯箱支持鼠标滚轮缩放、拖动查看、双击还原。可复制完整签文、再抽一签。已移除“此次签如何得来”算式区和独立的“查看原页大图”按钮。
- **签历**：抽签结果写入 `localStorage`，最多保留 30 条；可随时翻阅或清空。
- **漫画阅读器**：本篇漫画 12 页 + 特别篇 6 页，支持方向键、左右滑动、缩略图跳转、全屏和原图打开。
- **签库**：128 签缩略图索引，可按编号或角色名搜索，也可“随手翻一签”；点击任意签可在结果中查阅文字签文。
- **页底**：保留原页底品牌、制作说明与「使用方法」，新增 `Cooloon` 与 `吃不飽汉化组` 的 Bilibili 链接及图片来源声明。
- **声音与无障碍**：用 Web Audio 合成的硬币、骰子、签箱与揭签音效；可关闭；支持 `prefers-reduced-motion`、键盘操作和跳转链接。
- **手机端适配**：底部三栏导航、刘海屏安全区、动态视口高度、44px 以上触控区、搜索框 16px 防 iOS 缩放；签台自带圆形「摇签」按钮，四种抽签方式改为四宫格切换条，不再使用大卡片外壳。已测试 320 / 360 / 375 / 390 / 414px 宽度及横屏。

## Blender 3D 动画

- 4 个场景：七枚硬币、八面体骰、六面骰、御神签箱。
- 17 条独立动画：硬币 2 种落面、六面骰 6 种点数、八面骰 8 种点数、签箱 1 条。
- Blender 导出透明 PNG 序列，再打包成带 Alpha 的 WebP 精灵图；网页按抽签结果选择对应动画，使用 Canvas 播放，避免额外 3D 运行时依赖。
- 精灵图位于 `app/assets/3d/`，播放器在 `app/blender-scenes.js`，构建脚本在 `tools/blender/`。

重新生成全部 3D 动画：

```powershell
& "C:\Program Files\Blender Foundation\Blender 5.3\blender.exe" -b --python tools/blender/build_mikuji_3d.py
python tools/build_sprite_sheets.py
```

如果只修改了一类动画，可以加 `-- --only=d6`、`-- --only=d8`、`-- --only=coin` 或 `-- --only=box` 只重建对应部分。

## 文件结构

```text
.
├─ index.html                 页面骨架
├─ app/
│  ├─ data.js                 自动生成的 128 签、4 种方式、漫画数据
│  ├─ core.js                 纯逻辑抽签核心（无 DOM，可直接移植）
│  ├─ app.js                  交互、阅读器、签历
│  ├─ blender-scenes.js       Blender 精灵图 Canvas 播放器
│  ├─ 3d-data.js              自动生成的 3D 动画索引
│  ├─ styles.css              视觉系统与响应式布局
│  ├─ favicon.svg
│  └─ assets/
│     ├─ cards/001–128.webp   签库缩略图
│     ├─ comics/*.webp        漫画缩略图
│     ├─ 3d/*.webp            Blender 透明动画精灵图
│     └─ source/
│        ├─ cards/            128 张签图原页（第N番 *.png）
│        └─ book/             37 张书页/漫画原图（P*.png）
├─ docs/                      展示截图
├─ tools/
│  ├─ generate_data.py        从 source 图片生成 app/data.js
│  ├─ build_assets.py         从 source 生成缩略图
│  ├─ build_sprite_sheets.py  打包 Blender 序列帧
│  └─ blender/
│     └─ build_mikuji_3d.py   建模、关键帧与 Blender 渲染
├─ wechat-minigame/           微信小游戏版
├─ serve.mjs                  零依赖静态服务器
└─ MINIPROGRAM.md             微信小程序移植说明
```

原始书籍扫描图统一收在 `app/assets/source/`：签图在 `cards/`，书页与漫画在 `book/`，根目录不再散落图片。程序直接引用原图以获得完整清晰度；`app/assets` 中的缩略图仅用于封面、索引和阅读器缩略条。

## 重新生成数据与缩略图

修改原始图片文件名后，用带 Pillow 的 Python 环境执行：

```powershell
python tools/generate_data.py
python tools/build_assets.py
```

生成脚本会校验 128 张签图是否齐全。

## 移植到微信小程序

抽签逻辑与数据已与页面分离，且 `app/core.js` 使用 UMD 包装，可直接通过 `require` 在小程序中复用。具体目录映射、包体限制、图片 CDN 与动画替代方案见 [MINIPROGRAM.md](MINIPROGRAM.md)。

## 说明

- 本项目只读取工作区内的书籍图片，不包含外部网络请求、统计或追踪。
- 音效由振荡器实时合成，不依赖音频文件。
- 签文内容的解释权归原书所有；程序仅做抽签与阅览用途。
