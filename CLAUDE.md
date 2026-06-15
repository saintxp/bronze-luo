# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**铜声·识洛** = *Bronze Sound · Recognizing Luoyang*  
A Gorogoa-like 2D tile-puzzle indie game about Luoyang's 3,800-year history. The player is a "认领者" (Recognizer) — someone chosen by Luoyang, flipping through a stamp album that *is* the city itself. Möbius strip structure — the prologue back cover = epilogue = the player's own face.

- **Tech Stack:** HTML5 Canvas 2D API + TypeScript 5.x + Vite
- **Platform:** Web (PC + mobile responsive), optional Electron
- **State Management:** Custom FSM per puzzle (no framework)
- **Storage:** localStorage (save/load per chapter + stamp state)
- **Audio:** Web Audio API (11 bronze sounds + ambient)
- **Testing:** Vitest (puzzle alignment math)
- **Target:** ~90 min full playthrough · ~175h dev · ¥200-503 budget

## Current Status

**Design phase — no code yet.** All content is in markdown design documents, which are the source of truth. Code generation starts when Phase 1 begins (engine core + tutorial levels):

- [故事线/全章故事线_v2_0.md](故事线/全章故事线_v2_0.md) — Complete story, 12 puzzles (7 P0 + 4 P1 + 3 tutorials), VFX tier list, 18-character roster
- [代码/代码编写计划_v2_0.md](代码/代码编写计划_v2_0.md) — Tech architecture, module structure, AI pipeline (DeepSeek+Qwen-VL), 5-phase dev plan
- [资产/资产清单_v2_0.md](资产/资产清单_v2_0.md) — Full asset manifest (~235 images + 16 videos + 14 audio), per-chapter asset IDs, MVP priority tiers
- [脑暴记录/V30V31_合并_全记录.md](脑暴记录/V30V31_合并_全记录.md) — Final puzzle design decisions, frame budget rulings, interaction paradigm convergence

## Architecture

### Canvas Multi-Layer Stack

```
UI Canvas    — Stamp effect + definition popup (≤4 chars, topmost)
VFX Canvas   — Seedance video + engine particle overlay
Puzzle Canvas — Player drag interaction layer
BG Canvas    — Static scene backgrounds
Map Canvas   — Luoyang map overlay (prologue/epilogue)
```

Each Canvas renders independently; the engine composites them. Drag events capture on Puzzle Canvas, notify BG Canvas on alignment solve.

### Module Structure (planned)

```
src/
├── main.ts                 — Init + bootstrap
├── engine/
│   ├── CanvasManager.ts    — Multi-layer Canvas management
│   ├── LayerRenderer.ts    — Layer composition (merge/pan/zoom)
│   ├── DragHandler.ts      — Drag interaction (mouse + touch)
│   ├── HitDetector.ts      — Collision/snap detection
│   └── AnimationEngine.ts  — Tween + keyframe playback
├── puzzle/
│   ├── PuzzleBase.ts       — Abstract puzzle interface
│   ├── AlignmentPuzzle.ts  — Drag-to-align (陶范/纸成/托/衣归)
│   ├── NestPuzzle.ts       — Nested layer alignment (灰页)
│   ├── RotationPuzzle.ts   — Rotation match (瘦骨)
│   ├── SequencePuzzle.ts   — Ordered press (归田)
│   └── DirectionPuzzle.ts  — Direction judgment (地听)
├── chapters/               — 23 files (ChapterBase + 22 subclasses)
├── state/
│   ├── GameState.ts        — Global state
│   ├── StampState.ts       — Stamp tracking (9 chapters)
│   ├── ChapterFSM.ts       — Inter/intra-chapter FSM
│   └── SaveManager.ts      — Save/load
├── assets/
│   ├── AssetManifest.ts    — Asset path mapping
│   ├── AssetLoader.ts      — Preload + lazy load
│   └── VideoTrigger.ts     — Seedance video trigger
├── audio/
│   ├── AudioManager.ts     — Web Audio API wrapper
│   ├── BronzeSound.ts      — 11 bronze sound triggers
│   └── AmbientSound.ts     — Environmental audio
├── ui/
│   ├── StampEffect.ts      — Stamp animation
│   ├── DefinitionPopup.ts  — ≤4-char popup
│   ├── MapOverlay.ts       — Ancient Luoyang map
│   └── TutorialOverlay.ts  — Tutorial guidance
└── utils/
    ├── math.ts             — Vector/collision/snap math
    ├── easing.ts           — Easing functions
    └── logger.ts           — Debug logging
```

