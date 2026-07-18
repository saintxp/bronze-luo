# 新会话启动提示词

把这个文件的内容粘贴到新会话作为第一条消息。

---

## 铜声·识洛 — Phase 2 MVP 已可玩 ✅ · 资产生成体系已就绪

### 上下文速览

Gorogoa-like 2D 拼图独立游戏，HTML5 Canvas + TypeScript + Vite。5 层 Canvas 堆栈（BG / Puzzle / VFX / UI / Map），自定义 FSM 拼图引擎。

### 当前最新提交

```
594054d feat: add tongzheng-dev project skill (pit distillation from Phase 2)
```

### 构建验证

```bash
cd "E:/projects/铜声·识洛"
npm install --include=dev    # ⚠️ npm 11 必须加 --include=dev
npx tsc --noEmit             # 零错误
npx vitest run               # 34/34 通过
npm run build                # ~312KB (gzip ~94KB)
npm run dev -- --port 5173 --strictPort   # 开发服务器（用户固定端口 5173）
```

---

## ✅ Phase 2 MVP 状态

**E2E 已验证完整通关**（agent-browser + CDP 真实输入）：

| 章节 | 交互 | 验证 |
| ------ | ------ | :----: |
| 首页 | 设置按钮 → 音效/关闭 | ✅ |
| 教学关 L1 | ESC → 继续/重玩/首页/音效 | ✅ |
| 教学关 L2 | 平移嵌套对准星标 | ✅ |
| 教学关 L3 | 弧形拖旋转齿轮 | ✅ |
| 序章 | 长按封面3s → 洛河滑动400px → 指纹 → 铜液吞没(咕嘟) | ✅ |
| 壹·二里头 | 拖右半范合拢 → 龙身纹 + 铸印 + 咕嘟 | ✅ |
| 灰页·悬置商 | 5层裂缝嵌套（首层自动，4次拖拽）→ 星图玄鸟 + 悬置印 + WebGL 玻璃光晕 | ✅ |
| 贰·周王城 | 日晷拖200px → 鼎拖300px → 孔老圆心 → 三桩点击 → 宅兹印 → 调钟共振(嗡——) → 牡丹一环 → 礼成印 → 问道自动序列(叮——叮——) | ✅ |
| DemoEnd | 试玩结束 + 合册印 + 回到首页（可循环）⚠️ **硬规则：禁止删除** | ✅ |

青铜音已触发：咕嘟(序章/二里头)、嗡——(礼成)、叮——叮——(问道)。

### 视觉增强（已完成）

- 章节切换宣纸纹理过渡（非纯黑fade）
- 灰页 WebGL 玻璃光晕（liquid-glass-canvas，透镜跟随裂缝）
- stage-js HUD 暂停菜单（ESC，宣纸面板+水墨遮罩）
- 页面背景改为暖宣纸色 `--ink-bg`

### HUD 交互

- 首页：HTML 设置按钮（⚙），精简菜单（关闭+音效开关）
- 游戏内：ESC 暂停菜单（继续/重玩本章/回到首页/音效开关）
- 游戏内无常驻按钮（保持水墨视觉纯净）

---

## 🐛 已修复的关键 bug（Phase 2 全程）

| bug | 根因 | 修复 |
| ----- | ------ | ------ |
| stage-js 点击穿透到背景 | memoizeDraw Sprite 默认无命中尺寸 | `.size(w,h)` 显式设置 |
| stage-js 菜单与游戏画布未对齐 | stage-js viewbox 默认左上对齐 | HudMenu.resize 同步 CanvasManager.getDisplayRect |
| 音效开关标签不刷新 | 外部状态变化未标记组件 dirty | click 后 `pin("alpha")` 强制 prerender |
| 章节过渡不可见 | `main.ts` 计时器把 ms 当秒 ×1000 | `transitionTimer += dt`（dt 已是 ms） |
| 右侧黑边 | 画布 `position:absolute` 脱离文档流，flex 居中无效 | CanvasManager.resize 显式 left/top 偏移 |
| 页面深色背景违和 | body `#2a2723` | → `var(--ink-bg)` 暖宣纸色 |
| 印章跨章遮挡 | UI Canvas 层从不自动清理 | 主循环每帧 `clearLayer("ui")` |
| 二次拖拽失效 | DragHandler detach 不清元素/回调 | detach() 全清理 |

---

## 🔧 开发环境注意事项（非游戏 bug）

- **rAF 节流**：Chrome 窗口被判定 hidden 时游戏循环暂停。E2E 启动参数必须加：

  ```
  --disable-background-timer-throttling --disable-backgrounding-occluded-windows --disable-renderer-backgrounding
  ```

- **pi-lens autofix** 会重排已修改文件（引号/缩进），触发 Vite HMR 整页刷新——E2E 长跑时注意它会重置游戏状态。长时间 E2E 期间禁止编辑源文件。
- **agent-browser open 会挂起**：改用 `chrome.exe --remote-debugging-port=9222` 手动启动 + `agent-browser connect 9222`。
- **合成拖拽**：`document.querySelectorAll('canvas')[1]` 是 puzzle 层，用 `getBoundingClientRect()` 实时换算游戏坐标→页面坐标，dispatchEvent mousedown/mousemove/mouseup 即可模拟拖拽。每次拖拽前重新 getBoundingClientRect。
- **Console 日志**：跨 session 堆积，只看最后一条 `Switched to chapter:` 行判断当前章节。

---

