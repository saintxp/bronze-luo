# 新会话启动提示词

把这个文件的内容粘贴到新会话作为第一条消息。

---

## 铜声·识洛 — Phase 2 进行中

### 上下文速览

Gorogoa-like 2D 拼图独立游戏，HTML5 Canvas + TypeScript + Vite。5 层 Canvas 堆栈（BG / Puzzle / VFX / UI / Map），自定义 FSM 拼图引擎。

### 当前最新提交

```
ec0fc88 docs: update README with Phase 2 progress and project metrics
```

### 构建验证

```bash
cd "E:/projects/铜声·识洛"
npm install --include=dev    # ⚠️ npm 11 必须加 --include=dev
npx tsc --noEmit             # 应输出零错误
npx vitest run               # 应输出 26/26 通过
```

### 工作区状态

有大量未提交改动（10 文件, ±3569/3047 行），主要是章节文件 + 引擎代码的 LF→CRLF 行尾转换（Windows）。

```
 M index.html
 M package.json          ← 加了 gsap/proton-engine/stage-js/liquid-glass-canvas
 M package-lock.json
 M src/chapters/ChapterDemoEnd.ts
 M src/chapters/ChapterGrey.ts
 M src/chapters/ChapterPrologue.ts
 M src/chapters/ChapterZhou.ts
 M src/engine/DragHandler.ts
 M src/main.ts
 M src/utils/EventBus.ts
?? .pi/                  ← 新装 Design Skill
```

建议先 `git stash` 或 `git add -A && git commit -m "chore: lint fixups + new deps"` 清空工作区。

---

## 本会话新安装的 6 个工具

| # | 工具 | 用途 | 安装方式 |
| :--: | ------ | ------ | ---------- |
| 1 | **proton-engine** ^7.1.5 | 粒子引擎（铜液飞溅/灰烬飘落/花瓣） | `npm i --save-dev` |
| 2 | **gsap** ^3.15.0 | 动画引擎（盖章回弹/翻页过渡/弹窗） | `npm i --save-dev` |
| 3 | **stage-js** ^1.0.2 | Canvas UI 组件化（替代过程化 ctx.fillRect） | `npm i --save-dev` |
| 4 | **liquid-glass-canvas** ^0.1.0 | WebGL 玻璃折射（灰页光晕/水面倒影/铜镜） | `npm i --save-dev` |
| 5 | **Design Skill** | UI 方向锁定 + 截图审查（HTML 页面设计） | 复制到 `.pi/skills/design/` |
| 6 | **InkPainting** | 水墨印章/纸纹源码参考（MIT） | `git clone` 备用 |

### 新增资产文档

| 文件 | 内容 |
| ------ | ------ |
| `资产/Seedream_Seedance_提示词手册.md` | 全章节 Seedream/Seedance 提示词 |
| `资产/AI资产构图规范.md` | 配对件生成约束（先母图再裁切） |
| `资产/资产清单_v2_0.md` | 已有，全量 235 张图 + 16 段视频 |
| `资产/Phase2_Seedream提示词_v1.md` | 已有 |

### 新增引擎代码

| 文件 | 内容 |
| ------ | ------ |
| `src/engine/ImageRenderer.ts` | 图片绘制工具（cover/contain/sliced + 缺图占位） |
| `src/assets/AssetLoader.ts` | 重写为章节级懒加载 + 失败缓存 |
| `src/assets/AssetManifest.ts` | 扩展为全章节资产路径 + 视频路径 |

---

## 代码优化：三条主线（按优先级）

### 1. 移植 InkPainting 印章代码 → StampEffect.ts（最高优先级）

**目标：** 把游戏里盖章动画从三角色块改成真正的朱砂印章效果。

**源码位置（需先 clone）：**

```bash
git clone https://github.com/TanShilongMario/InkPainting.git /tmp/inkpainting
```

**移植模块：**

- **印章渲染**（阴刻/阳刻 + 朱砂叠底）→ 替换 `src/ui/StampEffect.ts` 的 `drawStamp()`
- **竖排题词**（Canvas 竖排文字排版）→ 替换 `src/ui/DefinitionPopup.ts` 的文本渲染
- **宣纸纹理**（4 种纸纹理 + 纤维肌理）→ 用于 UI Canvas 背景

InkPainting 核心代码在 `app.js`（~2600 行），MIT 协议，直接移植。

### 2. 集成 GSAP 替代 AnimationEngine（中优先级）

**目标：** 让盖章回弹、翻页过渡、弹窗出入有精细的缓动曲线。

```typescript
// 示例：盖章动画
import gsap from 'gsap';

// 当前 AnimationEngine 只有基础 tween
// 用 GSAP 替换后可以做到：
gsap.fromTo(stamp, 
  { scale: 0, rotation: -15 },
  { scale: 1.2, rotation: 0, duration: 0.3, ease: 'back.out(1.7)',
    onComplete: () => gsap.to(stamp, { scale: 1, duration: 0.15, ease: 'power2.out' }) }
);
```

涉及文件：`src/engine/AnimationEngine.ts`（可保留接口，内部切换为 GSAP）。

### 3. 用 Proton 实现 Tier3 VFX（中优先级）

