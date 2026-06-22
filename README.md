# 铜声·识洛

**Gorogoa-Like 2D 拼接解谜独立游戏 · 洛阳 3800 年历史**

> 识 = 认领者。铜声识别了洛阳，洛阳识别了你。

| 字段 | 值 |
|---|---|
| 创建日期 | 2026-06-15 |
| 技术栈 | TypeScript 5.x + HTML5 Canvas 2D + Vite + Vitest |
| 平台 | Web（PC + 移动端） |
| 目标时长 | ~90 分钟完整流程 |

---

## 开发进度

```
最新提交: daf2f39 — feat: 完成核心引擎和基础架构
当前阶段: Phase 1 — 引擎核心 + 教学关开发中   ← 你在这里
下一阶段: Phase 2 — 序章 → 周王城 MVP
```

| 阶段 | 内容 | 工时 | 里程碑 |
|---|---|---|---|
| ✅ Phase 0 | 设计文档 + 项目脚手架 | — | 18 份设计文档就绪 |
| 🔄 **Phase 1** | **引擎核心 + 教学关 L1-L3** | ~40h | M1: 3 教学关可玩 |
| ⬜ Phase 2 | 序章 → 周王城 MVP | ~45h | M2: ~30min 体验 |
| ⬜ Phase 3 | 东汉 → 曹魏 | ~30h | M3: ~45min 体验 |
| ⬜ Phase 4 | 北魏 → 隋唐 → 尾声 | ~35h | M4: 完整 ~90min |
| ⬜ Phase 5 | 打磨 + 测试 + 发布 | ~25h | M5: 发布候选 |

---

## 目录结构

```
铜声·识洛/
├── README.md                       # 本文件
├── CLAUDE.md                       # AI 协作配置 + 设计规范
├── index.html                      # 入口 HTML
├── package.json                    # 依赖管理
├── tsconfig.json                   # TypeScript 配置
├── vite.config.ts                  # Vite 构建配置
│
├── 故事线/                          # 📄 设计文档
│   ├── 全章故事线_v2_0.md           # — 完整故事线（12 谜题 + VFX 标注）
│   ├── 脑暴记录/                    # — V30/V31 合并设计决策
│   └── 场景/                        # — 11 个场景原始文件
│
├── 资产/                            # 📄 资产清单
│   └── 资产清单_v2_0.md             # — 235 图 + 16 视频 + 14 音效
│
├── 代码/                            # 📄 代码计划
│   └── 代码编写计划_v2_0.md          # — Canvas+TS 技术架构
│
└── src/                            # 💻 源代码
    ├── main.ts                     # — 入口 + 启动引导
    ├── engine/                     # 引擎层
    │   ├── CanvasManager.ts        #   多层 Canvas 管理
    │   ├── LayerRenderer.ts        #   图层合成（拖拽/缩放/平移）
    │   ├── DragHandler.ts          #   拖拽交互（鼠标 + 触屏）
    │   ├── HitDetector.ts          #   碰撞/吸附检测
    │   └── AnimationEngine.ts      #   Tween + 关键帧回放
    ├── puzzle/                     # 谜题层
    │   ├── PuzzleBase.ts           #   抽象谜题接口
    │   ├── AlignmentPuzzle.ts      #   拖拽对齐谜题
    │   └── RotationPuzzle.ts       #   旋转匹配谜题
    ├── chapters/                   # 章节层
    │   ├── ChapterBase.ts          #   章节基类
    │   └── ChapterTutorial.ts      #   教学关
    ├── state/                      # 状态层
    │   └── GameState.ts            #   全局状态 + 事件总线
    ├── assets/                     # 资产层
    │   ├── AssetManifest.ts        #   资产路径映射
    │   └── AssetLoader.ts          #   预加载 + 懒加载
    ├── ui/                         # UI 层
    │   └── TutorialOverlay.ts      #   教学引导覆盖层
    ├── tests/                      # 测试
    │   └── alignment.test.ts       #   拼合对准测试
    └── utils/                      # 工具
        ├── math.ts                 #   向量/碰撞/吸附数学
        ├── easing.ts               #   缓动函数
        ├── EventBus.ts             #   事件总线
        ├── logger.ts               #   调试日志
        └── constants.ts            #   全局常量
```

---

## 关键数字

| 指标 | 数值 |
|---|---|
| 拼接谜题 | 12（7 P0 + 4 P1）+ 3 教学关 |
| 关键帧 | 51（45 正式 + 6 教学）⭐ 硬性上限 |
| VFX 动画 | ~66s（16 段 AI 视频） |
| 静态图 + 音效 | ~235 张 + 14 音效 |
| 角色 | 18 位（全部"侧写不告"） |
| 青铜音 | 11 声 |

## 开发命令

```bash
npm run dev      # 启动 Vite 开发服务器（HMR）
npm run test     # 运行 Vitest 测试
npm run build    # 生产构建
```

---

## 设计核心原则

- 🎨 **InkView 水墨设计系统** — 暖宣纸底 + 朱砂红点缀 + 章节独立色板
- 🎯 **90%+ 拖拽对齐** — 仅 1 个旋转谜题（瘦骨·双力共振），需叙事正当化
- 🚫 **跨章禁止** — 无需玩家记忆前章内容
- 👤 **侧写不告** — 角色不露脸、不标名，≥2 层视觉线索
- 🔗 **向下按姿势链** — 贯穿全游戏：二里头合范 → 周按桩 → ... → 尾声合册
- 🔁 **Möbius 环** — 序章封底 = 尾声 = 玩家自己的脸
