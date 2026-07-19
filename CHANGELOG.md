# Changelog

## 2026-07-19 — 资产替换工作流 + 粒子题词系统 + 调试 API

### 新增

- **资产替换文件库**: `资产替换文件库/` — 结构化资产仓库，按章节分目录（序章→尾声 + 音频/视频/UI），含 README 使用规范
- **章节文案数据**: `src/data/chapterCopy.ts` — 29 处竖排文案（登录页 + 28 章节完成点），80-100 字/条，含粒子颜色配置
- **粒子题词原型**: `src/tests/particle-colophon-prototype.html` — 题词粒子系统 HTML 交互原型
- **调试 API**: `window.__jumpTo(index)` / `window.__chapterList()` — 截图捕获调试接口，支持按索引跳转章节
- **文案提示词文档**: `工作提示词_章节文案粒子系统.md` — 章节文案 + 粒子系统 AI 提示词指南
- **依赖**: `ws` WebSocket 依赖（构建/预览用）

### 修改

- **main.ts**: 注入 `__jumpTo` / `__chapterList` 调试全局函数
- **Seedream 提示词**: Batch1/Batch2/Batch3 新增帧级元数据（场景/环节/文件名），适配批量生成工作流
- **package.json**: 新增 `ws` 依赖

### 验证

| 检查项 | 结果 |
| -------- | :----: |
| TypeScript 编译 | ✅ 零错误 |
| 测试 | ✅ **70/70** 通过 |
| 生产构建 | ✅ 367KB (gzip 106KB) |

---

## 2026-07-18 — Phase 3 东汉·曹魏章节完成 ✅

### 新增

- **6 个新章节**: 字立（拖拽对位3选1）/ 地听（八龙首方向判定🏆）/ 纸成（4档角度吸附）/ 托（刀背敲手→反光引路两段拖拽）/ 烬城（三层同心灰环顺序解谜）/ 诗起（三诗人风传递自动动画）
- **新 Puzzle 类型**: DirectionPuzzle — 多选项方向判定 + 渐进线索 + 震颤反馈
- **冒烟测试**: 36 个 Phase 3 冒烟测试（DirectionPuzzle 6 + 每章 5）

### 改进

- **排版统一**: Phase 3 全部提示文字对齐 Phase 2 规范（16px / CANVAS_HEIGHT-30 / #6f675d）
- **谜题深度**: 烬城同心灰环从外向内顺序解谜（带震颤+提示）、周·打桩强制左→右顺序
- **视觉体验**: 托·刀背敲手完整重绘（刀背/刃/柄三标注 + 脉冲目标区 + 弧线引导）、序章标题对比度提升、地听龙首加方向标签
- **代码质量**: 龙首坐标预计算静态化、线索推进 bug 修复（5s 递进）、嵌套三元消除

### 验证

| 检查项 | 结果 |
| -------- | :----: |
| TypeScript 编译 | ✅ 零错误 |
| 测试 | ✅ **70/70** 通过 (34 原有 + 36 Phase 3) |
| 生产构建 | ✅ 367KB (gzip 106KB) |
| 冒烟测试 | ✅ 6 章完整生命周期 (构造→init→enter→100帧update→exit) |

---

## 2026-07-18 — VFX 粒子 + 过渡动画 + HUD 菜单 + 资产工作流

**提交:** `aca8619`（最新，共 21 个本地提交）

### 新增

- **VFX 系统**：Proton 7.1.5 粒子引擎集成，粒子特效框架
- **视觉过渡**：章节淡入淡出切换、纸纹过渡动画、灰页 WebGL 玻璃光晕
- **HUD 菜单**：Stage.js 暂停菜单（含静音切换）、设置按钮
- **美术移植**：InkPainting 水墨渲染移植，GSAP 动画集成，全局色彩常量系统
- **资产工作流**：Seedream 比例优先工作流 v2、视频抠像/Alpha 通道规范、BGM 10 曲方案

### 修改

