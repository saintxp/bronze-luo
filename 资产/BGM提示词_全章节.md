# 铜声·识洛 — BGM 提示词（方案 A · 11 轨）

> **已确认**：采用章节主题制，全游戏 11 轨 BGM（10 章节轨 + 1 开始界面轨）。  
> **生成工具**：主用 Suno AI（中文提示词），精修可用 Udio（英文提示词）。  
> **输出规格**：每轨 2-3 分钟可循环体，WAV 母版 + OGG 运行版，响度 -16 LUFS。

---

## 一、通用提示词结构

每首 BGM 包含：

- **中文 Suno 提示词**：可直接复制到 Suno Custom Mode。
- **英文 Udio 提示词**：如需 Udio 精修时使用。
- **BPM / 调式**：供后期对速与循环点标记参考。
- **循环说明**：首尾衔接建议。
- **文件名**：`bgm_XX_拼音_英文名.ext`。

### 通用禁止元素

```
禁止：现代电子合成器、电吉他、鼓机、电子贝斯、自动调谐、
      流行和弦进行、西方管弦乐主导、歌词、人声说唱
```

### 通用必备元素

```
必须：中国古代乐器、五声音阶、可无缝循环、氛围感、
      不抢 1-4kHz 人声频段、适合解谜游戏背景
```

---

## 二、逐轨提示词

### 00 开始界面 · 《封题》

- **章节**：开始界面 / 登陆界面 / 首页
- **时长**：2:00
- **BPM**：56
- **调式**：G 商五声音阶
- **乐器**：古琴散音、埙长音、纸张低频震动、远处编钟残响
- **情绪**：神秘、温暖、邀请，像古册封面在黑暗中呼吸
- **循环**：以一个长呼吸式的古琴/埙音起止，任意位置可切入

**中文 Suno 提示词**：

```
中国水墨风格游戏开始界面背景音乐，
古旧集章册封面在暗处呼吸的神秘氛围，温暖而克制，
主要乐器为古琴散音和埙长音，加入极淡的纸张低频震动与远处编钟残响，
G商五声音阶，56 BPM，极慢，几乎没有明显旋律，
可无缝循环，无歌词，无人声，
像在邀请玩家打开一本沉睡的册子
```

**英文 Udio 提示词**：

```
Chinese ink-wash game title screen background music,
ancient stamp album cover breathing in darkness, warm and restrained,
featured instruments: guqin open strings, xun long tones, very subtle paper low-frequency rumble, distant bronze bell decay,
G shang pentatonic, 56 BPM, extremely slow, almost no melody,
seamless loop, no vocals, no lyrics,
like inviting the player to open a sleeping album
```

**文件名**：`bgm_00_fengTi_titleScreen.wav`

---

### 01 教学关 · 《指触》

- **章节**：教学关 L1-L3
- **时长**：2:00
- **BPM**：72
- **调式**：D 宫五声音阶
- **乐器**：古琴泛音、轻击木鱼、纸声采样
- **情绪**：清淡、好奇、留白，像手指第一次触碰古册
- **循环**：首尾同为单个泛音余韵，自然衔接

**中文 Suno 提示词**：

```
中国水墨风格解谜游戏背景音乐，
教学关场景，清淡好奇，大量留白，
主要乐器为古琴泛音和轻击木鱼，D宫五声音阶，
速度72 BPM，缓慢节奏，没有强烈起伏，
可无缝循环，无歌词，无人声，
禁止现代电子音色、电吉他、鼓机
```

**英文 Udio 提示词**：

```
Minimal Chinese ink-wash puzzle game background music,
tutorial level, curious and restrained, lots of silence,
featured instruments: guqin harmonics, soft woodblock, paper texture samples,
D major pentatonic, 72 BPM, slow pulse,
seamless loop, no vocals, no lyrics,
no electronic synth, no electric guitar, no drum machine
```

