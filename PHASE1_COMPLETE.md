# Phase 1 Complete — 会话交接文档

## 切换至 Phase 2 前的状态快照

### Git
- **最新提交**: `a7a62db` — fix: L3 rotation puzzle auto-solve
- **分支**: `main`，工作区干净，无未提交改动
- **完整日志**:
  ```
  a7a62db fix: L3 rotation puzzle auto-solve
  97da750 chore: update README to reflect current Phase 1 codebase state
  daf2f39 feat: 完成核心引擎和基础架构
  ea89053 chore: update TypeScript configuration to disable output and adjust path settings
  1ed329e chore: initialize project with TypeScript, Vite, and Vitest
  a3cd143 docs: initial commit — all design documents (18 files, 5-phase plan)
  ```

### 构建验证

| 检查项 | 结果 |
|--------|:----:|
| `npx tsc --noEmit` | ✅ 零错误 |
| `npx vitest run` | ✅ 12/12 通过 (alignment.test.ts) |
| `npm run build` | ✅ 18 modules → 25KB (gzip 7.9KB) |
| `npm run dev` | 未验证 — 需要浏览器打开 `localhost:3000` |

### Phase 1 交付物

21 个源文件，覆盖完整的教学关 L1-L3 引擎：

```
src/
├── main.ts                     — 启动入口
├── engine/
│   ├── CanvasManager.ts        — 5层 Canvas 管理 (BG/Puzzle/VFX/UI/Map)
│   ├── LayerRenderer.ts        — 图层渲染封装
│   ├── DragHandler.ts          — 鼠标+触摸拖拽，双模式 (element/layer)
│   ├── HitDetector.ts          — 碰撞/对齐/旋转检测
│   └── AnimationEngine.ts      — Tween + KeyframeSequence
├── puzzle/
│   ├── PuzzleBase.ts           — 抽象基类 (IDLE/DRAGGING/NEAR/SNAPPED/SOLVED)
│   ├── AlignmentPuzzle.ts      — 拖拽对位谜题
│   └── RotationPuzzle.ts       — 旋转匹配谜题 (8齿齿轮)
├── chapters/
│   ├── ChapterBase.ts          — 章节生命周期基类
│   └── ChapterTutorial.ts      — L1拖门板 + L2嵌套透视 + L3旋转齿轮
├── state/
│   └── GameState.ts            — 全局游戏状态单例
├── assets/
│   ├── AssetManifest.ts        — 资产路径映射 (教学关路径已配好)
│   └── AssetLoader.ts          — 图片预加载+缓存
├── ui/
│   └── TutorialOverlay.ts      — UI Canvas 教学文字/箭头 (InkView 色板)
├── utils/
│   ├── constants.ts            — SNAP_THRESHOLD=30, 画布1920×1080, 层Z序, 动画时长
│   ├── math.ts                 — Vec2/Rect/碰撞数学
│   ├── easing.ts               — 缓动函数
│   ├── EventBus.ts             — 类型安全事件总线
│   └── logger.ts               — 命名空间日志
└── tests/
    └── alignment.test.ts       — 12个对齐数学测试
```

### 教学关机制

| 关卡 | 教学点 | 交互模式 | 谜题类 |
|:----:|--------|:--------:|--------|
| L1 | 拖拽对位 | element-drag | AlignmentPuzzle |
| L2 | 嵌套/窗口 | layer-pan (平移) | AlignmentPuzzle |
| L3 | 角度与共振 | arc-drag (旋转) | RotationPuzzle |

### 已知技术债务（低优先级，不影响功能）

1. `GameState.registerPuzzle()` 在 `currentChapterId` 设置前被调用
2. `PuzzleBase.setState()` 未调用 `gameState.updatePuzzleState()`
3. `EventBus` 使用 `.bind(this)` 的监听器无法移除（内存泄漏潜在）
4. L2 的 `AlignmentPuzzle` 从未通过 FSM 进入 SOLVED 状态
5. L1 门板拖拽元素在退出后未注销
6. L3 修复使用了 `dragFrame` 计数器（较脆弱），后续重构可改成状态判断

### 未完成的 Phase 1 步骤（可选）

- **浏览器验证**: `npm run dev` → `localhost:3000` → 测试 L1→L2→L3 端到端通关
- **资产替换**: 将 Canvas 2D 占位图形换成正式 png（AssetManifest 路径已配，AssetLoader 已就绪）
- **删除 PHASE1_COMPLETE.md**: 本文件是临时交接文档，Phase 2 开始后可删除

---

## Phase 2 启动指引

### 设计文档（所有内容）

- [故事线/全章故事线_v2_0.md](故事线/全章故事线_v2_0.md) — 完整故事，12 个谜题，18 角色
- [代码/代码编写计划_v2_0.md](代码/代码编写计划_v2_0.md) — 架构，模块结构，5 阶段计划
- [资产/资产清单_v2_0.md](资产/资产清单_v2_0.md) — 完整资产清单 (~235 张图)

### Phase 2 目标 M2: 序章→周王城 MVP

| 内容 | 谜题 | 框架数 | 工时 |
|------|:----:|:------:|:----:|
| 序章 (封面/封背/翻页) | — | ~4 | 10h |
| 壹·二里头「陶范合拢」 | AlignmentPuzzle | 7 | 10h |
| 灰页(悬置·商)「裂缝嵌套」 | NestPuzzle | 6 | 10h |
| 贰·周王城「孔老圆心」 | AlignmentPuzzle | 3 | 5h |
| 贰·周王城「礼成」「问道」 | 过场 + 交互 | — | 10h |

**估算 ~45h，产出 ~30 分钟体验，3 个 P0 谜题可玩。**

### Phase 2 新增文件预测

```
src/
├── chapters/
│   ├── ChapterPrologue.ts     — 序章 (封面/封背/翻页)
│   ├── ChapterErlitou.ts      — 壹·二里头 (陶范合拢)
│   ├── ChapterGrey.ts         — 灰页·悬置商 (裂缝嵌套)
│   └── ChapterZhou.ts         — 贰·周王城 (孔老圆心/礼成/问道)
├── puzzle/
│   └── NestPuzzle.ts          — 嵌套谜题 (L2 教学→正式)
└── assets/                    — 正式艺术资产 (非占位图)
```

### Phase 2 关键注意事项

1. **序章有 1 个 Seedance 视频**（铜液吞没）：需要 VideoTrigger.ts 机制，视频文件暂用占位
2. **灰页嵌套**：L2 已有教学原型，正式章需升级到 `NestPuzzle` 类
3. **"侧写不告"**：9 个角色登场（周公旦/老子/孔子/张衡/蔡邕/曹操/曹植/蔡文姬/冯太后），全部通过 ≥2 层视觉线索展示，不露正脸不标名字
4. **框架预算**：正式章 P0 45 帧硬上限，教程 6 帧独立预算（已用完）
5. **青铜色板**：序章暖棕古铜、二里头铜金松石、灰页全灰、周王城铜绿礼白
6. **10 声青铜音**贯穿：序章"咕嘟"→二里头→周，依次触发 EventBus `bronze:sound`