- **main.ts**：菜单系统 + 章节切换 + VFX 初始化
- **CanvasManager.ts**：分层渲染顺序调整
- **DragHandler.ts**：二次拖拽修复、遮挡处理
- **package.json**：新增 Proton/GSAP/Stage.js/LiquidGlass 依赖

### 修复

- 章节过渡 dt 单位错误（导致动画速度异常）
- 画布居中偏移
- 页面暖纸背景（`--ink-paper` 色值）
- 印章遮挡后二次拖拽失效
- 代码质量：消除非空断言、嵌套三元表达式

### 测试

- InkPaintingUtils 单元测试
- GSAP 动画映射单元测试
- **总计：36+ 测试全部通过** ✅

### 文档

- BGM 计划（10 轨 A 方案）
- Seedream 工作流 v2 + 视频抠像规范
- 资产提示词分文件（图片/视频/音效独立）
- 交接文档持续更新

---

## 2026-07-17 — ImageRenderer + 资产系统升级

**提交:** `cef67a4`

### 新增

- **引擎层**：ImageRenderer（Canvas 图片渲染器，支持缩放/裁剪/滤镜）
- **资产文档**：AI 资产构图规范、Seedream/Seedance 提示词手册

### 修改

- **AssetLoader.ts**：重构为异步加载链 + 优先级队列，支持并发限制和重试
- **AssetManifest.ts**：扩展资产路径映射，新增章节分组
- **package.json**：vitest 3.2.6 → 3.2.7
- **.gitignore**：添加 `_test.json`

### 验证

| 检查项 | 结果 |
|--------|:----:|
| TypeScript 编译 | ✅ 零错误 |
| 生产构建 | ✅ 34 modules → 87KB (gzip 22.1KB) |

---

## 2026-07-10 — Phase 2 序章·周王城框架

**提交:** `5595e93`

### 新增

- **章节层**：ChapterPrologue（序章封面/封背/翻页）、ChapterErlitou（壹·二里头陶范合拢）、ChapterGrey（灰页·悬置商裂缝嵌套）、ChapterZhou（贰·周王城孔老圆心/礼成/问道）、ChapterDemoEnd（演示结束画面）
- **谜题层**：NestPuzzle（嵌套谜题，裂缝对齐），配套测试 nest.test.ts（14 个测试）
- **音频系统**：AudioManager（Web Audio API 封装）、BronzeSound（11 青铜音触发）
- **UI 层**：StampEffect（印章动画）、DefinitionPopup（≤4 字释义弹窗）
- **资产层**：VideoTrigger（Seedance 视频触发机制）
- **设计文档**：Phase2_Seedream 提示词 v1（序章 → 周王城资产生成用）

### 修改

- **main.ts**：集成 Phase 2 章节路由 + 音频系统初始化
- **ChapterTutorial.ts**：适配新引擎接口
- **AssetManifest.ts**：新增 Phase 2 资产路径映射
- **constants.ts**：新增 Phase 2 章节/谜题常量

### 验证

| 检查项 | 结果 |
| -------- | :----: |
| TypeScript 编译 (`tsc --noEmit`) | ✅ 零错误 |
| 测试 (`vitest run`) | ✅ **26/26 通过** (alignment 12 + nest 14) |
| 生产构建 (`npm run build`) | ✅ 28 modules → 85KB (gzip 21.8KB) |
| 预览服务器 | ✅ `localhost:3000` 正常响应 |

---

## Phase 1 — 引擎核心 + 教学关（已发布）

该阶段完整变更见 [PHASE1_COMPLETE.md](./PHASE1_COMPLETE.md)。

### 2026-06-22

- `a7a62db` — fix: L3 rotation puzzle auto-solve — 偏移起始角度打破预对齐，跳过首帧拖拽
- `97da750` — chore: update README to reflect current Phase 1 codebase state
- `daf2f39` — feat: 完成核心引擎和基础架构（引擎层/谜题层/章节层/资产层/状态层/UI层/工具层/测试）
- `ea89053` — chore: update TypeScript configuration to disable output and adjust path settings
- `1ed329e` — chore: initialize project with TypeScript, Vite, and Vitest
- `a3cd143` — docs: initial commit — all design documents (18 files, 5-phase plan)