**文件名**：`bgm_01_zhiChu_tutorialTouch.wav`

---

### 02 序章 · 《册启》

- **章节**：序章
- **时长**：2:30
- **BPM**：60
- **调式**：G 商五声音阶
- **乐器**：埙、大提琴拨弦、低频铜震动
- **情绪**：神秘、温暖、时间沉淀感，古册缓缓打开
- **循环**：以一个长气息音开始和结束

**中文 Suno 提示词**：

```
中国水墨风格游戏序章背景音乐，
古旧集章册缓缓打开的神秘氛围，温暖而悠远，
主要乐器为埙和大提琴拨弦，加入青铜器低频震动余韵，
G商五声音阶，60 BPM，极慢，
可无缝循环，无歌词，无人声，
像时间本身在呼吸
```

**英文 Udio 提示词**：

```
Ancient Chinese album opening scene background music,
mysterious and warm, sense of time accumulated,
featured instruments: xun ocarina, cello pizzicato, low bronze resonance,
G shang pentatonic mode, 60 BPM, very slow,
seamless loop, no vocals, no lyrics,
breathing-time atmosphere
```

**文件名**：`bgm_02_ceQi_prologueOpen.wav`

---

### 03 壹·二里头 · 《铸火》

- **章节**：壹·二里头
- **时长**：2:30
- **BPM**：80
- **调式**：C 徵五声音阶
- **乐器**：埙、陶鼓、铜质感低频脉冲
- **情绪**：灼热、流动、青铜诞生，有上升动机
- **循环**：以低频脉冲起拍，以同一脉冲收束

**中文 Suno 提示词**：

```
中国水墨风格青铜铸造场景背景音乐，
夏代二里头，熔融铜液流动，炽热而原始，
主要乐器为埙和陶鼓，加入青铜器低频震动脉冲，
C徵五声音阶，80 BPM，稳定律动，
旋律带有上行动机，象征铜液上升与成型，
可无缝循环，无歌词，无人声
```

**英文 Udio 提示词**：

```
Bronze casting ritual background music, ancient Chinese Erlitou era,
molten bronze flowing, primal heat,
featured instruments: xun, pottery drums, low bronze pulse,
C zhi pentatonic, 80 BPM, steady rhythmic drive,
ascending melodic motif representing rising liquid metal,
seamless loop, no vocals, no lyrics
```

**文件名**：`bgm_03_zhuHuo_erlitouCasting.wav`

---

### 04 灰页 · 《悬置》

- **章节**：灰页（悬置·商）
- **时长**：3:00
- **BPM**：无固定节拍
- **调式**：无调性 / 微分音
- **乐器**：极低频正弦、金属泛音、风声、暗金边缘对应的高频泛音
- **情绪**：静默、悬停、被时间遗忘的一页
- **循环**：持续音景，任意位置可切入

**中文 Suno 提示词**：

```
中国水墨风格灰页场景氛围音乐，
全灰色页面，时间悬停，几乎没有旋律，
极低频持续音，偶尔金属泛音，风声纹理，
无固定BPM，无节奏，无调性，
可无缝循环，无歌词，无人声，
像一页被遗忘的纸在呼吸
```

**英文 Udio 提示词**：

```
Gray suspended page ambient music, ink-wash game,
almost no melody, time frozen,
very low sub-bass drone, occasional metallic overtones, wind texture,
no fixed BPM, no rhythm, atonal,
seamless loop, no vocals, no lyrics,
a forgotten page breathing
```

**文件名**：`bgm_04_xuanZhi_greySuspended.wav`

---

### 05 贰·周王城 · 《礼序》

- **章节**：贰·周王城
- **时长**：2:30
- **BPM**：66
- **调式**：F 宫五声音阶
- **乐器**：编钟、古琴、弦乐长音
- **情绪**：庄严、秩序、克制，礼乐文明
- **循环**：以一声编钟残响起，以同样残响收

**中文 Suno 提示词**：

