# 新会话启动提示词

把这个文件的内容粘贴到新会话作为第一条消息。

---

## 铜声·识洛 — Phase 2 进行中

### 上下文速览

Gorogoa-like 2D 拼图独立游戏，HTML5 Canvas + TypeScript + Vite。5 层 Canvas 堆栈（BG / Puzzle / VFX / UI / Map），自定义 FSM 拼图引擎。

### 当前最新提交

```
7713d7d test: 新增 InkPaintingUtils + GSAP 映射单元测试
eae39df feat: VFX 粒子系统集成 (Proton 7.1.5)
ca22851 feat: InkPainting 移植 + GSAP 动画集成 + 色彩常量
```

### 构建验证

```bash
cd "E:/projects/铜声·识洛"
npm install --include=dev    # ⚠️ npm 11 必须加 --include=dev
npx tsc --noEmit             # 应输出零错误
npx vitest run               # 应输出 34/34 通过 (原 26 + 新 8)
```

---

## 本会话完成的 3 条主线

### ✅ 1. InkPainting 移植 → 印章/竖排/纸纹

**已完成：**

| 文件 | 内容 |
| --- | --- |
| `src/ui/InkPaintingUtils.ts` | 🆕 从 InkPainting (MIT) 移植的核心模块 |
| `src/ui/StampEffect.ts` | 改用朱砂印章渲染（阴刻/阳刻 + multiply 混合 + 边缘磨损） |
| `src/ui/DefinitionPopup.ts` | 新增竖排文字模式 (`layout: 'vertical'`) |

**移植的功能：**

- `renderSeal(config)` — 朱砂印章渲染（阴刻/阳刻 + 轮廓变形 + 边缘破损 + 磨损纹理）
- `drawSealImpression(ctx, seal, x, y)` — multiply 混合绘制印章印迹
- `generatePaperTexture(config)` — 宣纸纹理（晕染 + 颗粒 + 纤维 + 暗角）
- `drawVerticalText(ctx, x, y, config)` — 竖排题词（从右到左，带手写抖动）
- `makeSeededRng(id)` — 确定性种子随机数（保证纹理一致性）

### ✅ 2. GSAP 动画集成

**已完成：**

`src/engine/AnimationEngine.ts` 内部切换为 GSAP，保持原有 Tween/KeyframeSequence API 不变。

新增 GSAP 方法：

- `animateTo(target, vars)` — 多属性同时动画
- `animateFrom(target, vars)` — 从指定值动画到当前值
- `animateTimeline(buildFn)` — 时间线序列动画
- `toGsapEase(name)` — 游戏缓动名 → GSAP ease 字符串映射

### ✅ 3. Proton 粒子系统

**已完成：**

`src/engine/VFXParticleManager.ts` — 🆕 5 种青铜色粒子效果：

| ID | 效果 | 使用场景 | 颜色 |
| --- | --- | --- | --- |
| `copperSplash` | 铜液飞溅 | 序章 + 二里头 | BRONZE.copper → gold |
| `bellSoundwave` | 编钟声波 | 周·礼成 | BRONZE.green → ritualWhite |
| `towerEmbers` | 塔焚火星 | 北魏·烬 | BRONZE.vermillion → rust |
| `mirrorShards` | 镜碎碎片 | 唐·千秋镜 | BRONZE.cinnabar → limeWhite |
| `peonyPetals` | 牡丹花瓣 | 唐·归田 | BRONZE.cinnabar → gold |

用法：

```typescript
const particles = new VFXParticleManager(vfxCanvas);
particles.trigger('copperSplash', 960, 540);
```

### ✅ 其他

| 改动 | 文件 |
| --- | --- |
| 色彩常量 | `constants.ts`: `CHAPTER_PALETTE` (9章) + `INK` (InkView) + `BRONZE` (青铜色板) |
| 单元测试 | `src/tests/inkpainting.test.ts`: makeSeededRng + toGsapEase (8 tests) |
| 工作区清理 | 未提交改动已 commit |

---

## 已安装的 6 个工具

| # | 工具 | 状态 | 用途 |
| :--: | ------ | :--: | ------ |
| 1 | **proton-engine** ^7.1.5 | ✅ 已集成 | 粒子引擎（VFXParticleManager） |
| 2 | **gsap** ^3.15.0 | ✅ 已集成 | 动画引擎（AnimationEngine） |
| 3 | **stage-js** ^1.0.2 | ⏳ 未使用 | Canvas UI 组件化（可做 HUD/菜单） |
| 4 | **liquid-glass-canvas** ^0.1.0 | ⏳ 未使用 | WebGL 玻璃折射（灰页光晕/水面） |
| 5 | **Design Skill** | ✅ 可用 | UI 方向锁定 + 截图审查 |
| 6 | **InkPainting** | ✅ 已移植 | 源码已获取并移植，不再需要 clone |

---

## 项目架构速览

