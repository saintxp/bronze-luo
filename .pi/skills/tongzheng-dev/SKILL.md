---
name: tongzheng-dev
description: 铜声·识洛项目专属开发技能。蒸馏 Phase 2 所有踩坑经验。使用时机：在此项目做任何开发任务（写谜题/章节、调 Canvas/UI、跑 E2E、加 WebGL 特效、改 HUD/音频、章节过渡）前自动参考，避免重犯已知错误。
---

# 铜声·识洛 开发避坑指南

> Phase 2 实战蒸馏。每个坑都花过大量 token 才爬出来。

## 1. 开发环境

| 规则 | 正确做法 | 错误做法 |
| ------ | ---------- | ---------- |
| 端口 | 固定 **5173**（不是 3000） | 改 vite.config.ts 里的端口 |
| E2E 浏览器 | 手动启动 Chrome CDP：`chrome.exe --remote-debugging-port=9222 --disable-background-timer-throttling --disable-backgrounding-occluded-windows --disable-renderer-backgrounding --no-first-run --no-default-browser-check --window-size=1920,1080`，然后 `agent-browser connect 9222` | 用 `agent-browser open`（已知会 hang） |
| E2E 期间禁止编辑 | 长时间跑 E2E 时**不要编辑任何源文件**，pi-lens autofix 格式化会触发 Vite HMR 重载，清空游戏状态 | 边跑 E2E 边改代码 |
| Console 日志 | 日志跨 session 堆积，判断当前章节只看最后一条 `Switched to chapter:` 行 | 被旧日志误导 |
| 构建/测试 | `npx tsc --noEmit`、`npx vitest run`、`npm run build` 三连 | 改完代码不验证 |

## 2. Canvas 五层架构

```
UI Canvas    — 图层 4（最顶层）：Stamp 动画 + Definition 弹出 + stage-js HUD
VFX Canvas   — 图层 3：Seedance 视频 + WebGL 粒子叠加
Puzzle Canvas — 图层 2：拖拽交互层（mousedown/move/up 监听在这里）
BG Canvas    — 图层 1：静态场景背景
Map Canvas   — 图层 0：洛阳古地图（序章/尾声）
```

### 致命坑

- **`position:absolute` 的 canvas 不吃 flex 居中**。必须在 `resize()` 中用 `left/top` 显式偏移到 `(window.innerWidth - gameWidth) / 2`。
- 获取显示区域统一用 `CanvasManager.getDisplayRect()`，返回 `{x, y, width, height}`。
- 图层顺序靠 DOM 顺序保证，不是 z-index。
- UI Canvas 是 topmost；stage-js canvas 需要和游戏画布的 display rect 精确对齐。

## 3. 动画与过渡

- **`requestAnimationFrame` 的 `dt` 参数已经是毫秒**，不要再 `* 1000`。之前教程关一秒跳过 L1-L3 就是这个 bug。
- 章节切换过渡用**暖宣纸纹理叠加**（rice-paper overlay），禁止纯黑 fade。
- 帧动画用 `async/await`：`await anim.play(frame1, 300)`。
- 过渡动画的 canvas overlay 需要在 `main.ts` 里管理 z-order 和生命周期。

## 4. stage-js HUD 集成

### 坐标对齐三定律

1. `viewbox("in")` 把内容对齐**左上角**，不是居中。
2. stage canvas 必须通过 `CanvasManager.getDisplayRect()` 获取游戏画面中心矩形的 `{x, y, width, height}`，然后设置 canvas 的 `left/top/width/height` 与之 1:1 匹配。
3. `HudMenu.resize()` 每次窗口变化都要重新对齐。

### 点击穿透三定律

1. `memoizeDraw` 创建的 Sprite **默认 hit area 为零**，鼠标事件穿透到下层 canvas。
2. 每个可交互 Sprite 必须显式调用 `.size(w, h)` 定义命中区域。
3. 遮罩 backdrop 的 Sprite 不设 `.size()` 会导致点击穿透到下层游戏 canvas。

### 强制重绘

- 外部状态变化（如 `AudioManager.instance.muted`）不会自动触发 memoizeDraw 重绘。
- 解法：`sprite.pin("alpha", sprite.pin("alpha"))` bump transform 时间戳，让 memoizer 重新评估。

