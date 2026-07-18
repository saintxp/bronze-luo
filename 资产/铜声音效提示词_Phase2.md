# 铜声·识洛 — 铜声音效提示词（Phase 2 专用）

> 从全游戏 14 个音效中裁出 Phase 2 所需的 5 个。其余音效见 [`铜声音效提示词.md`](铜声音效提示词.md)。

---

## Phase 2 音效清单

| ID | 音效名 | 类型 | 章节 | 形式 | 含义 | 生成方式 |
| :--: | ------ | --- | --- | --- | --- | -------- |
| S01 | 咕嘟 | 铜声1 | 夏·二里头 | 液态铜 | 青铜诞生 | Suno |
| S02 | 嗡—— | 铜声2 | 周·礼成 | 编钟固态振动 | 礼制秩序 | Suno |
| S03 | 叮——叮—— | 铜声3 | 周·问道 | 銮铃行进 | 礼乐起源 | Suno |
| S12 | 封面心跳振动 | 环境音 | 序章/全局 | 低频律动 | 时间的脉搏 | Suno |
| S14 | 页翻纸声 | UI 音效 | 全章复用 | 纸张翻动 | 翻页反馈 | 音效库 |

---

## S01 咕嘟 — 液态铜诞生

- **章节**：夏·二里头
- **触发**：铜液灌入陶范、铜液吞没地图
- **音色**：低频、湿润、厚重，像熔融金属在陶范缝隙中冒泡
- **Suno 提示词**：

```
Molten bronze bubbling and gurgling inside a clay mold,
low-frequency liquid metal pulses, thick viscous texture,
occasional soft popping bubbles, warm ancient atmosphere,
minimal reverb, dry close-mic, no music, no melody, single event, cinematic
```

- **时长**：约 1s
- **文件命名**：`s01_guDu_liquidBronze.wav`

---

## S02 嗡—— — 编钟固态振动

- **章节**：周·礼成
- **触发**：敲击编钟、声波共鸣
- **音色**：单一长音，稳定衰减，金属 but not harsh，有悠长尾音
- **Suno 提示词**：

```
A single ancient bronze bell struck once, long sustained hum,
metallic vibration with slow decay, ritual and solemn,
pure tone, no melody, no rhythm, clean harmonic overtones,
minimal reverb, dry close-mic, no music, single event, cinematic
```

- **时长**：约 3s
- **文件命名**：`s02_weng_bellHum.wav`

---

## S03 叮——叮—— — 銮铃行进

- **章节**：周·问道
- **触发**：孔子马车入洛
- **音色**：清脆、间断、有轻微金属颤音，像古代车马铃
- **Suno 提示词**：

```
Two clear bronze carriage bells ringing in sequence,
light metallic tinkling, ancient Chinese horse bridle bells,
bright but not harsh, short decay, traveling motion feeling,
minimal reverb, dry close-mic, no music, no melody, single event, cinematic
```

- **时长**：约 2s
- **文件命名**：`s03_ding_ding_carriageBells.wav`

---

## S12 封面心跳振动 — 低频环境

- **章节**：序章/全局
- **触发**：集章册封面、章节切换时的低频铺垫
- **音色**：极低频，类似心跳 but 金属质感，不规则
- **Suno 提示词**：

```
Very low frequency bronze heartbeat vibration,
ancient metal pulsing like a living object,
slow irregular rhythm, deep and mysterious,
minimal reverb, sub-bass, no music, no melody, cinematic
```

- **时长**：约 3s（可循环）
- **文件命名**：`s12_heartbeat_bronzePulse.wav`

---

## S14 页翻纸声 — UI 音效

- **章节**：全章复用
- **触发**：章节翻页、相册翻动
- **音色**：纸张摩擦，轻微脆响
- **生成方式**：音效库（推荐）
- **关键词**：paper page turn, ancient book flip
- **时长**：约 0.3s
- **文件命名**：`s14_pageFlip_paper.wav`

---

## Phase 2 音效优先级

1. **最高**：S14 页翻纸声（全局 UI 最频繁）
2. **高**：S01 咕嘟（二头肌头核心反馈）
3. **中**：S02 嗡——、S03 叮——叮——（周王城反馈）
4. **低**：S12 封面心跳（氛围层，可后续补充）
