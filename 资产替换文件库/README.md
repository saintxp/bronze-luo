# 资产替换文件库 · 总索引

> **全量资产清单** —— 从占位符→真实文件的精确规格
> **用途**：生图后加工 → 放入对应目录 → 替换 Canvas 2D 占位
> **不是** Seedream 提示词，是精确的像素级规格

---

## 全库统计

| 类别 | 目录 | 图像 | 视频 | 音频 |
| --- | --- | --- | --- | --- |
| 教学关 | `00_教学关/` | 8 | — | — |
| 序章 | `01_序章/` | 5 | 1 | — |
| 二里头 | `02_二里头/` | 13 | 1 | — |
| 灰页 | `03_灰页/` | 8 | — | — |
| 周王城 | `04_周王城/` | ~55 | 3 | — |
| 东汉 | `05_东汉/` | ~47 | 3 | — |
| 曹魏 | `06_曹魏/` | ~22 | 2 | — |
| 北魏 | `07_北魏/` | ~42 | 2 | — |
| 隋唐 | `08_隋唐/` | ~47 | 2 | — |
| 尾声 | `09_尾声/` | 17 | 1 | — |
| UI 通用 | `UI_通用/` | ~18 | — | — |
| 启动界面 | `Start_启动界面/` | 4 | — | — |
| 结尾界面 | `End_结尾界面/` | 5 | — | — |
| 视频 | `Video_视频/` | — | 16 | — |
| 音频 | `Audio_音频/` | — | — | 14 |
| **合计** | | **~291** | **16** | **14** |

> 注：图像总数 ~291 超过资产清单 v2.0 的 235，因为将序列帧、正反双面、叠加层、
> 启动/结尾界面等按独立文件计算。235 是设计阶段的"画面格"数量，291 是实际交付文件数。

---

## 全局常数速查

| 常数 | 值 | 文件 |
| --- | --- | --- |
| 画布逻辑分辨率 | 1920 × 1080 | `constants.ts: CANVAS_WIDTH/HEIGHT` |
| DPR | 2x (=3840×2160 物理像素) | `CanvasManager.ts` |
| 吸附阈值 | 30px (桌面) / 36px (移动) | `constants.ts: SNAP_THRESHOLD` |
| 接近反馈阈值 | 80px | `constants.ts: NEAR_THRESHOLD` |
| 装订尺寸 | 60px² → display 150px² | `constants.ts: STAMP_SIZE` |
| 翻页淡入淡出 | 350ms | `main.ts: FADE_DURATION` |
| 装订弹入 | 0.55s (back.out) + 1.0s hold + 0.35s fade | `StampEffect.ts` |

---

## 画布坐标系统

```
(0,0) ────────────────────────── (1920, 0)
  │                                  │
  │     BG Canvas (z=0)              │
  │     Puzzle Canvas (z=1)          │
  │     VFX Canvas (z=2)             │
  │     UI Canvas (z=3)              │
  │     Map Canvas (z=4)             │
  │                                  │
(0, 1080) ──────────────────── (1920, 1080)
```

### 常用参考点

| 点 | 坐标 |
| --- | --- |
| 画布中心 | (960, 540) — `CX, CY` |
| 印章默认位置 | (1460, 454) — 右上区域 |
| 合缝 x (二里头) | (950, —) — `SEAM_X` |
| 孔子圆心 (周) | (840, 540) — `KONGZI_CENTER` |

---

## 替换步骤（未来执行时参考）

1. 将生成的 PNG 按文件名放入 `public/assets/` 对应子目录
2. 更新 `AssetManifest.ts` 路径映射（目前路径已预设好）
3. 在 `AssetLoader.ts` 中添加 `preload` 调用
4. 在对应 `Chapter*.ts` 的 `render*()` 方法中将 `ctx.drawImage(img, ...)` 替换 Canvas 2D 绘图
5. 运行 `npm run dev`，目视验证
6. 千问 VL 截图审查

---

## 占位符→替换映射速查

| 当前占位方式 | 替换后 |
| --- | --- |
| `drawPaperBackground(ctx)` | `ctx.drawImage(bgImage, 0, 0)` |
| `ctx.fillRect / ctx.strokeRect` 手绘形状 | `ctx.drawImage(elementPNG, x, y)` |
| `ctx.arc / ctx.quadraticCurve` 手绘曲线 | PNG with Alpha → drawImage |
| `OscillatorNode` 蜂鸣音 | `AudioBufferSourceNode` 播放 mp3 |
| `<video>` placeholder (无文件) | `<video src="video_xxx.mp4">` |

---

## 各章 quick links

- [00_教学关](00_教学关/_manifest.md)
- [01_序章](01_序章/_manifest.md)
- [02_二里头](02_二里头/_manifest.md)
- [03_灰页](03_灰页/_manifest.md)
- [04_周王城](04_周王城/_manifest.md)
- [05_东汉](05_东汉/_manifest.md)
- [06_曹魏](06_曹魏/_manifest.md)
- [07_北魏](07_北魏/_manifest.md)
- [08_隋唐](08_隋唐/_manifest.md)
- [09_尾声](09_尾声/_manifest.md)
- [UI_通用](UI_通用/_manifest.md)
- [Video_视频](Video_视频/_manifest.md)
- [Audio_音频](Audio_音频/_manifest.md)
- [Start_启动界面](Start_启动界面/_manifest.md) ← 设计稿+资产
- [End_结尾界面](End_结尾界面/_manifest.md) ← 设计稿+资产

---

> **v1.1 资产替换文件库完成。** 新增启动界面（含设计稿）和结尾跳出界面（含设计稿）。 每个 `_manifest.md` 包含该章所有替换文件的精确像素尺寸、形状要求、Alpha 通道约定、锚点坐标和引擎渲染参数。
