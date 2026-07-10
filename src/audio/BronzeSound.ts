/**
 * 铜声·识洛 — Bronze sound definitions
 *
 * 11 bronze sounds — one per chapter, never skipped.
 * Each sound has a unique frequency, duration, and waveform.
 *
 * Phase 2: Only the first 3 sounds are active (guDu, weng, dingDing).
 * Later sounds will be added as their chapters are implemented.
 *
 * Usage: eventBus.emit('bronze:sound', { soundId: 'guDu' });
 */

import { AudioManager } from './AudioManager';
import { eventBus } from '../utils/EventBus';
import { createLogger } from '../utils/logger';

const log = createLogger('BronzeSound');

interface BronzeSoundDef {
  id: string;
  frequency: number;
  duration: number;
  type: OscillatorType;
  description: string;
}

const BRONZE_SOUNDS: Record<string, BronzeSoundDef> = {
  guDu:          { id: 'guDu',          frequency: 110,  duration: 1.5, type: 'triangle', description: '咕嘟 — Liquid copper' },
  weng:          { id: 'weng',          frequency: 220,  duration: 2.0, type: 'sine',     description: '嗡—— Bell chime' },
  dingDing:      { id: 'dingDing',      frequency: 440,  duration: 0.3, type: 'sine',     description: '叮——叮—— Carriage bells' },
  da:            { id: 'da',            frequency: 800,  duration: 0.15, type: 'square',  description: '嗒 — Copper ball drop' },
  dang:          { id: 'dang',          frequency: 330,  duration: 1.0, type: 'triangle', description: '当—— Ball into toad mouth' },
  zheng:         { id: 'zheng',         frequency: 660,  duration: 0.8, type: 'sine',     description: '铮—— Mirror touch' },
  hua:           { id: 'hua',           frequency: 200,  duration: 1.2, type: 'sawtooth', description: '哗—— Armor clash' },
  dingFeng:      { id: 'dingFeng',      frequency: 880,  duration: 1.5, type: 'sine',     description: '玎—— Wind chime' },
  guDuReturn:    { id: 'guDuReturn',    frequency: 90,   duration: 2.0, type: 'triangle', description: '咕嘟 — Spire melting → liquid' },
  dangMirror:    { id: 'dangMirror',    frequency: 1500, duration: 0.4, type: 'sine',     description: '珰—— Mirror shatter' },
  kaDa:          { id: 'kaDa',          frequency: 600,  duration: 0.1, type: 'square',  description: '咔嗒 — Fish tally lock' },
};

/**
 * Initialize bronze sound system.
 * Registers eventBus listener for 'bronze:sound' events.
 * Call once at game startup.
 */
export function initBronzeSounds(): void {
  eventBus.on('bronze:sound', (payload: { soundId: string }) => {
    const def = BRONZE_SOUNDS[payload.soundId];
    if (!def) {
      log.warn(`Unknown bronze sound: ${payload.soundId}`);
      return;
    }
    log.info(`Playing: ${def.description}`);
    AudioManager.instance.playTone({
      frequency: def.frequency,
      duration: def.duration,
      type: def.type,
    });
  });
  log.info('Bronze sounds initialized — 11 sounds registered');
}

/**
 * Get the definition for a bronze sound by ID.
 */
export function getBronzeSound(id: string): BronzeSoundDef | undefined {
  return BRONZE_SOUNDS[id];
}
