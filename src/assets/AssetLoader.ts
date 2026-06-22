/**
 * 铜声·识洛 — Asset loader
 *
 * Preloads images, videos, and audio with progress tracking.
 * Caches loaded assets for fast access.
 */

import { createLogger } from '../utils/logger';

const log = createLogger('AssetLoader');

type AssetType = 'image' | 'video' | 'audio';

interface LoadTask {
  path: string;
  type: AssetType;
}

export class AssetLoader {
  private imageCache = new Map<string, HTMLImageElement>();
  private loaded = 0;
  private total = 0;
  private _complete = false;

  get progress(): number {
    if (this.total === 0) return 1;
    return this.loaded / this.total;
  }

  get complete(): boolean {
    return this._complete;
  }

  /**
   * Preload a list of image paths.
   * Returns a Promise that resolves when all images are loaded (or failed).
   */
  preloadImages(paths: string[]): Promise<void> {
    this.total += paths.length;
    this._complete = false;

    const promises = paths.map((path) => this.loadImage(path));
    return Promise.allSettled(promises).then(() => {
      this._complete = true;
      log.info(`AssetLoader: ${this.loaded}/${this.total} images loaded`);
    });
  }

  /**
   * Load a single image, caching it.
   */
  loadImage(path: string): Promise<HTMLImageElement> {
    const cached = this.imageCache.get(path);
    if (cached && cached.complete) {
      return Promise.resolve(cached);
    }

    return new Promise((resolve) => {
      const img = new Image();

      img.onload = () => {
        this.imageCache.set(path, img);
        this.loaded++;
        resolve(img);
      };

      img.onerror = () => {
        log.warn(`Failed to load image: ${path}`);
        this.loaded++;
        // Resolve with a broken-image marker; the renderer handles missing images
        resolve(img);
      };

      img.src = path;
    });
  }

  /**
   * Get a cached image by path.
   */
  getImage(path: string): HTMLImageElement | undefined {
    return this.imageCache.get(path);
  }

  /**
   * Preload a list of tasks with mixed types.
   */
  preloadAll(tasks: LoadTask[]): Promise<void> {
    const promises = tasks.map((task) => {
      switch (task.type) {
        case 'image':
          return this.loadImage(task.path);
        default:
          return Promise.resolve();
      }
    });
    return Promise.allSettled(promises).then(() => {});
  }

  /**
   * Clear the asset cache.
   */
  clearCache(): void {
    this.imageCache.clear();
    this.loaded = 0;
    this.total = 0;
    this._complete = false;
    log.info('AssetLoader cache cleared');
  }
}
