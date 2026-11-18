# 微信小程序移植说明

当前版本是纯前端网页，但已按“数据 / 逻辑 / 视图”分层设计。移植时不需要重写抽签算法，核心工作是替换 DOM 操作、拆包图片并改写动画。

## 1. 可直接复用的部分

| 现有文件 | 小程序对应 | 说明 |
| --- | --- | --- |
| `app/core.js` | `miniprogram/utils/mikuji-core.js` | UMD 包装，可直接 `require('./mikuji-core.js')`；需保证其 `require('./data.js')` 路径正确 |
| `app/data.js` | `miniprogram/data/mikuji-data.js` | 把 `root.MikujiData = api` 改为 `module.exports = api`，或继续使用现有 UMD 判断 |
| `tools/generate_data.py` | 构建脚本 | 修改输出路径即可复用；建议把图片字段改为 CDN 地址 |
| 128 签规则与文案 | 保持不变 | 硬币、八面骰、六面骰、签箱四种算法均已独立 |

示例：

```js
// miniprogram/pages/draw/draw.js
const core = require('../../utils/mikuji-core.js');

Page({
  data: { method: 'coin', drawing: false },
  onDraw() {
    const result = core.draw(this.data.method);
    const description = core.describe(result);
    const fortune = core.getFortune(result.number);
    wx.vibrateShort({ type: 'light' });
    this.setData({ drawing: false, result, fortune, description });
  }
});
```

## 2. 建议目录

```text
miniprogram/
├─ app.js
├─ app.json
├─ app.wxss
├─ data/mikuji-data.js
├─ utils/mikuji-core.js
├─ pages/
│  ├─ draw/          抽签首页（方式切换、动画、结果）
│  ├─ comics/        漫画合集
│  ├─ reader/        漫画阅读器
│  └─ archive/       128 签索引与搜索
├─ components/
│  ├─ fortune-card/  结果签纸
│  ├─ coin-toss/     硬币动画
│  ├─ dice-toss/     八面骰 / 六面骰动画
│  └─ omikuji-box/   签箱动画
└─ assets/
   └─ thumbs/        只放缩略图，原页走 CDN
```

## 3. 包体与图片策略

工作区中 128 张签图原图约 180 MB，18 页漫画原图约 30 MB，不能直接放进小程序包。建议：

1. **缩略图随包**：`app/assets/cards` 与 `app/assets/comics` 合计约 2 MB，可作为签库、漫画缩略条和封面。
2. **神签原页放 CDN**：例如 `https://cdn.example.com/mikuji/cards/001.webp`，按需加载；小程序主包与分包都不放 128 张原图。
3. **首屏只加载必要资源**：首页封面约 120 KB，四种模式的图标用 CSS 绘制，不引额外图片。
4. 若必须离线内置，可把 128 签拆成多个分包或使用“首次抽到后再缓存”的策略，并压缩为宽 900–1100 的 WebP。

图片字段建议改为：

```js
{
  number: 1,
  name: "露米娅",
  thumb: "/assets/cards/001.webp",
  src: "https://cdn.example.com/mikuji/cards/001.webp"
}
```

## 4. 3D 动画迁移

四种抽签动画目前由 Blender 5.3 渲染成透明 WebP 精灵图，网页用 Canvas 播放。小程序可以直接复用这套资产与索引，不需要在小程序里跑 3D 引擎：

- 动画清单：`app/3d-data.js`，包含 17 条动画（硬币 2、六面骰 6、八面骰 8、签箱 1）、帧数、列数、帧率和每格尺寸。
- 精灵图：`app/assets/3d/*.webp`，透明背景。
- 网页播放器：`app/blender-scenes.js` 的核心是按结果选图、按时间算帧、用 `drawImage` 裁切精灵图。

小程序建议用 `<canvas type="2d">` 重写播放器：

```js
const query = wx.createSelectorQuery();
query.select('#drawCanvas').fields({ node: true, size: true }).exec((res) => {
  const canvas = res[0].node;
  const ctx = canvas.getContext('2d');
  const image = canvas.createImage();
  image.onload = () => {
    // drawImage(image, sx, sy, cellW, cellH, dx, dy, dw, dh)
  };
  image.src = '/assets/3d/d8-5.webp';
});
```

