# 铜声·识洛

**Gorogoa-Like 2D 拼接解谜独立游戏 · 洛阳 3800 年历史**

> 识 = 认领者。铜声识别了洛阳，洛阳识别了你。

| 字段 | 值 |
|---|---|
| 创建日期 | 2026-06-15 |
| 技术栈 | TypeScript 5.x + HTML5 Canvas 2D + Vite + Vitest + GSAP + Proton + Stage.js |
| 平台 | Web（PC + 移动端） |
| 目标时长 | ~90 分钟完整流程 |

---

## 开发进度

```
最新提交: 8063bd0 — feat: asset replacement library + particle colophon + debug API
当前阶段: Phase 4 — 北魏 → 隋唐 → 尾声   ← 你在这里
下一阶段: Phase 5 — 打磨 + 测试 + 发布

> ⚡ 正在进行：资产替换工作流 + 粒子题词系统 + 章节文案数据
```

| 阶段 | 内容 | 工时 | 里程碑 | 状态 |
|---|---|---|---|---|
| ✅ Phase 0 | 设计文档 + 项目脚手架 | — | 18 份设计文档就绪 | ✅ 完成 |
| ✅ Phase 1 | 引擎核心 + 教学关 L1-L3 | ~40h | M1: 3 教学关可玩 (12 tests) | ✅ 完成 |
| ✅ Phase 2 | 序章 → 周王城 MVP | ~45h | M2: ~30min 体验 | ✅ 完成 |
| ✅ **Phase 3** | **东汉 → 曹魏** | ~30h | M3: ~45min 体验 | ✅ **完成** |
| 🔄 **Phase 4** | **北魏 → 隋唐 → 尾声** | ~35h | M4: 完整 ~90min | 🔄 **进行中** |
| ⬜ Phase 5 | 打磨 + 测试 + 发布 | ~25h | M5: 发布候选 | ⬜ 待启动 |

### 最近更新

| 日期 | 提交 | 内容 |
|---|---|---|
| 2026-07-19 | — | 🏗️ 资产替换工作流 + 粒子题词系统 + 章节文案数据 + 调试 API |
| 2026-07-19 | `e973db0` | 🏆 **Phase 3 东汉·曹魏 6 章完成** (70 tests, 367KB) |
| 2026-07-18 | `aca8619` | 🎵 BGM 计划 + 资产工作流 v2 + 视频抠像规范 |
| 2026-07-18 | `d42227e` | ✨ 纸纹过渡动画 + 灰页 WebGL 玻璃光晕 |
| 2026-07-18 | `a3d703b` | 🎬 章节淡入淡出 + VFX 粒子 (Proton) + 印章修复 |
| 2026-07-18 | `ca22851` | 🖌️ InkPainting 移植 + GSAP 动画 + 色彩常量 |
| 2026-07-18 | `aee7675` | 🎛️ Stage.js HUD 暂停菜单（含静音切换） |
| 2026-07-17 | `cef67a4` | 🖼️ ImageRenderer + 资产系统升级 + 提示词手册 |
| 2026-07-10 | `5595e93` | 🏗️ Phase 2 框架：序章/二里头/灰页/周王城章节 |
| 2026-06-22 | `daf2f39` | 🚀 核心引擎 + 教学关 L1-L3（21 源文件） |

### Phase 2 交付物