### State Machine Design

```
[Chapter Init] → [Puzzle Unsolved] → [Puzzle Solved] → [Stamp] → [Definition Popup]
     ↓                              ↓
[Page Turn] ← [All Puzzles Solved] ← [Other Puzzles...]
     ↓
[Next Chapter]
```

Each puzzle has an independent FSM: `IDLE → DRAGGING → NEAR → SNAPPED → SOLVED`

### Three Interaction Primitives Only

| Interaction | Implementation | Used In |
|---|---|---|
| **Drag-to-align** | mousedown/touchstart → mousemove → distance<threshold → snap | ~90% of puzzles |
| **Drag-to-nest** | Pan + zoom layer, detect hole → target overlap | 灰页 (only) |
| **Rotation match** | Single-finger arc drag, 3-position snap | 瘦骨 (only 1, narrative-justified) + 烬 wind-chime |

## Key Design Constraints

- **Frame budget: 45 keyframes** (formal chapters) + **6 keyframes** (tutorial L1-L3, independent budget) = **51 total**. This is a HARD cap per V31 final ruling. No exceptions.
- **Interaction paradigm:** 90%+ drag-to-align. Only one rotation puzzle (瘦骨 dual-force resonance, narrative-justified). No parameter tuning, no standalone zoom. Every heterogeneous interaction must have explicit narrative justification.
- **Cross-chapter prohibition:** No puzzle requires the player to remember content from a previous chapter. All connections must be visible within the same screen. This is a STRUCTURAL BAN, not a style suggestion — cross-page memory tests are explicitly excluded from Gorogoa's design language.
- **"侧写不告" principle:** All 18 characters are shown via ≥2 layers of visual clues (props, silhouettes, context). Never show a face straight-on. Never label a character's name. Player identifies through inference, not exposition.
- **Seedance video (Tier1):** Only 4 scenes — 铜液吞没(序章), 编钟声波(礼成), 塔焚(烬·全书唯一视觉高潮), 千秋镜碎裂(唐). Everything else is Seedream static frames + engine particles.
- **VFX compression principle:** Anything expressible in 2-4 static frames + sound effects must not use Seedance. Tier3 VFX uses static frames + engine tween only.
- **P0 puzzles (7):** 陶范合拢, 裂缝嵌套, 孔老圆心, 八龙首判定, 一镜一衣, 双力共振, 风铎+顺序+烟雾, 榫卯时序按压
- **P1 puzzles (4):** 字立按哪里, 水帘对位, 敲反光逃, 翻面融合
- **"向下按姿势链" across entire game:** 二里头合范 → 周按桩 → 东汉按纸贴碑/端帘/按拓片 → 曹魏抹灰(主动失败) → 北魏覆手(主动失败) → 隋唐韦机尺/狄仁杰手/白居易掌 → 尾声合册(句号)

## AI Collaboration Workflow (DeepSeek + Qwen-VL)

```
[Qwen] Write Seedream/Seedance prompts (Chinese, stronger image understanding)
    ↓
[Seedream/Seedance] Generate assets
    ↓
[Qwen-VL] Visual review → fail → [Qwen] rewrite prompt → regenerate
    ↓ pass
[DeepSeek] Write 100% module code + Vite HMR live test
    ↓
[Qwen-VL] Runtime screenshot verification → issues → [DeepSeek] adjust params
    ↓ pass
[Delivery]
```

- **DeepSeek:** 100% code generation (TypeScript, algorithms, state machines, unit tests, Vite config). DeepSeek's TypeScript strength is the core reason Canvas+TS was chosen over Unity/Godot. Never ask DeepSeek for visual validation.
- **Qwen-VL:** 100% visual validation (asset QA, color consistency, runtime screenshot verification, UI review, "侧写不告" compliance, cross-chapter visual anchor consistency). Never ask Qwen for code generation.
- **Qwen (text):** Seedream/Seedance Chinese prompt writing. Stronger Chinese image understanding than DeepSeek.

## Thematic System

### 11 Bronze Sounds — One per chapter, never skipped