```
中国水墨风格周代礼乐场景背景音乐，
周王城宗庙，庄严克制，礼制秩序，
主要乐器为编钟和古琴，弦乐长音铺底，
F宫五声音阶，66 BPM，缓慢庄重，
可无缝循环，无歌词，无人声，
古代宫廷雅乐氛围
```

**英文 Udio 提示词**：

```
Zhou dynasty ritual music, ancient Chinese court,
solemn, orderly, restrained,
featured instruments: bianzhong bronze bells, guqin, sustained strings,
F major pentatonic, 66 BPM, slow and stately,
seamless loop, no vocals, no lyrics,
classical court music atmosphere
```

**文件名**：`bgm_05_liXu_zhouRitual.wav`

---

### 06 叁·东汉 · 《星夜》

- **章节**：叁·东汉
- **时长**：2:30
- **BPM**：70
- **调式**：A 羽五声音阶
- **乐器**：箫、笛、夜鼓、古筝泛音
- **情绪**：炽热、思辨、孤独，如张衡观星之夜
- **循环**：以箫声长音起，以同音长音收

**中文 Suno 提示词**：

```
中国水墨风格东汉观星场景背景音乐，
张衡地动仪与夜空，炽热而孤独，
主要乐器为箫、笛、夜鼓和古筝泛音，
A羽五声音阶，70 BPM，穿插寂静，
可无缝循环，无歌词，无人声，
星夜下的理性与沉思
```

**英文 Udio 提示词**：

```
Eastern Han stargazing night background music,
Zhang Heng seismograph under starry sky, passionate and lonely,
featured instruments: xiao, dizi, night drums, guzheng harmonics,
A yu pentatonic, 70 BPM, spacious with silence,
seamless loop, no vocals, no lyrics,
rational contemplation under stars
```

**文件名**：`bgm_06_xingYe_hanStarryNight.wav`

---

### 07 肆·曹魏 · 《烬余》

- **章节**：肆·曹魏
- **时长**：2:30
- **BPM**：58
- **调式**：E 商五声音阶
- **乐器**：焦尾琴（烧焦质感）、二胡、风声
- **情绪**：苍凉、诗性、灰烬，废墟中仍有诗稿
- **循环**：缓慢下行旋律，首尾可叠化衔接

**中文 Suno 提示词**：

```
中国水墨风格曹魏废墟场景背景音乐，
洛阳灰烬，诗性苍凉，
主要乐器为焦尾琴和二胡，带有烧焦木质纹理音色，
E商五声音阶，58 BPM，极慢，
旋律缓慢下行，像灰烬飘落，
可无缝循环，无歌词，无人声
```

**英文 Udio 提示词**：

```
Cao Wei ruins background music, burnt Luoyang,
poetic desolation,
featured instruments: jiaowei qin with scorched texture, erhu, wind,
E shang pentatonic, 58 BPM, very slow,
descending melody like falling ash,
seamless loop, no vocals, no lyrics
```

**文件名**：`bgm_07_jinYu_caoWeiEmbers.wav`

---

### 08 伍·北魏 · 《镜迁》

- **章节**：伍·北魏
- **时长**：2:30
- **BPM**：65
- **调式**：降 B 羽五声音阶
- **乐器**：琵琶、编钟残响、雨声采样
- **情绪**：冷峻、转折、雨意，胡服改汉服的历史转折
- **循环**：琵琶轮指动机贯穿，首尾同一和弦位置

**中文 Suno 提示词**：

```
中国水墨风格北魏迁都场景背景音乐，
铜镜、胡服风化、大雨落下，冷峻转折，
主要乐器为琵琶和编钟残响，加入雨声采样，
降B羽五声音阶，65 BPM，克制而流动，
可无缝循环，无歌词，无人声
```

**英文 Udio 提示词**：

