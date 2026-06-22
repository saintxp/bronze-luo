/**
 * 铜声·识洛 — Game bootstrap
 *
 * Phase 1: Tutorial demo (L1-L3 playable in browser).
 * Initializes CanvasManager → DragHandler → ChapterTutorial → game loop.
 */

import { CanvasManager } from './engine/CanvasManager';
import { DragHandler } from './engine/DragHandler';
import { ChapterTutorial } from './chapters/ChapterTutorial';
import { createLogger, setLogLevel } from './utils/logger';

const log = createLogger('main');

function init(): void {
  log.info('铜声·识洛 — Phase 1 Demo starting...');

  // Set log level (debug in dev, error in production)
  setLogLevel('debug');

  // 1. Create canvas manager (5 layers)
  const canvasManager = new CanvasManager();
  canvasManager.init('app');

  // 2. Create drag handler
  const dragHandler = new DragHandler();

  // 3. Create tutorial chapter
  const tutorial = new ChapterTutorial(canvasManager, dragHandler);
  tutorial.init();
  tutorial.enter();

  // 4. Game loop
  let lastTime = performance.now();

  function gameLoop(now: number): void {
    const dt = now - lastTime;
    lastTime = now;

    // Update chapter logic (renders current level)
    tutorial.update(dt);

    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);

  // 5. Handle resize
  window.addEventListener('resize', () => {
    canvasManager.resize();
  });

  // 6. Log readiness
  log.info('Phase 1 Demo ready — tutorial running');
}

// Boot when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