具体规则：

- 硬币：七枚各自选择 `coin-heads` / `coin-tails`，按索引错开 50–70 ms 开始。
- 六面骰 / 八面骰：根据 `result.detail.rolls` 选择 `d6-N` / `d8-N`，三枚错开播放。
- 签箱：播放唯一一条签箱动画；动画后在半透明纸签位置叠印 `第 N 番`（当前网页在 Canvas 上完成）。
- 最终帧自动停在精灵图最后一格，不需要视频结束事件。
- `prefers-reduced-motion` 降级为直接绘制最后一帧。
- 低端机可把 `requestAnimationFrame` 限制到 30fps，或只播放 0.8 秒后停在末帧。
- 抽签结束后调用 `wx.vibrateShort({ type: 'light' })` 增加触感反馈。

## 5. 需要替换的浏览器 API

| 网页 | 小程序 |
| --- | --- |
| `localStorage` | `wx.getStorageSync` / `wx.setStorageSync` |
| `navigator.clipboard` | `wx.setClipboardData` |
| Web Audio 合成音效 | `wx.createInnerAudioContext` + 短音效文件，或使用 `wx.vibrateShort` 替代 |
| `document.addEventListener('keydown')` | 页面 `onKeyDown`（若支持）或纯触屏操作 |
| `requestFullscreen` | 阅读页隐藏导航栏 + 横屏模式，或自定义全屏页 |
| `scrollIntoView` | `wx.createSelectorQuery` + `scroll-into-view` |
| Hash 路由 | `wx.switchTab` / `wx.navigateTo` |
| CSS `backdrop-filter` | 部分机型支持有限，准备纯色/透明度降级 |

## 6. 页面改造建议

### 抽签页

1. `data` 中保存 `method`、`drawing`、`showResult`、`result`、`fortune`。
2. 四张方式卡用 `wx:for` 渲染，点击更新 `method` 并切换对应动画组件。
3. 抽签按钮点击后：
   - 立即调用 `core.draw(method)` 得到结果（避免动画结束后才计算）；
   - 根据结果选择对应的硬币 / 骰子精灵图并播放；
   - 动画结束后 `setData({ showResult: true, ... })` 展示结果。
4. 结果签纸用 `movable-area` + `movable-view` 支持双指缩放，或者点击进入单独的图片预览页（`wx.previewImage`）。

### 漫画页 / 阅读器

1. 合集卡片使用本地缩略图。
2. 阅读器使用 `swiper` 并按页懒加载；设置 `current`、`bindchange` 更新页码。
3. 原图地址放 CDN；预加载当前页前后各一页。
4. 缩略条用 `scroll-view scroll-x`，绑定 `scroll-into-view`。
5. 调用 `wx.setNavigationBarTitle` 更新页面标题。

### 签库

1. 128 个 `button` 放在 `scroll-view` 中，用 `wx:for` 渲染缩略图。
2. 搜索用 `bindinput` 过滤；编号和角色名都支持。
3. 点击后进入签纸预览页或弹出 `fortune-card`，不写入签历。

## 7. 分享与合规

- 可添加 `onShareAppMessage`，分享标题为“东方幻存神签 · 第 N 番”，路径带上 `?number=N`。
- 分享图片建议用 `canvas` 拼接签号、角色名和缩略图，不直接外链原页。
- 上线前确认书名、角色与扫描图的使用范围；本程序默认仅作个人阅览与娱乐用途。
- 不要在小程序内放置抽奖、付费解签等可能涉及平台规则的业务，除非另行评估类目与资质。

## 8. 推荐移植顺序

1. 复用 `core.js` / `data.js`，先用 `console.log` 验证四种模式各抽 1000 次，签号始终在 1–128。
2. 做签库页，验证图片路径和懒加载。
3. 做抽签页的静态布局与结果签纸。
4. 逐步替换硬币、骰子、签箱动画。
5. 做漫画合集与阅读器。
6. 接入签历、分享、CDN 与性能降级。
