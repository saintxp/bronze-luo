# Changelog

## Phase 2 — 序章·周王城 MVP（未发布）

### 新增

- **章节层**：ChapterPrologue（序章封面/封背/翻页）、ChapterErlitou（壹·二里头陶范合拢）、ChapterGrey（灰页·悬置商裂缝嵌套）、ChapterZhou（贰·周王城孔老圆心/礼成/问道）、ChapterDemoEnd（演示结束画面）
- **谜题层**：NestPuzzle（嵌套谜题，裂缝对齐），配套测试 nest.test.ts
- **音频系统**：AudioManager（Web Audio API 封装）、BronzeSound（11 青铜音触发）
- **UI 层**：StampEffect（印章动画）、DefinitionPopup（≤4 字释义弹窗）
- **资产层**：VideoTrigger（Seedance 视频触发机制）
- **设计文档**：Phase2_Seedream 提示词 v1（序章 → 周王城资产生成用）

### 修改

- **main.ts**：集成 Phase 2 章节路由 + 音频系统初始化
- **ChapterTutorial.ts**：适配新引擎接口
- **AssetManifest.ts**：新增 Phase 2 资产路径映射
- **constants.ts**：新增 Phase 2 章节/谜题常量

## Phase 1 — 引擎核心 + 教学关（已发布）

该阶段完整变更见 [PHASE1_COMPLETE.md](./PHASE1_COMPLETE.md)。

### 2026-06-22

- `a7a62db` — fix: L3 rotation puzzle auto-solve — 偏移起始角度打破预对齐，跳过首帧拖拽
- `97da750` — chore: update README to reflect current Phase 1 codebase state
- `daf2f39` — feat: 完成核心引擎和基础架构（引擎层/谜题层/章节层/资产层/状态层/UI层/工具层/测试）
- `ea89053` — chore: update TypeScript configuration to disable output and adjust path settings
- `1ed329e` — chore: initialize project with TypeScript, Vite, and Vitest
- `a3cd143` — docs: initial commit — all design documents (18 files, 5-phase plan)