| Chapter | Sound | Form | Meaning |
|---|---|---|---|
| 夏·二里头 | 咕嘟 | Liquid copper | Birth of bronze |
| 周·礼成 | 嗡—— | Bell chime | Ritual order |
| 周·问道 | 叮——叮—— | Carriage bells | Origin of ritual music |
| 汉·地听 | 嗒 | Copper ball drop | Human participation |
| 汉·地听 | 当—— | Ball into toad mouth | Automatic memory |
| 魏·衣归 | 铮—— | Mirror touch | Temperature of contact |
| 魏·河阴 | 哗—— | Armor clash | Violence of bronze |
| 魏·烬 | 玎—— | Wind chime | Played by wind |
| 魏·烬 | 咕嘟 | Spire melting | Return to liquid |
| 唐·千秋镜 | 珰—— | Mirror shatter | Fragmented prosperity |
| 唐·鱼符 | 咔嗒 | Fish tally lock | Locked city, desperate stand |
| 尾声 | 嗡—— | Harvester | Full spectrum closure |

### 4 Hidden Threads (pure visual motifs, zero extra frames)

- 🖐️ **Handprint Trilogy:** 托→瘦骨→归田 — same template hand shape. In 归田 peony frame, semi-transparent overlay shows all three hands momentarily superimposed. Zero extra frame cost.
- 💧 **Three Faces of Water:** 纸成 (immersion, liquid) → 云想 (reflection, mirror) → 烬 (evaporation, steam)
- 🌸 **Peony Six Rings:** 《诗经》→ 东汉(wild) → 曹魏(bud) → 北魏(temple sprout) → 隋唐(full bloom) → 尾声(eternity)
- ⛰️ **Beimang Four Rings:** 东汉(tear pool) → 曹魏(ash panorama) → 河阴(wilderness) → 尾声(wheat field)

### 12 Puzzles Final Table

| # | Chapter | Puzzle | Frames | Priority | Interaction |
|:--:|---|---|:--:|:--:|---|
| — | L1 | Drag alignment | 2 | Tutorial | Drag |
| — | L2 | Window nesting | 2 | Tutorial | Nest |
| — | L3 | Rotation match | 2 | Tutorial | Rotate |
| 1 | 二里头 | Mold halves close | 7 | P0 | Drag align |
| 2 | 灰页 | Crack nesting | 6 | P0 | Drag nest |
| 3 | 周·营洛 | Confucius-Laozi center | 3 | P0 | Drag align |
| 4 | 东汉·字立 | Where to press | 4 | P1 | Drag align |
| 5 | 东汉·地听 | Eight dragon heads | 5 | P0 | Observe+select |
| 6 | 东汉·纸成 | Water screen angle | 6 | P1 | Drag align |
| 7 | 东汉·托 | Knock→light→escape | 5 | P1 | Drag align ×2 |
| 8 | 北魏·衣归 | One mirror, one robe | 5 | P0 | Cross-grid drag |
| 9 | 北魏·瘦骨 | Dual-force resonance | 7 | P0 | **Rotate match** |
| 10 | 北魏·烬 | Wind-chime+order+smoke | 8 | P0 | Rotate+drag |
| 11 | 隋唐·云想 | Flip+front-back merge | 5 | P1 | Drag flip+stack |
| 12 | 隋唐·归田 | Mortise+season press | 8 | P0 | Drag stack+press |

### Scene Chronology

教学关 L1-L3 → 序章 → 壹·二里头 → 灰页(悬置·商) → 贰·周王城(营洛/礼成/问道) → 叁·东汉(字立/地听/纸成/托) → 肆·曹魏(烬城/诗起) → 伍·北魏(衣归/瘦骨/河阴/烬) → 陆·隋唐(脂粉/尺/云想/骨赤/千秋镜·鱼符/空/归田/未竟) → 尾声(合册)

### Color Palette per Chapter

| Chapter | Primary | Secondary | Meaning |
|---|---|---|---|
| 教学 | Line sketch | — | Minimalist, zero formal budget |
| 序章 | Warm brown | Copper gold | Time-worn album cover |
| 壹·二里头 | Copper gold | Turquoise | Earliest bronze + earliest mine |
| 灰页 | Full grey | Dark | Suspended, sleeping, cocoon |
| 贰·周王城 | Bronze green | Ritual white | Order of rites + bell timbre |
| 叁·东汉 | Vermillion | Pitch black | Fire + night + stars |
| 肆·曹魏 | Ash | Ochre | Ruins + ink traces |
| 伍·北魏 | Cinnabar | Lime white | Stone inscription + mirror light |
| 陆·隋唐 | Gold | Polychrome | Golden age spectrum |
| 尾声 | Full spectrum | — | All colors converge |

### 18 Characters (all "侧写不告" — no faces, no names, ≥2 visual clues each)

