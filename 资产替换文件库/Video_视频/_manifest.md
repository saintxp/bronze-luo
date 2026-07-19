# 视频文件 · 替换清单

> 所有视频替换 Seedance AI 生成片段。引擎以 `<video>` 叠加层方式播放。
> 双编码交付：H.264 (MP4) + VP9 (WebM)

---

## 视频规格全局要求

| 参数 | 值 |
| --- | --- |
| 分辨率 | 1920×1080 (所有视频统一) |
| 帧率 | 24fps |
| 色彩空间 | sRGB, BT.709 |
| 比特率 | 8-12 Mbps (Tier1) / 4-8 Mbps (Tier2) |
| 音频 | 无音频轨（音效由引擎独立触发） |
| Alpha | 不需要——全屏叠加（additive / screen 混合模式） |

> 注：V03（编钟声波）、V04（枯枝紫光）如果使用 additive/screen 混合，
> 建议生成 **纯黑背景+发光主体** 素材，引擎端用 `globalCompositeOperation: 'screen'` 叠加。

---

## Tier1 · 必须 AI 视频（4段 · 23.5s）

| 文件名 | 时长 | 帧数 | 对应章节 | 内容 | 混合模式 |
| --- | --- | --- | --- | --- | --- |
| `video_copper-flood.mp4` | 2.5s | 60 | 序章 | 铜液四角合拢吞没地图→翻页 | normal |
| `video_bell-wave.mp4` | 3s | 72 | 周·礼成 | 编钟声波涟漪扩散→全组共振→声波全城 | screen |
| `video_tower-burn.mp4` | 6s | 144 | 北魏·烬 | **全书唯一视觉高潮**：逐层点燃→0.3s真空→全屏火焰 | normal |
| `video_mirror-shatter.mp4` | 3s | 72 | 隋唐·千秋镜 | 千秋镜碎裂→裂缝扩大→转睢阳城头 | normal |

---

## Tier2 · 可降级为帧序列（12段 · 25.5s）

| 文件名 | 时长 | 帧数 | 对应章节 | 内容 | 降级方案 |
| --- | --- | --- | --- | --- | --- |
| `video_copper-pour.mp4` | 3s | 72 | 二里头 | 铜液灌入陶范→龙尾化绳 | 3 帧序列 |
| `video_purple-light.mp4` | 1.5s | 36 | 周·问道 | 枯枝戳破圆心→紫光漏下 | 2 帧序列 |
| `video_hair-pulp.mp4` | 2s | 48 | 周·问道 | 白发飘入纸浆→纤维封印 | 3 帧序列 |
| `video_jiaowei-qin.mp4` | 3s | 72 | 汉·字立 | 焦尾琴·火中抢桐→叩木→弦自震 | 3 帧序列 |
| `video_copper-ball-drop.mp4` | 1.5s | 36 | 汉·地听 | 铜丸坠落→暂停→入蟾蜍口 | 3 帧序列 |
| `video_supernova.mp4` | 2.5s | 60 | 汉·地听 | SN185 超新星夜空爆发 | 2 帧序列 |
| `video_ash-collapse.mp4` | 2.5s | 60 | 曹魏·烬城 | 灰自动裂开→坍缩→溶解成水洼 | 3 帧序列 |
| `video_poem-wind.mp4` | 4s | 96 | 曹魏·诗起 | 三诗人风传递（风托三稿依次飞） | 3 帧序列 |
| `video_clothes-transform.mp4` | 5s | 120 | 北魏·衣归 | 铜镜祖孙→胡服风化→迁都大雨（复合） | 4 帧序列 |
| `video_peony-bloom.mp4` | 2.5s | 60 | 隋唐·归田 | 全城牡丹同帧盛放 | 2 帧序列 |
| `video_goddess-scatter.mp4` | 4s | 96 | 尾声 | 天女散花·威亚飞天+花瓣飘落人群 | 3 帧序列 |
| `video_flashback.mp4` | 4s | 96 | 尾声 | 八个半秒闪回——每章最后一帧快速序列 | 8 帧序列 (Tier3) |

---

## 视频文件命名规范

```
{chapter-prefix}_{content}.mp4
{chapter-prefix}_{content}.webm

例:
prologue_copper-flood.mp4
wei_tower-burn.mp4
tang_peony-bloom.mp4
```

---

## 优先级

```
🥇 P0:  video_copper-flood, video_bell-wave, video_copper-pour,
       video_purple-light, video_hair-pulp
🥈 P1:  video_jiaowei-qin, video_copper-ball-drop, video_supernova,
       video_ash-collapse, video_poem-wind
🥉 P2:  video_tower-burn, video_clothes-transform, video_mirror-shatter,
       video_peony-bloom, video_goddess-scatter, video_flashback
```

## 总文件数: 16 段视频 (×2 编码 = 32 文件)
