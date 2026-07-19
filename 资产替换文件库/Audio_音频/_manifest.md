# 音频文件 · 替换清单

> 14 个音效，替换当前 `AudioManager` 中的 OscillatorNode 占位音

---

## 音频规格全局要求

| 参数 | 值 |
| --- | --- |
| 格式 | WAV 48kHz/24bit (master) + MP3 320kbps (web) |
| 声道 | 立体声 (环境音) / 单声道 (铜声) |
| 响度 | -14 LUFS (integrated) |

---

## 铜声十一声（一章不缺）

| 文件名 | 时长 | 对应章节 | 触发时机 | 内容描述 | 来源 |
| --- | --- | --- | --- | --- | --- |
| `audio_gudu_copper-liquid.mp3` | 1.0s | 壹·二里头 | 陶范合拢 solve | 「咕嘟」——铜液液态冒泡声，闷响+金属共鸣 | Suno AI |
| `audio_weng_bell-chime.mp3` | 3.0s | 周·礼成 | 编钟共振 | 「嗡——」——编钟固态振动长延音，低频持续 | Suno AI |
| `audio_ding-ding_carriage.mp3` | 2.0s | 周·问道 | 孔子入洛 | 「叮——叮——」——铜銮铃行进中摇晃，间隔 0.8s | Suno AI |
| `audio_da_copper-drop.mp3` | 0.5s | 汉·地听 | 铜丸坠落 | 「嗒」——铜丸从龙口掉落的清脆单音 | 音效库 |
| `audio_dang_toad.mp3` | 1.0s | 汉·地听 | 铜丸入蟾蜍口 | 「当——」——铜球入蟾蜍口的共鸣延音 | Suno AI |
| `audio_zheng_mirror.mp3` | 1.5s | 北魏·衣归 | 铜镜交互 | 「铮——」——铜镜被触碰的清脆金属声 | Suno AI |
| `audio_hua_armor.mp3` | 3.0s | 北魏·河阴 | 河阴暗页进入 | 「哗——」——两千契胡铁骑铜甲摩擦碰撞声 | Suno AI |
| `audio_ding-ding_windchime.mp3` | 2.0s | 北魏·烬 | 风铎旋转 solve | 「玎——玎玎——」——风铎被风吹动，不规律间隔 | Suno AI |
| `audio_gudu_spire-melt.mp3` | 1.0s | 北魏·烬 | 塔刹熔化 | 「咕嘟」——塔刹鎏金铜熔化声，比二里头更低沉悲怆 | Suno AI |
| `audio_dang_mirror-shatter.mp3` | 1.0s | 隋唐·千秋镜 | 镜裂 | 「珰——」——千秋镜碎裂，清脆+碎片零落尾音 | Suno AI |
| `audio_kata_fish-tally.mp3` | 0.5s | 隋唐·鱼符 | 鱼符锁死 | 「咔嗒」——铜鱼符卡进弩机槽的机械锁定声 | 音效库 |

---

## 环境音（3个）

| 文件名 | 时长 | 触发时机 | 内容描述 | Loop |
| --- | --- | --- | --- | --- |
| `audio_ambient_heartbeat.mp3` | 3.0s | 序章封面 | 低频心跳振动——封面特写时的沉重心跳 | ✓ 循环 |
| `audio_ambient_harvester.mp3` | 3.0s | 尾声麦田 | 收割机「嗡——」——现代机械嗡鸣收束全谱铜声 | — |
| `audio_page-turn.mp3` | 0.3s | 每章翻页 | 页翻纸声——宣纸翻过一页的轻响 | — |

---

## 事件总线触发名

在代码中通过以下 ID 触发：

```
eventBus.emit('bronze:sound', { soundId: 'guDu' });
eventBus.emit('bronze:sound', { soundId: 'weng' });
eventBus.emit('bronze:sound', { soundId: 'dingDing' });
// ...等
```

### soundId ↔ 文件名映射

| soundId | 音频文件 |
| --- | --- |
| `guDu` | `audio_gudu_copper-liquid.mp3` |
| `weng` | `audio_weng_bell-chime.mp3` |
| `dingDing` | `audio_ding-ding_carriage.mp3` |
| `da` | `audio_da_copper-drop.mp3` |
| `dang` | `audio_dang_toad.mp3` |
| `zheng` | `audio_zheng_mirror.mp3` |
| `hua` | `audio_hua_armor.mp3` |
| `dingDingWind` | `audio_ding-ding_windchime.mp3` |
| `guDuSpire` | `audio_gudu_spire-melt.mp3` |
| `dangMirror` | `audio_dang_mirror-shatter.mp3` |
| `kata` | `audio_kata_fish-tally.mp3` |

## 总文件数: 14 音效 (×2 格式 = 28 文件)
