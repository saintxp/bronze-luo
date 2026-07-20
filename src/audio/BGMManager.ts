/**
 * 铜声·识洛 — BGM Manager
 *
 * Manages background music playback across all chapters.
 * Uses HTML5 Audio for streaming + Web Audio API MediaElementSource for gain/fade.
 * Maintains a playlist of 11 tracks; supports play/pause/skip/select/crossfade.
 */

import { eventBus } from "../utils/EventBus";
import { createLogger } from "../utils/logger";

const log = createLogger("BGMManager");

/* ───────── Track metadata ───────── */

export interface BgmTrack {
	id: string;
	name: string;
	chapter: string;
	path: string;
}

export const BGM_PLAYLIST: BgmTrack[] = [
	{
		id: "fengTi",
		name: "封题",
		chapter: "开始界面",
		path: "/assets/bgm/bgm_00_fengTi_titleScreen.mp3",
	},
	{
		id: "zhiChu",
		name: "指触",
		chapter: "教学关",
		path: "/assets/bgm/bgm_01_zhiChu_tutorialTouch.mp3",
	},
	{
		id: "ceQi",
		name: "册启",
		chapter: "序章",
		path: "/assets/bgm/bgm_02_ceQi_prologueOpen.mp3",
	},
	{
		id: "zhuHuo",
		name: "铸火",
		chapter: "壹·二里头",
		path: "/assets/bgm/bgm_03_zhuHuo_erlitouCasting.mp3",
	},
	{
		id: "xuanZhi",
		name: "悬置",
		chapter: "灰页",
		path: "/assets/bgm/bgm_04_xuanZhi_greySuspended.mp3",
	},
	{
		id: "liXu",
		name: "礼序",
		chapter: "贰·周王城",
		path: "/assets/bgm/bgm_05_liXu_zhouRitual.mp3",
	},
	{
		id: "xingYe",
		name: "星夜",
		chapter: "叁·东汉",
		path: "/assets/bgm/bgm_06_xingYe_hanStarryNight.mp3",
	},
	{
		id: "jinYu",
		name: "烬余",
		chapter: "肆·曹魏",
		path: "/assets/bgm/bgm_07_jinYu_caoWeiEmbers.mp3",
	},
	{
		id: "jingQian",
		name: "镜迁",
		chapter: "伍·北魏",
		path: "/assets/bgm/bgm_08_jingQian_weiMirrorMigration.mp3",
	},
	{
		id: "shengJi",
		name: "盛极",
		chapter: "陆·隋唐",
		path: "/assets/bgm/bgm_09_shengJi_tangProsperity.mp3",
	},
	{
		id: "heCe",
		name: "合册",
		chapter: "尾声",
		path: "/assets/bgm/bgm_10_heCe_epilogueClosure.mp3",
	},
];

/* ───────── Manager ───────── */

export class BGMManager {
	private audioCtx: AudioContext | null = null;
	private currentEl: HTMLAudioElement | null = null;
	private currentGain: GainNode | null = null;
	private currentTrackId: string | null = null;
	private _playing = false;
	private _volume = 0.6;
	private _muted = false;

	/* ───────── Getters ───────── */

	get playing(): boolean {
		return this._playing;
	}

	get currentTrack(): BgmTrack | undefined {
		if (!this.currentTrackId) return undefined;
		return BGM_PLAYLIST.find((t) => t.id === this.currentTrackId);
	}

	get currentIndex(): number {
		if (!this.currentTrackId) return -1;
		return BGM_PLAYLIST.findIndex((t) => t.id === this.currentTrackId);
	}

	get volume(): number {
		return this._volume;
	}

	get muted(): boolean {
		return this._muted;
	}

	get playlist(): BgmTrack[] {
		return BGM_PLAYLIST;
	}

	/* ───────── Audio context (lazy) ───────── */

	private getCtx(): AudioContext {
		if (!this.audioCtx) {
			this.audioCtx = new AudioContext();
		}
		if (this.audioCtx.state === "suspended") {
			this.audioCtx.resume();
		}
		return this.audioCtx;
	}

	/* ───────── Playback ───────── */

	/**
	 * Play a track by ID. If the same track is already loaded and paused,
	 * resumes it. Otherwise loads and plays from the start.
	 */
	play(trackId: string): void {
		const track = BGM_PLAYLIST.find((t) => t.id === trackId);
		if (!track) {
			log.warn(`BGM track not found: ${trackId}`);
			return;
		}

		// If same track is already loaded, just resume
		if (this.currentTrackId === trackId && this.currentEl) {
			if (this.currentEl.paused) {
				this.resume();
			}
			return;
		}

		// Stop current track
		this.stopCurrent();

		log.info(`BGM play: ${track.name} (${track.chapter})`);
		this.loadAndPlay(track);
	}

	/** Pause the current track. */
	pause(): void {
		if (!this.currentEl || this.currentEl.paused) return;
		this.currentEl.pause();
		this._playing = false;
		this.emitState();
		log.info("BGM paused");
	}

	/** Resume the current track. */
	resume(): void {
		if (!this.currentEl || !this.currentEl.paused) return;
		const ctx = this.getCtx();
		if (ctx.state === "suspended") ctx.resume();
		this.currentEl.play().catch((e) => log.warn("BGM resume failed:", e));
		this._playing = true;
		this.emitState();
		log.info("BGM resumed");
	}