### 静音按钮

- 点击回调中 bump `pin("alpha")` 后调用 `stage.draw()` 强制一帧。
- 文本标签在 `memoizeDraw` 的 draw 函数里每次读取 `AudioManager.instance.muted` 来决定显示文字。

## 5. E2E 测试模式

### 合成拖拽

```javascript
// 在 agent-browser 中 eval 执行
const puzzleCanvas = document.querySelectorAll('canvas')[1]; // Puzzle Canvas 是第二个
const rect = puzzleCanvas.getBoundingClientRect();

// 游戏坐标 → 屏幕坐标
const sx = rect.left + gameX;
const sy = rect.top + gameY;

// 分发事件
puzzleCanvas.dispatchEvent(new MouseEvent('mousedown', {clientX: sx, clientY: sy, bubbles: true}));
// ... mousemove 若干步 ...
puzzleCanvas.dispatchEvent(new MouseEvent('mouseup', {clientX: ex, clientY: ey, bubbles: true}));
```

- **每次拖拽前重新 `getBoundingClientRect()`**，窗口可能被移动过。
- 拖动目标是最远的合法 snap 位置（直接拖到终点 + 少量中间帧）。
- Chrome 窗口被遮挡时 `rAF` 暂停，所有动画停止。保持窗口可见。
- `agent-browser open` 已知会 hang，始终用手动 Chrome CDP + `connect`。

## 6. WebGL / 特效集成

### liquid-glass-canvas（灰页折射玻璃）

- 特效容器用 `div`，和 BG Canvas **1:1 对齐**。
- 镜头位置通过注册一个不可见的 `anchor div` 控制——库每 tick 重测元素 rect。
- `updateLens` 不能直接移动位置，只能通过换锚点元素。
- 章节退出时**必须 teardown**（`instance.destroy()` 或等效），否则残留 WebGL 上下文。

### 后续特效复用

- 水面倒影（东汉·纸成）、铜镜反射（北魏·衣归）可复用同一模式。

## 7. HUD / UI 设计硬规则

### 游戏内

- **ESC 键弹出暂停菜单，没有常驻按钮**。之前加过 pause button，用户反馈破坏水墨视觉，已删除。
- 暂停菜单项：继续 / 重玩本章 / 回到首页 / 音效开关。
- 视觉：宣纸底色面板 + 朱砂 #b64232 边框 + 「暂停」标题 + 水墨晕染 backdrop。

### 开始页

- HTML 按钮（⚙ 设置），不进入 stage-js。
- 设置弹窗只含：关闭 + 音效开关。

### Demo 结尾页保护（硬规则）

- **除非全部 10 个章节开发完毕，否则 `ChapterDemoEnd.ts` 必须保留且功能正常**。
- 不得删除 "回到首页" 按钮和 return-to-home 流程。
- 不得在 DemoEnd 之后追加内容而不更新 DemoEnd 的返回路径。
- 当前状态：Phase 2 完成（教学关→周王城），Phase 3（东汉→曹魏）待开发。
- 触发条件：玩家完成最后一个已开发章节 → 显示 DemoEnd → 回到首页。

## 8. 音频系统

- 所有音调通过 `AudioManager` 的 master `GainNode` 路由。
- 静音用 `AudioManager.instance.setMuted(true/false)` 或 `.muted` 属性。
- 铜声触发走 EventBus：`EventBus.emit('bronze:sound', 'guDu')`。
- AudioManager 初始化在 `main.ts` 中，必须在任何章节加载前完成。

## 9. InkView 色板速查

### CSS 变量（全局可用）

```css
--ink-bg: #f6f1e6;       /* 暖米背景 */
--ink-paper: #fffaf0;     /* 宣纸色 */
--ink-text: #201c18;      /* 深棕黑主文字 */
--ink-muted: #6f675d;     /* 弱化文字 */
--ink-line: #2a2723;      /* 干笔墨线 */
--ink-wash: rgba(32,28,24,0.08); /* 水墨晕染 */
--ink-cinnabar: #b64232;  /* 朱砂红 — 印章/强调 */
--ink-indigo: #2f536f;    /* 靛蓝 */
--ink-jade: #5c7f67;      /* 玉色 */
--ink-gold: #c8a65a;      /* 金色 */
```

