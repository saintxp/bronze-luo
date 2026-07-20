/**
 * 铜声·识洛 — Type-safe event bus
 *
 * Lightweight pub/sub for cross-module communication.
 * Used for: puzzle:solved, drag:* , bronze:sound, scene:transition, etc.
 */

type Handler<T = unknown> = (payload: T) => void;

interface EventMap {
	"puzzle:solved": { chapterId: string; puzzleId: string };
	"puzzle:reset": { chapterId: string; puzzleId: string };
	"drag:start": { x: number; y: number; targetId: string };
	"drag:move": { x: number; y: number; dx: number; dy: number };
	"drag:end": { x: number; y: number };
	"bronze:sound": { soundId: string };
	"bgm:state": {
		playing: boolean;
		trackId: string;
		volume: number;
		muted: boolean;
		trackName: string;
	};
	"bgm:play": { bgmId: string };
	"bgm:stop": null;
	"scene:transition": { from: string; to: string };
	"tutorial:step": { step: number; label: string };
	"chapter:complete": { chapterId: string };
	"navigate:start": null;
	"game:loaded": null;
}

type EventName = keyof EventMap;

class EventBus {
	private listeners = new Map<string, Set<Handler>>();

	on<K extends EventName>(event: K, handler: Handler<EventMap[K]>): void {
		if (!this.listeners.has(event)) {
			this.listeners.set(event, new Set());
		}
		this.listeners.get(event)!.add(handler as Handler);
	}

	off<K extends EventName>(event: K, handler: Handler<EventMap[K]>): void {
		this.listeners.get(event)?.delete(handler as Handler);
	}

	emit<K extends EventName>(event: K, payload: EventMap[K]): void {
		this.listeners.get(event)?.forEach((handler) => {
			handler(payload);
		});
	}

	clear(): void {
		this.listeners.clear();
	}
}

export const eventBus = new EventBus();