## 📁 项目架构速览

```
src/
├── main.ts                 # 入口 + ChapterManager（fade过渡路由6章）
├── engine/
│   ├── CanvasManager.ts    # 5层Canvas（显式偏移居中）
│   ├── LayerRenderer.ts    # 层渲染 API
│   ├── DragHandler.ts      # 拖拽（element/layer双模式，detach全清理）
│   ├── HitDetector.ts      # 碰撞/吸附检测
│   ├── AnimationEngine.ts  # Tween + GSAP 双引擎
│   ├── ImageRenderer.ts    # 图片绘制工具
│   └── VFXParticleManager.ts  # Proton 粒子（5种青铜色效果）
├── puzzle/                 # PuzzleBase + Alignment + Nest + Rotation
├── chapters/               # ChapterBase + Tutorial/Prologue/Erlitou/Grey/Zhou/DemoEnd ⚠️
├── state/GameState.ts      # 全局状态单例
├── assets/                 # AssetManifest + AssetLoader + VideoTrigger
├── audio/                  # AudioManager + BronzeSound（11青铜音）
├── ui/                     # StampEffect(朱砂印) + DefinitionPopup(竖排) + InkPaintingUtils + MapOverlay + TutorialOverlay + HudMenu(stage-js)
├── tests/                  # 34 tests (alignment 12 + nest 14 + inkpainting 8)
└── utils/                  # constants(CHAPTER_PALETTE/INK/BRONZE) + math + easing + EventBus + logger
```

---

## 📋 下一步任务清单

### 🥇 Phase 3 准备（东汉→曹魏，~30h）

- 字立/地听/纸成/托 + 烬城/诗起（见 `代码/代码编写计划_v2_0.md`）
- **新增章节前**：读 `.pi/skills/tongzheng-dev/SKILL.md` 避坑指南
- **新增章节 Checklist**（见避坑指南第 11 节）：10 步验证流程

### 🥈 资产生成

- **图片**：按 `资产/Seedream图片提示词_Phase2.md` 生成——已按 Seedream 固定比例重组
- **视频**：按 `资产/Seedance视频提示词_全章节.md` 生成——V03/V04 需黑底 additive
- **音效**：按 `资产/铜声音效提示词_Phase2.md` 生成 5 个
- **BGM**：按 `资产/BGM提示词_Phase2.md` 生成 6 轨
- **母图裁切**：按 `资产/AI资产构图规范.md`——配对件先母图再裁切

### 🥉 后续规划

- 水面倒影（东汉·纸成）、铜镜反射（北魏·衣归）可复用灰页 WebGL 模式
- 瘦骨旋转（唯一异类交互 = 双力共振）需 narrative justification

---

## 🔑 关键设计约束（CLAUDE.md 摘录）

- **帧预算**：51 帧（45 正式章 + 6 教学关）硬上限
- **交互范式**：90%+ 拖拽对位。唯一异类 = 瘦骨旋转
- **跨章禁止**：不要求玩家记忆前章内容
- **侧写不告**：18 角色不露正脸不标名，≥2 层视觉线索
- **向下按姿势链**：二里头合范→周按桩→东汉按纸→曹魏抹灰→北魏覆手→隋唐掌→尾声合册
- **Demo 结尾页保留**：除非全部 10 章开发完毕，`ChapterDemoEnd.ts` 禁止删除

---

## 📚 文档索引

### 设计文档

| 文档 | 路径 | 用途 |
| ------ | ------ | ------ |
| 全故事线 | `故事线/全章故事线_v2_0.md` | 情节、谜题、VFX 清单 |
| 代码计划 | `代码/代码编写计划_v2_0.md` | 5 阶段开发计划、架构图 |
| 项目约定 | `CLAUDE.md` | 设计约束、色板、人物表 |
| 避坑指南 | `.pi/skills/tongzheng-dev/SKILL.md` | Phase 2 踩坑蒸馏、开发 Checklist |

### 资产生成

| 文档 | 路径 | 用途 |
| ------ | ------ | ------ |
| 资产清单 | `资产/资产清单_v2_0.md` | 235 张图 + 16 视频 + 14 音效 |
| 构图规范 | `资产/AI资产构图规范.md` | 配对件母图裁切规则 |
| 生成工作流 v2 | `资产/Seedream资产生成工作流_v2.md` | 生成策略总览与文档索引 |
| 图片提示词 Phase2 | `资产/Seedream图片提示词_Phase2.md` | 教学关→周王城静态图（已按比例重组） |
| 视频提示词 全章节 | `资产/Seedance视频提示词_全章节.md` | 16 段视频 + 抠像/通道判定 |
| 音效提示词 | `资产/铜声音效提示词.md` | 11 铜声 + 3 环境/UI（Suno） |
| 音效提示词 Phase2 | `资产/铜声音效提示词_Phase2.md` | Phase 2 所需 5 个音效 |

### BGM

| 文档 | 路径 | 用途 |
| ------ | ------ | ------ |
| BGM 规划 | `资产/BGM规划方案.md` | 11 轨方案 A（已确认） |
| BGM 提示词 全章节 | `资产/BGM提示词_全章节.md` | 11 轨 Suno/Udio 完整提示词 |
| BGM 提示词 Phase2 | `资产/BGM提示词_Phase2.md` | Phase 2 所需 6 轨（含开始界面） |
| BGM 循环点 | `资产/BGM循环点说明.md` | BPM、调式、循环段标记 |
