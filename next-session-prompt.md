# 新会话启动提示词

把这个文件的内容粘贴到新会话作为第一条消息。

---

## 铜声·识洛 — Phase 1 已完结，启动 Phase 2

### 上下文速览

这是一个 Gorogoa-like 2D 拼图独立游戏，HTML5 Canvas + TypeScript + Vite。

**Phase 1 已完成：** 21 个源文件，教学关 L1（拖门板）+ L2（嵌套透视）+ L3（旋转齿轮）引擎可编译运行。L3 自动通关 Bug 已修复。

**当前最新提交：** `a7a62db` — fix: L3 rotation puzzle auto-solve

**工作区：** 干净，无未提交改动（`PHASE1_COMPLETE.md` 交接文档和本文件除外）

**构建验证：**
- `npx tsc --noEmit` ✅ 零错误
- `npx vitest run` ✅ 12/12 通过（alignment.test.ts）
- `npm run build` ✅ 18 modules → 25KB gzip 7.9KB

### 立即执行

```bash
# 1. 先读交接文档，了解完整架构
cat PHASE1_COMPLETE.md

# 2. 读设计文档，了解故事和谜题细节
cat "故事线/全章故事线_v2_0.md"
cat "代码/代码编写计划_v2_0.md"

# 3. 读现有引擎代码，理解当前实现
# 主要是阅读 constants.ts，PuzzleBase.ts，ChapterBase.ts，ChapterTutorial.ts，DragHandler.ts

# 4. 启动 dev server 验证
npm run dev
# 浏览器打开 http://localhost:3000，测试 L1→L2→L3 端到端通关
```

### Phase 2 目标 M2：序章→周王城 MVP（~45h）

产出 ~30 分钟可玩体验，包含 3 个 P0 谜题：

| 内容 | 类型 | 框架 | 关键点 |
|------|:----:|:----:|--------|
| 序章 | 过场 | ~4 | 封面/封背/翻页动画，铜液吞没视频占位 |
| 壹·二里头「陶范合拢」 | AlignmentPuzzle | 7 | 两半陶范拖拽合拢 |
| 灰页「裂缝嵌套」 | **NestPuzzle**（新建） | 6 | 嵌套层对齐，L2 教学→正式升级 |
| 贰·周王城「孔老圆心」 | AlignmentPuzzle | 3 | 孔子+老子对准圆心 |
| 贰·周王城「礼成/问道」 | 过场 + 交互 | — | 编钟声波，礼乐秩序 |

### 需新建的文件

```
src/chapters/ChapterPrologue.ts    — 序章
src/chapters/ChapterErlitou.ts     — 壹·二里头
src/chapters/ChapterGrey.ts        — 灰页·悬置商
src/chapters/ChapterZhou.ts        — 贰·周王城
src/puzzle/NestPuzzle.ts           — 嵌套谜题类
```

### 关键约束

1. **框架预算**：正式章 P0 总计 45 帧硬上限（教程 6 帧已用完），每帧对应一个静态场景画面
2. **"侧写不告"**：所有角色通过 ≥2 层视觉线索展示，不露正脸不标名字
3. **跨章禁止**：不要求玩家记忆前一章内容
4. **90%+ 拖拽对位**：唯一非拖拽交互是旋转（瘦骨），仅在 Phase 4 实现
5. **青铜色板**：序章暖棕古铜、二里头铜金松石、灰页全灰、周王城铜绿礼白
6. **青铜音**：序章"咕嘟"（铜液沸腾）→ 通过 EventBus `bronze:sound` 触发
7. **交互范式**：90% 拖拽对位，不引入参数调节或独立缩放

### Phase 2 开发顺序

```
Phase 2a: NestPuzzle 类（复用 L2 教学逻辑）+ 单元测试
Phase 2b: 序章 ChapterPrologue（封面/封背/翻页/铜液动画）
Phase 2c: 二里头 ChapterErlitou（陶范合拢，AlignmentPuzzle）
Phase 2d: 灰页 ChapterGrey（裂缝嵌套，NestPuzzle）
Phase 2e: 周王城 ChapterZhou（孔老圆心 + 礼成/问道过场）
```

**保持 CLAUDE.md 中已有的编码规范：** 常量集中管理、EventBus 通信、async/await 动画、AssetManifest 路径、PuzzleBase 继承体系。
