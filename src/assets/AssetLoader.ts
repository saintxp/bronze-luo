/**
 * 铜声·识洛 — Asset loader
 *
 * Preloads images with progress tracking and chapter-based lazy loading.
 * Caches loaded assets for fast access. Supports fallback to procedural
 * rendering when assets are missing.
 *
 * Usage:
 *   const loader = new AssetLoader();
 *   await loader.preloadChapter('erlitou', ASSETS.erlitou);
 *   const img = loader.get(ASSETS.erlitou.taoFanTop);
 *   drawImage(ctx, img, { x: 0, y: 0, w: 800, h: 600 });
 */

import { createLogger } from '../utils/logger';

const log = createLogger('AssetLoader');

export class AssetLoader {
  private imageCache = new Map<string, HTMLImageElement>();
  private pendingLoads = new Map<string, Promise<HTMLImageElement>>();
  private failedPaths = new Set<string>();
  private _loadedCount = 0;
  private _totalCount = 0;

  get loadedCount(): number {
    return this._loadedCount;
  }

  get totalCount(): number {
    return this._totalCount;
  }

  get progress(): number {
    if (this._totalCount === 0) return 1;
    return this._loadedCount / this._totalCount;
  }

  /**
   * Preload all images for a chapter.
   * Accepts an object with string values (asset paths).
   * Returns a Promise that resolves when all images are loaded or failed.
   */
  async preloadChapter(
    chapterId: string,
    assets: Record<string, string>,
  ): Promise<void> {
    const paths = Object.values(assets).filter(
      (v) => typeof v === 'string' && v.length > 0,
    );

    log.info(`Preloading chapter ${chapterId}: ${paths.length} assets`);

    const promises = paths.map((path) => this.load(path));
    await Promise.allSettled(promises);

    log.info(
      `Chapter ${chapterId} loaded: ${this._loadedCount}/${this._totalCount}`,
    );
  }

  /**
   * Preload a list of image paths.
   */
  async preloadImages(paths: string[]): Promise<void> {
    this._totalCount += paths.length;
    const promises = paths.map((path) => this.load(path));
    await Promise.allSettled(promises);
    log.info(`AssetLoader: ${this._loadedCount}/${this._totalCount} loaded`);
  }

  /**
   * Load a single image (cached, deduplicated).
   * Returns the loaded HTMLImageElement, or a broken-image element on error.
   */
  load(path: string): Promise<HTMLImageElement> {
    // Already cached?
    const cached = this.imageCache.get(path);
    if (cached) return Promise.resolve(cached);

    // Already loading?
    const pending = this.pendingLoads.get(path);
    if (pending) return pending;

    // Known failure?
    if (this.failedPaths.has(path)) {
      return Promise.resolve(this.createBrokenImage());
    }

    this._totalCount++;

    const promise = new Promise<HTMLImageElement>((resolve) => {
      const img = new Image();

      img.onload = () => {
        this.imageCache.set(path, img);
        this.pendingLoads.delete(path);
        this._loadedCount++;
        log.debug(`Loaded: ${path}`);
        resolve(img);
      };

      img.onerror = () => {
        log.warn(`Failed to load: ${path}`);
        this.failedPaths.add(path);
        this.pendingLoads.delete(path);
        this._loadedCount++;
        resolve(this.createBrokenImage());
      };

      img.src = path;
    });

    this.pendingLoads.set(path, promise);
    return promise;
  }

  /**
   * Get a cached image by path. Returns undefined if not loaded.
   * Use with ImageRenderer.drawImage() which handles undefined gracefully.
   */
  get(path: string): HTMLImageElement | undefined {
    return this.imageCache.get(path);
  }

  /**
   * Check if an image is loaded and ready.
   */
  isLoaded(path: string): boolean {
    const img = this.imageCache.get(path);
    return !!img && img.complete && img.naturalWidth > 0;
  }

  /**
   * Check if a path failed to load.
   */
  isFailed(path: string): boolean {
    return this.failedPaths.has(path);
  }

  /**
   * Clear the cache for a specific chapter.
   */
  clearChapter(assets: Record<string, string>): void {
    for (const path of Object.values(assets)) {
      if (typeof path === 'string') {
        this.imageCache.delete(path);
      }
    }
    log.info('Cleared chapter cache');
  }

  /**
   * Clear all caches.
   */
  clearAll(): void {
    this.imageCache.clear();
    this.pendingLoads.clear();
    this.failedPaths.clear();
    this._loadedCount = 0;
    this._totalCount = 0;
    log.info('AssetLoader: all caches cleared');
  }

  /**
   * Create a broken-image placeholder element.
   */
  private createBrokenImage(): HTMLImageElement {
    const img = new Image();
    img.width = 1;
    img.height = 1;
    return img;
  }
}