| Character | Clue 1 | Clue 2 | Clue 3 | Chapter |
|---|---|---|---|---|
| 周公旦 | Sundial shadow | Turtle shell divination | Nine tripods | Zhou |
| 老子 | Green ox | Hangu Pass | Purple mist east | Zhou |
| 孔子 | Carriage+copper bell | Ritual layout empty seat | Twig circle | Zhou |
| 张衡 | Stargazer notes | Pinhole star chart | Seismograph dragon heads | Grey+Han |
| 蔡邕 | Grab paulownia from fire | Scorched-tail qin | String self-vibrates | Han |
| 曹操 | Sunken ink in poem | Wine stain+military seal | — | CaoWei |
| 蔡文姬 | Rouge stain on manuscript | Qin徽+burned paper edge | — | CaoWei |
| 曹植 | Horse galloping on Luo River | "Third year" water drops | Hand hovering an inch above | CaoWei |
| 冯太后 | Mirror middle-aged woman | Han robe on boy's shoulder | Silhouette fades (490 CE) | Wei |
| 孝文帝 | Mirror boy→adult | Han robe on shoulder | Rain relocation+3 chests | Wei |
| 韦机 | 8 chests coins+ledger | Sheepskin drawing+charcoal line | Court robe | Tang |
| 武则天 | Ledger "lipstick money" | Wei Ji's drawing | Paperweight/Buddha | Tang |
| 李白 | Wild cursive+wine stain+rouge | Three old poem lines | — | Tang |
| 杜甫 | Neat script+broken character | Turn back, seven lamps die | — | Tang |
| 颜杲卿 | Rope mark on bridge pillar | Charred palm print | Nail white scratches | Tang |
| 颜真卿 | Brush tip racing across paper | Final vertical stroke = rope line | — | Tang |
| 狄仁杰 | Memorial + official seal | Paperweight finger grooves | — | Tang |
| 白居易 | Poem into sutra shelf | Peony petal on knee | Xiangshan+Longmen | Tang |

## Coding Conventions

1. All puzzle classes extend `PuzzleBase` — never write puzzle logic directly in chapter classes
2. Thresholds as constants: `SNAP_THRESHOLD = 30` — no magic numbers
3. Frame animation with `async/await`: `await anim.play(frame1, 300)`
4. Audio triggers via event bus: `EventBus.emit('bronze:sound', 'guDu')`
5. Asset paths via `AssetManifest`: `ASSETS.bg.erlitou.taoFan` — never hardcode
6. One `Chapter*` subclass per chapter (23 total: ChapterBase + Tutorial + 21 scene files)
7. Unit tests cover all `checkAlignment()` methods on Puzzle classes
8. Use `const`/`let`, not `var`. Prefer arrow functions. Use TypeScript strict mode.
9. Mobile snap threshold: 20% larger than desktop (`SNAP_THRESHOLD * 1.2`)

## Dev Phases Overview

| Phase | Content | Hours | Milestone |
|---|---|---|---|
| Phase 1 | Engine core + Tutorial L1-L3 | ~40h | M1: 3 tutorials playable in browser |
| Phase 2 | Prologue → Zhou King City MVP | ~45h | M2: ~30 min experience, 3 P0 puzzles |
| Phase 3 | Eastern Han → Cao Wei | ~30h | M3: ~45 min experience, 6 puzzles total |
| Phase 4 | Northern Wei → Sui Tang → Epilogue | ~35h | M4: Full ~90 min playthrough |
| Phase 5 | Polish + Test + Ship | ~25h | M5: Release candidate, all platforms |

## Risk Mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| Alignment threshold tuning per puzzle | High | Unit tests cover all alignment math; DeepSeek iterates thresholds per-puzzle |
| Mobile touch drag precision | Medium | Phase 5 dedicated pass; mobile snap threshold 20% larger than desktop |
| Seedance video file size → slow first load | Medium | Lazy load + preload only 1 chapter ahead; 6s tower burn video separately compressed |
| 灰页 nest interaction confusing for players | High | Tutorial L2 teaches nesting explicitly; first nest layer triggers auto-demo |
| 瘦骨 rotation is the only heterogeneous interaction | Low | Tutorial L3 teaches rotation; 3-position snap limits precision requirement |

## Common Commands

No dev commands yet — the project is in design phase. When code starts:

```bash
npm create vite@latest . -- --template ts    # Init
npm install                                   # Dependencies
npm run dev                                   # Vite dev (HMR)
npm run test                                  # Vitest
npx vitest run src/puzzle/alignment.test.ts   # Single test
npm run build                                 # Production build
```


# ============================================
# 以下为 andrej-karpathy-skills 行为准则
# 合并自: https://github.com/multica-ai/andrej-karpathy-skills
# ============================================
# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
