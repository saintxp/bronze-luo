/**
 * 铜声·识洛 — Asset manifest
 *
 * Centralized asset path mapping. All asset references go through this
 * manifest — never hardcode paths. In Phase 1, placeholders are drawn via
 * Canvas API; real assets will be referenced here when available.
 */

export interface AssetRef {
	path: string;
	type: "image" | "video" | "audio";
}

/**
 * Build a path relative to the public assets directory.
 * Assets live under /assets/ in the public folder.
 */
function assetPath(category: string, name: string): string {
	return `/assets/${category}/${name}`;
}

/* ───────── Tutorial placeholders (Phase 1 — Canvas-drawn) ───────── */
// These paths will point to real assets in Phase 2+.
// For now the engine draws placeholder geometry.

export const ASSETS = {
	tutorial: {
		// L1: Door
		doorFrame: assetPath("tutorial", "door-frame.png"),
		doorPanel: assetPath("tutorial", "door-panel.png"),
		doorClosed: assetPath("tutorial", "door-closed.png"),

		// L2: Window/Nest
		fgHole: assetPath("tutorial", "fg-hole.png"),
		bgScene: assetPath("tutorial", "bg-scene.png"),

		// L3: Gears
		gearFixed: assetPath("tutorial", "gear-fixed.png"),
		gearMovable: assetPath("tutorial", "gear-movable.png"),
		gearMeshed: assetPath("tutorial", "gear-meshed.png"),
	},

	/* ───────── Phase 2: Prologue ───────── */
	prologue: {
		cover: assetPath("prologue", "cover.png"),
		map: assetPath("prologue", "luoyang-map.png"),
		fingerprint: assetPath("prologue", "fingerprint.png"),
		copperFlood: assetPath("prologue", "copper-flood.png"),
		copperFlood2: assetPath("prologue", "copper-flood-2.png"),
		copperFloodCorners: assetPath("prologue", "copper-flood-corners.png"),
		/** 替换 CurtainColophon 珠帘 → 静态图片：序章完成时 "河出图 洛出书" 文字 */
		colophonText: assetPath("prologue", "colophon-text.png"),
		/** Seedance Tier1 视频：铜液四角合拢吞没地图 */
		copperFloodVideo: assetPath("prologue", "copper-flood.mp4"),
	},

	/* ───────── Phase 2: Erlitou ───────── */
	erlitou: {
		taoFanTop: assetPath("erlitou", "taofan-top.png"),
		taoFanBottom: assetPath("erlitou", "taofan-bottom.png"),
		taoFanAssembled: assetPath("erlitou", "taofan-assembled.png"),
		dragonBody: assetPath("erlitou", "dragon-body.png"),
		turquoise: assetPath("erlitou", "turquoise.png"),
	},

	/* ───────── Phase 2: Grey Page ───────── */
	grey: {
		layer1: assetPath("grey", "layer-1.png"),
		layer2: assetPath("grey", "layer-2.png"),
		layer3: assetPath("grey", "layer-3.png"),
		layer4: assetPath("grey", "layer-4.png"),
		layer5: assetPath("grey", "layer-5.png"),
		starmap: assetPath("grey", "starmap.png"),
	},

	/* ───────── Phase 2: Zhou ───────── */
	zhou: {
		sundial: assetPath("zhou", "sundial.png"),
		turtle: assetPath("zhou", "turtle-shell.png"),
		nineTripods: assetPath("zhou", "nine-tripods.png"),
		confuciusCircle: assetPath("zhou", "confucius-circle.png"),
		laoziDot: assetPath("zhou", "laozi-dot.png"),
		bellArray: assetPath("zhou", "bell-array.png"),
		greenOx: assetPath("zhou", "green-ox.png"),
		purpleMist: assetPath("zhou", "purple-mist.png"),
	},

	/* ───────── Phase 3: Eastern Han ───────── */
	han: {
		// 字立 (熹平石经)
		stoneStele: assetPath("han", "stone-stele.png"),
		paperSheet: assetPath("han", "paper-sheet.png"),
		floatingChars: assetPath("han", "floating-chars.png"),
		jiaoWeiQin: assetPath("han", "jiaowei-qin.png"),
		burningWood: assetPath("han", "burning-wood.png"),
		qinString: assetPath("han", "qin-string.png"),

		// 地听 (张衡地动仪)
		starChart: assetPath("han", "star-chart.png"),
		seismoscope: assetPath("han", "seismoscope.png"),
		dragonHead: assetPath("han", "dragon-head.png"),
		copperBall: assetPath("han", "copper-ball.png"),
		toadMouth: assetPath("han", "toad-mouth.png"),
		supernova: assetPath("han", "supernova.png"),

		// 纸成 (蔡伦造纸)
		paperPulp: assetPath("han", "paper-pulp.png"),
		bambooScreen: assetPath("han", "bamboo-screen.png"),
		waterSurface: assetPath("han", "water-surface.png"),
		whiteHair: assetPath("han", "white-hair.png"),

		// 托 (党锢·望门投止)
		knifeBack: assetPath("han", "knife-back.png"),
		palmPrint: assetPath("han", "palm-print.png"),
		reflection: assetPath("han", "reflection.png"),
		beimangMountain: assetPath("han", "beimang-mountain.png"),
		wildPeony: assetPath("han", "wild-peony.png"),
	},

	/* ───────── Phase 3: Cao Wei ───────── */
	caowei: {
		// 烬城
		ruins: assetPath("caowei", "ruins.png"),
		beimangAsh: assetPath("caowei", "beimang-ash.png"),
		ashLayer: assetPath("caowei", "ash-layer.png"),
		waterPuddle: assetPath("caowei", "water-puddle.png"),
		handprint: assetPath("caowei", "handprint.png"),

		// 诗起
		poemPaper: assetPath("caowei", "poem-paper.png"),
		caocaoPoem: assetPath("caowei", "caocao-poem.png"),
		caiwenjiPoem: assetPath("caowei", "caiwenji-poem.png"),
		caozhiPoem: assetPath("caowei", "caozhi-poem.png"),
		luoshui: assetPath("caowei", "luoshui.png"),
	},

	/* ───────── Phase 4: Northern Wei ───────── */
	wei: {
		// 衣归
		bronzeMirror: assetPath("wei", "bronze-mirror.png"),
		fengTaihou: assetPath("wei", "feng-taihou.png"),
		xiaowendi: assetPath("wei", "xiaowendi.png"),
		huClothes: assetPath("wei", "hu-clothes.png"),
		hanClothes: assetPath("wei", "han-clothes.png"),
		relocationRain: assetPath("wei", "relocation-rain.png"),

		// 瘦骨
		longmenCliff: assetPath("wei", "longmen-cliff.png"),
		craftsmanHand: assetPath("wei", "craftsman-hand.png"),
		playerHand: assetPath("wei", "player-hand.png"),
		buddhaCarving: assetPath("wei", "buddha-carving.png"),

		// 河阴
		yellowRiver: assetPath("wei", "yellow-river.png"),
		copperSeal: assetPath("wei", "copper-seal.png"),
		brokenTablet: assetPath("wei", "broken-tablet.png"),
		cavalryArmor: assetPath("wei", "cavalry-armor.png"),

		// 烬 (永宁寺塔)
		yongningTemple: assetPath("wei", "yongning-temple.png"),
		windChime: assetPath("wei", "wind-chime.png"),
		towerLayers: assetPath("wei", "tower-layers.png"),
		towerFire: assetPath("wei", "tower-fire.png"),
		spireMelting: assetPath("wei", "spire-melting.png"),
	},

	/* ───────── Phase 4: Sui Tang ───────── */
	tang: {
		// 脂粉 + 尺
		fengxiansiSite: assetPath("tang", "fengxiansi-site.png"),
		copperCoins: assetPath("tang", "copper-coins.png"),
		weijiBlueprint: assetPath("tang", "weiji-blueprint.png"),
		tianjinBridge: assetPath("tang", "tianjin-bridge.png"),

		// 云想
		lanternNight: assetPath("tang", "lantern-night.png"),
		libaiPoem: assetPath("tang", "libai-poem.png"),
		dufuPoem: assetPath("tang", "dufu-poem.png"),
		cloudThought: assetPath("tang", "cloud-thought.png"),

		// 骨赤
		bridgePillar: assetPath("tang", "bridge-pillar.png"),
		ropeMark: assetPath("tang", "rope-mark.png"),
		yanZhenqing: assetPath("tang", "yan-zhenqing.png"),
		brushStroke: assetPath("tang", "brush-stroke.png"),

		// 千秋镜·铜鱼符
		qianqiuMirror: assetPath("tang", "qianqiu-mirror.png"),
		mirrorShard: assetPath("tang", "mirror-shard.png"),
		fishTally: assetPath("tang", "fish-tally.png"),
		suiyangWall: assetPath("tang", "suiyang-wall.png"),

		// 归田
		scriptureShelf: assetPath("tang", "scripture-shelf.png"),
		peonyBloom: assetPath("tang", "peony-bloom.png"),
		longmenGrottoes: assetPath("tang", "longmen-grottoes.png"),
		farmland: assetPath("tang", "farmland.png"),
	},

	/* ───────── Epilogue ───────── */
	epilogue: {
		modernLuoyang: assetPath("epilogue", "modern-luoyang.png"),
		yingtianmen: assetPath("epilogue", "yingtianmen.png"),
		goddessScatter: assetPath("epilogue", "goddess-scatter.png"),
		harvester: assetPath("epilogue", "harvester.png"),
		rutMarks: assetPath("epilogue", "rut-marks.png"),
		albumCover: assetPath("epilogue", "album-cover.png"),
		watermark: assetPath("epilogue", "watermark.png"),
	},

	/* ───────── Videos (Seedance AI) ───────── */
	videos: {
		// Tier 1 — Must-have AI videos
		copperFlood: assetPath("videos", "copper-flood.mp4"), // 序章 2.5s
		bellWave: assetPath("videos", "bell-wave.mp4"), // 礼成 3s
		towerBurn: assetPath("videos", "tower-burn.mp4"), // 烬 6s (全书唯一视觉高潮)
		mirrorShatter: assetPath("videos", "mirror-shatter.mp4"), // 千秋镜 3s

		// Tier 2 — Can fallback to frame sequences
		copperPour: assetPath("videos", "copper-pour.mp4"), // 二里头 3s
		jiaoWeiQin: assetPath("videos", "jiaowei-qin.mp4"), // 字立 3s
		copperBallDrop: assetPath("videos", "copper-ball-drop.mp4"), // 地听 1.5s
		supernova: assetPath("videos", "supernova.mp4"), // 地听 2.5s
		ashCollapse: assetPath("videos", "ash-collapse.mp4"), // 烬城 2.5s
		poemWind: assetPath("videos", "poem-wind.mp4"), // 诗起 4s
		clothesTransform: assetPath("videos", "clothes-transform.mp4"), // 衣归 5s
		peonyBloom: assetPath("videos", "peony-bloom.mp4"), // 归田 2.5s
		goddessScatter: assetPath("videos", "goddess-scatter.mp4"), // 尾声 4s
	},
	/* ───────── BGM (11 tracks) ───────── */
	bgm: {
		fengTi: assetPath("bgm", "bgm_00_fengTi_titleScreen.mp3"),
		zhiChu: assetPath("bgm", "bgm_01_zhiChu_tutorialTouch.mp3"),
		ceQi: assetPath("bgm", "bgm_02_ceQi_prologueOpen.mp3"),
		zhuHuo: assetPath("bgm", "bgm_03_zhuHuo_erlitouCasting.mp3"),
		xuanZhi: assetPath("bgm", "bgm_04_xuanZhi_greySuspended.mp3"),
		liXu: assetPath("bgm", "bgm_05_liXu_zhouRitual.mp3"),
		xingYe: assetPath("bgm", "bgm_06_xingYe_hanStarryNight.mp3"),
		jinYu: assetPath("bgm", "bgm_07_jinYu_caoWeiEmbers.mp3"),
		jingQian: assetPath("bgm", "bgm_08_jingQian_weiMirrorMigration.mp3"),
		shengJi: assetPath("bgm", "bgm_09_shengJi_tangProsperity.mp3"),
		heCe: assetPath("bgm", "bgm_10_heCe_epilogueClosure.mp3"),
	},
} as const;

/**
 * Get the asset path for a given key path.
 * Usage: getAssetPath('tutorial', 'doorFrame') → '/assets/tutorial/door-frame.png'
 */
export function getAssetPath(
	category: keyof typeof ASSETS,
	name: string,
): string | undefined {
	const cat = ASSETS[category] as Record<string, string>;
	return cat[name];
}