| 模块 | 文件 | 说明 |
|---|---|---|
| **章节** | ChapterPrologue | 序章（封面/封背/翻页） |
| | ChapterErlitou | 壹·二里头「陶范合拢」 |
| | ChapterGrey | 灰页·悬置商「裂缝嵌套」 |
| | ChapterZhou | 贰·周王城「孔老圆心/礼成/问道」 |
| | ChapterDemoEnd | 演示结束画面 |
| **谜题** | NestPuzzle + tests | 嵌套对齐谜题（14 测试） |
| **VFX** | Proton 粒子引擎 | VFX 粒子特效框架 |
| | 纸纹过渡动画 | 章节切换暖纸纹理过渡 |
| | WebGL 光晕 | 灰页玻璃光晕效果 |
| **动画** | GSAP 集成 | 全局动画驱动 |
| | InkPainting | 水墨渲染移植 |
| | 淡入淡出 | 章节切换过渡 |
| **UI** | StampEffect | 印章动画 |
| | DefinitionPopup | ≤4 字释义弹窗 |
| | Stage.js HUD 菜单 | 暂停/设置/静音切换 |
| **音频** | AudioManager | Web Audio API 封装 |
| | BronzeSound | 11 青铜音触发系统 |
| **引擎** | ImageRenderer | Canvas 图片渲染（缩放/裁剪/滤镜） |
| **资产** | VideoTrigger | Seedance 视频触发 |
| | AssetLoader | 异步加载链 + 优先级队列 |
| | AssetManifest | 路径映射 + 章节分组 |
| **文档** | BGM 计划 | 10 轨 A 方案 |
| | Seedream 工作流 v2 | 比例优先 + 视频抠像规范 |
| | 提示词手册 | Seedream/Seedance 编写指南 |
| | Phase2 提示词 v1 | 序章→周王城 AI 绘图提示词 |

### Phase 3 交付物