	/** Stop and unload the current track. */
	stop(): void {
		this.stopCurrent();
		this.emitState();
		log.info("BGM stopped");
	}

	/** Toggle play/pause. */
	toggle(): void {
		if (this._playing) {
			this.pause();
		} else if (this.currentTrackId) {
			this.resume();
		} else {
			// Nothing playing — start from first track
			this.play(BGM_PLAYLIST[0].id);
		}
	}

	/** Skip to the next track. Wraps around. */
	next(): void {
		const idx = this.currentIndex;
		const nextIdx = idx < 0 ? 0 : (idx + 1) % BGM_PLAYLIST.length;
		this.play(BGM_PLAYLIST[nextIdx].id);
	}

	/** Skip to the previous track. Wraps around. */
	prev(): void {
		const idx = this.currentIndex;
		const prevIdx = idx <= 0 ? BGM_PLAYLIST.length - 1 : idx - 1;
		this.play(BGM_PLAYLIST[prevIdx].id);
	}

	/* ───────── Volume ───────── */

	/** Set volume 0..1. Updates live gain node. */
	setVolume(v: number): void {
		this._volume = Math.max(0, Math.min(1, v));
		if (this.currentGain) {
			this.currentGain.gain.setTargetAtTime(
				this._muted ? 0 : this._volume,
				this.getCtx().currentTime,
				0.05,
			);
		}
		this.emitState();
	}

	/** Mute/unmute BGM. */
	setMuted(muted: boolean): void {
		this._muted = muted;
		if (this.currentGain) {
			this.currentGain.gain.setTargetAtTime(
				muted ? 0 : this._volume,
				this.getCtx().currentTime,
				0.05,
			);
		}
		this.emitState();
	}

	/* ───────── Crossfade ───────── */

	/**
	 * Crossfade from current track to a new track over `duration` ms.
	 */
	crossfade(toTrackId: string, duration = 1500): void {
		const track = BGM_PLAYLIST.find((t) => t.id === toTrackId);
		if (!track) {
			log.warn(`BGM crossfade target not found: ${toTrackId}`);
			return;
		}

		if (!this.currentEl || !this.currentGain) {
			// No current track — just play
			this.play(toTrackId);
			return;
		}

		log.info(`BGM crossfade → ${track.name} (${duration}ms)`);

		const ctx = this.getCtx();
		const oldEl = this.currentEl;
		const oldGain = this.currentGain;

		// Fade out old
		oldGain.gain.setTargetAtTime(0, ctx.currentTime, duration / 1000 / 3);

		// Load and fade in new
		const newEl = new Audio(track.path);
		newEl.loop = true;
		newEl.preload = "auto";

		const newSource = ctx.createMediaElementSource(newEl);
		const newGain = ctx.createGain();
		newGain.gain.setValueAtTime(0, ctx.currentTime);
		newGain.gain.linearRampToValueAtTime(
			this._muted ? 0 : this._volume,
			ctx.currentTime + duration / 1000,
		);
		newSource.connect(newGain);
		newGain.connect(ctx.destination);

		newEl.play().catch((e) => log.warn("BGM crossfade play failed:", e));

		// Cleanup old after fade
		setTimeout(() => {
			oldEl.pause();
			oldEl.remove();
			try {
				oldGain.disconnect();
			} catch {
				/* already disconnected */
			}
		}, duration + 100);

		this.currentEl = newEl;
		this.currentGain = newGain;
		this.currentTrackId = track.id;
		this._playing = true;

		// Wire ended → auto-advance
		newEl.addEventListener("ended", () => this.onTrackEnded());

		this.emitState();
	}

	/* ───────── Internal ───────── */

	private loadAndPlay(track: BgmTrack): void {
		const ctx = this.getCtx();

		const el = new Audio(track.path);
		el.loop = true;
		el.preload = "auto";

		const source = ctx.createMediaElementSource(el);
		const gain = ctx.createGain();
		gain.gain.setValueAtTime(this._muted ? 0 : this._volume, ctx.currentTime);
		source.connect(gain);
		gain.connect(ctx.destination);

		el.play().catch((e) => {
			// Autoplay policy — will resume on user interaction
			log.warn("BGM autoplay blocked:", e);
		});

		el.addEventListener("ended", () => this.onTrackEnded());

		this.currentEl = el;
		this.currentGain = gain;
		this.currentTrackId = track.id;
		this._playing = !el.paused;

		this.emitState();
	}

	private stopCurrent(): void {
		if (this.currentEl) {
			this.currentEl.pause();
			this.currentEl.remove();
			this.currentEl = null;
		}
		if (this.currentGain) {
			try {
				this.currentGain.disconnect();
			} catch {
				/* already disconnected */
			}
			this.currentGain = null;
		}
		this.currentTrackId = null;
		this._playing = false;
	}

	private onTrackEnded(): void {
		log.info("BGM track ended — advancing to next");
		this.next();
	}

	/** Emit state change to EventBus so UI can update. */
	private emitState(): void {
		eventBus.emit("bgm:state", {
			playing: this._playing,
			trackId: this.currentTrackId ?? "",
			volume: this._volume,
			muted: this._muted,
			trackName: this.currentTrack?.name ?? "",
		});
	}

	/* ───────── Singleton ───────── */

	static readonly instance = new BGMManager();
}