**目标：** 替代手写的粒子效果。

```typescript
import Proton from 'proton-engine';

// 示例：铜液飞溅粒子
const proton = new Proton();
const emitter = new Proton.Emitter();
emitter.rate = new Proton.Rate(new Proton.Span(5, 15), 0.05);
emitter.addInitialize(new Proton.Mass(1));
emitter.addInitialize(new Proton.Radius(2, 8));
emitter.addInitialize(new Proton.Life(1, 2));
emitter.addInitialize(new Proton.Velocity(new Proton.Span(2, 5), 
  new Proton.Span(0, 360), 'polar'));
emitter.addBehaviour(new Proton.Gravity(0.5));
emitter.addBehaviour(new Proton.Color('#D4A843', '#B87333'));
emitter.p.x = canvas.width / 2;
emitter.p.y = canvas.height / 2;
emitter.emit();
```

用 Proton 覆盖的场景：

- 二里头：铜液飞溅（`ChapterErlitou.ts`）
- 曹魏·烬城：灰烬飘落（`ChapterCaoWei.ts`）
- 北魏·烬：烟雾向塔檐流动（`ChapterWei.ts`）
- 归田：牡丹花瓣飘散（`ChapterTang.ts`）

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
│   ├── AnimationEngine.ts  # Tween + 关键帧（待替换为 GSAP）
│   └── ImageRenderer.ts    # 🆕 图片绘制工具
├── puzzle/
│   ├── PuzzleBase.ts       # 抽象拼图接口
│   ├── AlignmentPuzzle.ts  # 拖拽对位（90% 拼图）
│   ├── NestPuzzle.ts       # 嵌套层对位（灰页用）
│   └── RotationPuzzle.ts   # 旋转匹配（瘦骨用）
├── chapters/
│   ├── ChapterBase.ts      # 章节基类
│   ├── ChapterTutorial.ts  # 教学关 L1-L3
│   ├── ChapterPrologue.ts  # 序章
│   ├── ChapterErlitou.ts   # 壹·二里头
│   ├── ChapterGrey.ts      # 灰页
│   ├── ChapterZhou.ts      # 贰·周王城
│   └── ChapterDemoEnd.ts   # Demo 结束
├── assets/
│   ├── AssetManifest.ts    # 资产路径清单（120+ 条）
│   ├── AssetLoader.ts      # 章节级懒加载
│   └── VideoTrigger.ts     # Seedance 视频触发器
├── audio/
│   ├── AudioManager.ts     # Web Audio API 封装
│   └── BronzeSound.ts      # 11 种铜声触发
├── ui/
│   ├── StampEffect.ts      # 盖章动画（待移植 InkPainting 朱砂印章代码）
│   ├── DefinitionPopup.ts  # ≤4 字释义弹窗（待移植竖排题词）
│   ├── MapOverlay.ts       # 洛阳古地图
│   └── TutorialOverlay.ts  # 教程引导
├── state/
│   ├── GameState.ts        # 全局状态
│   ├── StampState.ts       # 盖章追踪（9 章）
│   ├── ChapterFSM.ts       # 章间/章内 FSM
│   └── SaveManager.ts      # localStorage 存档
└── utils/
    ├── math.ts             # 向量/碰撞/吸附数学
    ├── easing.ts           # 缓动函数
    ├── constants.ts        # 🆕 建议添加 CHAPTER_PALETTE 常量
    ├── EventBus.ts         # 事件总线
    └── logger.ts           # 调试日志
```

---

## 下一步任务清单（可直接开始）

### 🥇 立即可做（不依赖外部工具）

1. **添加章节色板常量到 `constants.ts`**
   - 见 `资产/Seedream_Seedance_提示词手册.md` 的色彩体系表
   - 定义 `CHAPTER_PALETTE` 对象，供章节 `render()` 方法引用

2. **清理工作区**

   ```bash
   git add -A && git commit -m "chore: add Proton/GSAP/Stage/LiquidGlass deps + Design Skill"
   ```

3. **npm 安装命令记住**

   ```bash
   npm install --include=dev    # ⚠️ 这台机器的 npm 11 必须加 --include=dev
   # 如果单包安装毁了 node_modules，用：
   rm -rf node_modules package-lock.json && npm install --include=dev
   ```

### 🥈 需要先 clone InkPainting

1. **从 InkPainting 移植印章 + 纸纹代码**
   - Clone 到 `/tmp/inkpainting`
   - 提取 `app.js` 中印章渲染、竖排题词、宣纸纹理模块
   - 移植到 `src/ui/StampEffect.ts` 和 `src/ui/DefinitionPopup.ts`

2. **集成 GSAP**
   - 在 `AnimationEngine.ts` 中引入 GSAP 作为底层实现
   - 保持现有 `play(frame, duration)` 接口不变

3. **集成 Proton**
   - 在 VFX Canvas 层添加粒子系统
   - 先在 `ChapterErlitou.ts` 的铜液溅射场景试水

### 🥉 设计文档参考

1. **生成 Seedream 资产**
   - 按 `资产/AI资产构图规范.md` 先母图再裁切
   - 从教学关 L1-L3 开始验证流程

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
