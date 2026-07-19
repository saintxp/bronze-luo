# 启动界面 · 资产替换清单

> 替换当前 `index.html` 中 CSS 纯文本启动页为完整视觉启动画面

---

## 当前实现

`index.html` 中 `<div id="start-page">` 是一个 CSS 纯文本叠层：

- 朱砂方框 + 「识洛」
- h1 「铜声·识洛」
- 副标题 「一座城的青铜记忆」
- 「开始游戏」按钮
- 角落「⚙」设置按钮

**替换后**：底层为生成的全幅背景图，UI 元素（标题文字、按钮）仍由 HTML/CSS 控制，保证可交互和可访问性。

---

## 背景图

| 文件名 | W×H | @2x | Alpha | 用途 | 占位源 |
| --- | --- | --- | --- | --- | --- |
| `start_bg-desk.png` | 1920×1080 | 3840×2160 | RGB | 桌面+油灯+铜镜+花瓣——静态环境层 | `#start-page { background }` |
| `start_bg-album.png` | 1200×800 | 2400×1600 | RGBA | 集章册封面（俯视·暖棕桐油粗布）——居中叠加。册子外缘透明 | 同上 |
| `start_bg-shadow.png` | 1920×1080 | 3840×2160 | RGBA | 册子桌面投影 — multiply 混合 | 同上 |

### 分层合成方案

```
z=0:  start_bg-desk.png       (CSS background-image, cover)
z=1:  start_bg-album.png      (居中 absolute, 册子外透明)
z=2:  start_bg-shadow.png     (居中 absolute, mix-blend-mode: multiply)
z=3:  HTML 文字层              (标题+按钮+副标题，不变)
```

---

## 按钮元素

**保留为 HTML/CSS**（不改为图片），因为需要 hover 交互和可访问性。

| 元素 | 位置 | 当前 CSS 定义 | 建议视觉 |
| --- | --- | --- | --- |
| 标题「铜声·识洛」 | 居中，CY-80 | `font-size: 48px, color: --ink-text` | 保留 |
| 副标题 | 居中，标题下方 16px | `font-size: 18px, color: --ink-muted` | 保留 |
| 「开始游戏」按钮 | 居中，CY+180 | `border: 1.5px solid --ink-line, padding: 14px 64px` | 保留，但 hover 时背景可改为朱砂色 |
| 「⚙」设置按钮 | 右上角，距边 28px | `border: 1.5px solid --ink-line` | 保留 |
| 页脚「洛阳 · 三千八百年」 | 底部居中，距底 40px | `font-size: 13px, color: --ink-muted, opacity: 0.6` | 保留 |

> 按钮不需要替换图——InkView 极简风格本身就是对的。

---

## 启动动画（CSS）

图片加载完成后执行 CSS 入场动画：

```css
/* 封面从轻微模糊到清晰（模拟眼睛聚焦） */
#start-page img.album-cover {
  animation: focusIn 1.2s ease-out;
}
@keyframes focusIn {
  from { filter: blur(4px); opacity: 0.7; }
  to   { filter: blur(0);   opacity: 1; }
}

/* 标题从下方向上浮入 */
#start-page h1 {
  animation: riseIn 0.8s 0.3s ease-out both;
}
@keyframes riseIn {
  from { transform: translateY(20px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
```

---

## 印章

| 文件名 | W×H | @2x | Alpha | 用途 |
|---|---|---|---|---|
| `start_seal-shiluo.png` | 90×90 | 180×180 | RGBA | 启动页「识洛」印章——替代当前 CSS 手绘方框 |

### 印章规格

```
文字:     「识洛」
篆刻:     阴刻 (white-on-red)
底色:     朱砂红 #b64232
边框:     3px 朱砂红
尺寸:     90×90 px（display）
位置:     标题上方 36px，居中
```

> 印章 PNG 替换当前 `<div class="seal"><span>识洛</span></div>` 的 CSS 手绘。

---

## 替换步骤

1. 将 `start_bg-desk.png` / `start_bg-album.png` / `start_bg-shadow.png` 放入 `public/assets/ui/`
2. 将 `start_seal-shiluo.png` 放入 `public/assets/ui/`
3. 修改 `index.html` 的 `<style>`：
   - `#start-page` 添加 `background-image: url('/assets/ui/start_bg-desk.png')`
   - 添加 album 和 shadow 的 `<img>` 到 `#start-page` 内
4. 替换 `<div class="seal">` 为 `<img class="seal" src="/assets/ui/start_seal-shiluo.png">`
5. 添加 CSS 入场动画

---

## 总文件数: 4 图