```
src/
├── main.ts                 # 入口 + 引导
├── engine/
│   ├── CanvasManager.ts    # 5 层 Canvas 堆栈管理
│   ├── LayerRenderer.ts    # 层渲染 API
│   ├── DragHandler.ts      # 拖拽交互（鼠标+触屏）
│   ├── HitDetector.ts      # 碰撞/吸附检测
│   ├── AnimationEngine.ts  # ✨ Tween + GSAP 双引擎
│   ├── ImageRenderer.ts    # 图片绘制工具
│   └── VFXParticleManager.ts  # 🆕 Proton 粒子管理
├── puzzle/
│   ├── PuzzleBase.ts       # 抽象拼图接口
│   ├── AlignmentPuzzle.ts  # 拖拽对位（90% 拼图）
│   ├── NestPuzzle.ts       # 嵌套层对位（灰页用）
│   └── RotationPuzzle.ts   # 旋转匹配（瘦骨用）
├── chapters/               # 章节实现
├── assets/
│   ├── AssetManifest.ts    # 资产路径清单（120+ 条）
│   ├── AssetLoader.ts      # 章节级懒加载
│   └── VideoTrigger.ts     # Seedance 视频触发器
├── audio/
│   ├── AudioManager.ts     # Web Audio API 封装
│   └── BronzeSound.ts      # 11 种铜声触发
├── ui/
│   ├── StampEffect.ts      # ✨ 朱砂印章（InkPainting 移植）
│   ├── DefinitionPopup.ts  # ✨ 释义弹窗（含竖排模式）
│   ├── InkPaintingUtils.ts # 🆕 印章/纸纹/竖排文字工具
│   ├── MapOverlay.ts       # 洛阳古地图
│   └── TutorialOverlay.ts  # 教程引导
├── state/                  # 游戏状态管理
├── tests/                  # ✨ 34 tests (alignment + nest + inkpainting)
└── utils/
    ├── math.ts             # 向量/碰撞/吸附数学
    ├── easing.ts           # 缓动函数
    ├── constants.ts        # ✨ CHAPTER_PALETTE + INK + BRONZE
    ├── EventBus.ts         # 事件总线
    └── logger.ts           # 调试日志
```

---

## 下一步任务清单

### 🥇 Phase 2 核心开发

1. **教学关 L1-L3 可玩化**
   - 用 `ImageRenderer` + 占位图渲染教学关背景
   - 在 `ChapterTutorial.ts` 中接入 `AlignmentPuzzle` + `NestPuzzle` + `RotationPuzzle`
   - 添加 `TutorialOverlay` 引导提示
   - 目标：3 个教学关可在浏览器中完整游玩

2. **序章 → 周王城 MVP**
   - 序章：合册动画 + 地图入口
   - 二里头：陶范合拢谜题 + `copperSplash` 粒子
   - 周王城：孔老圆心对位 + `bellSoundwave` 粒子
   - 目标：~30 分钟可玩体验

### 🥈 视觉增强

1. **集成 liquid-glass-canvas**
   - 灰页光晕效果（WebGL 玻璃折射）
   - 水面倒影（东汉·纸成）
   - 铜镜反射（北魏·衣归）

2. **集成 stage-js**
   - HUD 组件化（暂停菜单、设置面板）
   - 替代过程化 ctx.fillRect

3. **宣纸纹理应用到 UI Canvas**
   - 使用 `generatePaperTexture()` 作为 UI 背景
   - 章节切换时的纸纹过渡

### 🥉 资产生成

1. **生成 Seedream 资产**
   - 按 `资产/AI资产构图规范.md` 先母图再裁切
   - 从教学关 L1-L3 占位图开始
   - 优先 P0 谜题的配对件

---

## 关键设计约束（CLAUDE.md 摘录）

- **帧预算**：51 帧（45 正式章 + 6 教学关）硬上限
- **交互范式**：90%+ 拖拽对位。唯一异类交互 = 瘦骨旋转
- **跨章禁止**：不要求玩家记忆前章内容
- **侧写不告**：18 角色不出现面部、不标注姓名，≥2 层视觉线索
- **向下按姿势链**：二里头合范→周按桩→东汉按纸→曹魏抹灰→北魏覆手→隋唐掌→尾声合册

---

## 文档索引

| 文档 | 路径 | 用途 |
| ------ | ------ | ------ |
| 全故事线 | `故事线/全章故事线_v2_0.md` | 情节、谜题、VFX 清单 |
| 资产清单 | `资产/资产清单_v2_0.md` | 235 张图 + 16 视频 + 14 音效 |
| 代码计划 | `代码/代码编写计划_v2_0.md` | 5 阶段开发计划、架构图 |
| 提示词手册 | `资产/Seedream_Seedance_提示词手册.md` | Seedream/Seedance 提示词 |
| 构图规范 | `资产/AI资产构图规范.md` | 配对件母图裁切规则 |
| 项目约定 | `CLAUDE.md` | 设计约束、色板、人物表 |