### 青铜扩展（项目专用）

```css
--bronze-copper: #B87333;
--bronze-green: #5D7A5E;
--bronze-rust: #A65D2C;
--bronze-vermillion: #C23B22;
--bronze-cinnabar: #E05A3A;
--bronze-gold: #D4A843;
--bronze-turquoise: #4A9B9B;
--bronze-ash: #8B8070;
--bronze-ink: #1A1A18;
--bronze-ritual-white: #F5F0E8;
--bronze-lime-white: #F0EDE0;
```

### 章节色板

| 章节 | 主色 | 辅色 |
| ------ | ------ | ------ |
| 教学关 | 线稿 #2a2723 | — |
| 序章 | 暖棕 #8B6F47 | 铜金 #B87333 |
| 二里头 | 铜金 #D4A843 | 绿松石 #4A9B9B |
| 灰页 | 烟灰 #6B6B6B | 暗金 #8B7355 |
| 周王城 | 青铜青 #5D7A5E | 礼白 #F5F0E8 |
| 东汉 | 赤红 #C23B22 | 玄黑 #1A1A18 |
| 曹魏 | 灰烬 #8B8070 | 赭石 #B78642 |
| 北魏 | 朱红 #B64232 | 石灰白 #F0EDE0 |
| 隋唐 | 金黄 #D4A843 | 多彩 |

### 设计禁止

- 纯白背景 → 用 `--ink-bg` 或 `--ink-paper`
- 纯黑半透明遮罩 → 用 `--ink-wash`
- 红金宫廷风、脏旧纸纹理、装饰性书法字体、仙侠 UI

## 10. 关键文件索引

| 文件 | 作用 |
| ------ | ------ |
| `src/main.ts` | 入口、bootstrap、章节切换逻辑、过渡动画 |
| `src/engine/CanvasManager.ts` | 五层 canvas 管理、resize、getDisplayRect |
| `src/engine/DragHandler.ts` | 拖拽交互（mouse + touch） |
| `src/puzzle/PuzzleBase.ts` | 抽象谜题接口 |
| `src/chapters/ChapterBase.ts` | 章节基类 |
| `src/chapters/ChapterTutorial.ts` | 教学关 L1-L3 |
| `src/chapters/ChapterPrologue.ts` | 序章 |
| `src/chapters/ChapterErlitou.ts` | 壹·二里头 |
| `src/chapters/ChapterGrey.ts` | 灰页（含 liquid-glass-canvas） |
| `src/chapters/ChapterZhou.ts` | 贰·周王城 |
| `src/chapters/ChapterDemoEnd.ts` | **Demo 结尾页——禁止删除** |
| `src/ui/HudMenu.ts` | stage-js 暂停菜单（ESC） |
| `src/ui/InkPaintingUtils.ts` | 水墨风格绘制工具 |
| `src/audio/AudioManager.ts` | 音频管理、master GainNode、muted |
| `src/audio/BronzeSound.ts` | 11 铜声触发 |
| `src/state/GameState.ts` | 全局状态 |
| `src/state/SaveManager.ts` | 存档/读档 |
| `index.html` | 入口 HTML、InkView CSS tokens、开始页按钮 |

## 11. 新增章节 Checklist

复制这个流程，别跳步：

1. [ ] 在 `CLAUDE.md` 中确认章节设计（谜题类型、帧数、色板）。
2. [ ] 创建 `src/chapters/ChapterXxx.ts`，继承 `ChapterBase`。
3. [ ] 注册到 `src/main.ts` 的章节路由表。
4. [ ] **保留 `ChapterDemoEnd.ts` 作为当前最后一章**，直到全游戏完成。
5. [ ] 写单元测试：`checkAlignment()` 的 snap 阈值、drag 边界。
6. [ ] `npx tsc --noEmit` → `npx vitest run` → `npm run build`。
7. [ ] E2E：启动 Chrome CDP → 合成拖拽验证 → 截图对比。
8. [ ] 确认 HUD ESC 菜单在新章节正常工作。
9. [ ] 确认章节过渡动画（rice-paper fade）正常。
10. [ ] Commit。