| 模块 | 文件 | 说明 |
|---|---|---|
| **章节** | ChapterDongHan_Zili | 叁·东汉「字立」拖拽对位 3 选 1 |
| | ChapterDongHan_Diting | 叁·东汉「地听」八龙首方向判定 🏆 |
| | ChapterDongHan_Zhicheng | 叁·东汉「纸成」4 档角度吸附 |
| | ChapterDongHan_Tuo | 叁·东汉「托」刀背敲手→反光引路两段拖拽 |
| | ChapterCaoWei_Jincheng | 肆·曹魏「烬城」三层同心灰环顺序解谜 |
| | ChapterCaoWei_Shiqi | 肆·曹魏「诗起」三诗人风传递自动动画 |
| **谜题** | DirectionPuzzle + tests | 方向判定谜题（渐进线索 + 震颤反馈） |
| **测试** | phase3-smoke.test.ts | 36 冒烟测试（每章 5 + DirectionPuzzle 6） |
| **改进** | ChapterZhou | 周·打桩强制左→右顺序 + 错误顺序震动反馈 |
| | ChapterPrologue | 序章标题对比度提升 |
| **资产** | Seedream Batch 1/2/3 | 教学关 + Phase 2 + Phase 3 AI 绘图提示词 |
| | 提示词精简版 | Phase 2-3 统一提示词速查 |
| **文档** | 代码编写计划 | 更新至 Phase 3 架构 |

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
├── CHANGELOG.md                    # 📝 版本日志
├── 工作提示词_章节文案粒子系统.md     # 📄 文案 + 粒子系统 AI 提示词
├── 资产替换文件库/                   # 🖼️ 结构化资产仓库（序章→尾声+音频/视频/UI）
├── 故事线/                          # 📄 设计文档
│   ├── 全章故事线_v2_0.md           # — 完整故事线（12 谜题 + VFX 标注）
│   └── 场景/                        # — 11 个场景原始文件
│
├── 资产/                            # 📄 资产清单 + 🎨 AI 提示词
│   ├── 资产清单_v2_0.md             # — 235 图 + 16 视频 + 14 音效
│   ├── AI资产构图规范.md             # — AI 绘图构图标准
│   ├── Seedream_Seedance_提示词手册.md # — 提示词编写指南
│   ├── Phase2_Seedream提示词_v1.md   # — 序章→周王城 AI 绘图提示词
│   ├── Seedream_Batch1_教学关.md    # — 教学关 L1-L3 绘图提示词
│   ├── Seedream_Batch2_Phase2.md    # — Phase 2 章节提示词补充
│   ├── Seedream_Batch3_Phase3.md    # — Phase 3 章节提示词
│   ├── Seedream图片提示词_Phase2-3_精简版.md # — 提示词速查
│   ├── BGM提示词_Phase2.md           # — BGM 提示词
│   ├── 铜声音效提示词_Phase2.md       # — 铜声音效提示词
│   └── 脑暴记录/                    # — V30/V31 合并设计决策
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
    │   ├── AnimationEngine.ts      #   Tween + 关键帧回放
    │   ├── ImageRenderer.ts        #   图片渲染（缩放/裁剪/滤镜）
    │   └── InkPainting.ts          #   水墨渲染效果
    ├── puzzle/                     # 谜题层
    │   ├── PuzzleBase.ts           #   抽象谜题接口
    │   ├── AlignmentPuzzle.ts      #   拖拽对齐谜题
    │   ├── NestPuzzle.ts           #   嵌套对齐谜题（L2→灰页）
    │   ├── RotationPuzzle.ts       #   旋转匹配谜题
    │   └── DirectionPuzzle.ts      #   方向判定谜题（Phase 3）
    ├── chapters/                   # 章节层
    │   ├── ChapterBase.ts          #   章节基类
    │   ├── ChapterPrologue.ts      #   序章（封面/封背/翻页）
    │   ├── ChapterErlitou.ts       #   壹·二里头（陶范合拢）
    │   ├── ChapterGrey.ts          #   灰页·悬置商（裂缝嵌套）
    │   ├── ChapterZhou.ts          #   贰·周王城（孔老圆心/礼成/问道）
    │   ├── ChapterDongHan_Zili.ts  #   叁·东汉（字立 3 选 1）
    │   ├── ChapterDongHan_Diting.ts#   叁·东汉（地听八龙首）
    │   ├── ChapterDongHan_Zhicheng.ts# 叁·东汉（纸成角度吸附）
    │   ├── ChapterDongHan_Tuo.ts   #   叁·东汉（托两段拖拽）
    │   ├── ChapterCaoWei_Jincheng.ts#  肆·曹魏（烬城灰环）
    │   ├── ChapterCaoWei_Shiqi.ts  #   肆·曹魏（诗起风传递）
    │   ├── ChapterTutorial.ts      #   教学关 L1-L3
    │   └── ChapterDemoEnd.ts       #   演示结束画面
    ├── audio/                      # 音频层
    │   ├── AudioManager.ts         #   Web Audio API 封装
    │   └── BronzeSound.ts          #   11 青铜音触发
    ├── state/                      # 状态层
    │   └── GameState.ts            #   全局状态 + 事件总线
    ├── data/                       # 数据层
    │   └── chapterCopy.ts          #   29 处章节完成文案（竖排） 
    ├── assets/                     # 资产层
    │   ├── AssetManifest.ts        #   资产路径映射
    │   ├── AssetLoader.ts          #   预加载 + 懒加载
    │   └── VideoTrigger.ts         #   Seedance 视频触发
    ├── ui/                         # UI 层
    │   ├── TutorialOverlay.ts      #   教学引导覆盖层
    │   ├── StampEffect.ts          #   印章动画
    │   ├── DefinitionPopup.ts      #   ≤4 字释义弹窗
    │   └── HUDMenu.ts              #   暂停/设置菜单 (Stage.js)
    ├── tests/                      # 测试
    │   ├── alignment.test.ts       #   拼合对准测试
    │   ├── nest.test.ts            #   嵌套谜题测试
    │   ├── inkpainting.test.ts     #   水墨渲染测试
    │   ├── phase3-smoke.test.ts    #   Phase 3 冒烟测试（36）
    │   └── particle-colophon-prototype.html #   粒子题词 HTML 原型
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
| 源文件 | 42 TypeScript 模块 |
| 单元测试 | 70（34 原有 + 36 Phase 3）✅ 全部通过 |
| 构建产物 | ~367KB（gzip 106KB） |

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