```
Northern Wei migration background music,
bronze mirror, Hanfu transformation, falling rain,
cold and turning,
featured instruments: pipa, fragmented bianzhong bells, rain samples,
B-flat yu pentatonic, 65 BPM, restrained and flowing,
seamless loop, no vocals, no lyrics
```

**文件名**：`bgm_08_jingQian_weiMirrorMigration.wav`

---

### 09 陆·隋唐 · 《盛极》

- **章节**：陆·隋唐
- **时长**：2:30
- **BPM**：92
- **调式**：D 宫五声音阶
- **乐器**：大编制宫廷乐、笙、笛、鼓、弦乐
- **情绪**：繁华、饱和、紧张，盛世下的隐忧
- **循环**：A（繁华主题）→ B（紧张转折）→ A（回归），首尾同调

**中文 Suno 提示词**：

```
中国水墨风格隋唐盛世场景背景音乐，
上元夜、天津桥、牡丹盛放，繁华而紧张，
大编制古代宫廷乐，笙、笛、鼓、弦乐齐奏，
D宫五声音阶，92 BPM，全游戏最饱满的编制，
可无缝循环，无歌词，无人声
```

**英文 Udio 提示词**：

```
Sui-Tang golden age background music,
Lantern Festival, Tianjin Bridge, peonies blooming,
prosperous but tense,
full ancient Chinese court ensemble: sheng, dizi, drums, strings,
D major pentatonic, 92 BPM, richest arrangement in game,
seamless loop, no vocals, no lyrics
```

**文件名**：`bgm_09_shengJi_tangProsperity.wav`

---

### 10 尾声 · 《合册》

- **章节**：尾声
- **时长**：3:00
- **BPM**：60 → 自由
- **调式**：C 宫五声音阶（全动机回归）

- **乐器**：所有主题乐器动机闪现 + 现代低频（收割机隐喻）
- **情绪**：全谱收束、温暖、古今交汇
- **循环**：不建议严格循环，以淡出收尾；如必须循环，从 60 BPM 稳定段切入

**中文 Suno 提示词**：

```
中国水墨风格游戏尾声背景音乐，
所有章节主题动机回归，古今交汇，
古琴、编钟、琵琶、箫等乐器动机依次闪现，
最后加入极低频现代机械嗡鸣（象征收割机），
C宫五声音阶，60 BPM，逐渐自由变速，
可淡入淡出，无歌词，无人声
```

**英文 Udio 提示词**：

```
Game epilogue background music, ink-wash style,
all chapter themes returning, ancient meets modern,
guqin, bianzhong, pipa, xiao motifs flash briefly,
final section adds sub-bass modern mechanical drone (harvester metaphor),
C major pentatonic, 60 BPM to free tempo,
fade in/out, no vocals, no lyrics
```

**文件名**：`bgm_10_heCe_epilogueClosure.wav`

---

## 三、生成顺序建议

按开发优先级生成：

1. 开始界面《封题》（玩家第一眼看到）
2. 教学关《指触》（最早 playable 需要）
3. 序章《册启》
4. 壹·二里头《铸火》
5. 贰·周王城《礼序》
6. 灰页《悬置》
7. 叁·东汉《星夜》
8. 肆·曹魏《烬余》
9. 伍·北魏《镜迁》
10. 陆·隋唐《盛极》
11. 尾声《合册》（最后实现）

---

## 四、与铜声的配合原则

- BGM 响度控制在 -20dB ~ -14dB LUFS。
- 铜声音效触发时，BGM 可闪避 1-2dB（可选实现）。
- 避免 BGM 与铜声使用完全相同的乐器 solo，防止掩蔽。

---

## 五、后处理 checklist

1. 裁剪为 2-3 分钟可循环体。
2. 首尾无缝衔接测试（尤其《盛极》《礼序》）。
3. 标准化响度至 -16 LUFS。
4. 导出 WAV 母版 + OGG 运行版。
5. 命名与 `AssetManifest.ts` / `BGMManager.ts` 对应。
