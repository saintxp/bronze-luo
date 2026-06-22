/**
 * 铜声·识洛 — Asset manifest
 *
 * Centralized asset path mapping. All asset references go through this
 * manifest — never hardcode paths. In Phase 1, placeholders are drawn via
 * Canvas API; real assets will be referenced here when available.
 */

export interface AssetRef {
  path: string;
  type: 'image' | 'video' | 'audio';
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
    doorFrame: assetPath('tutorial', 'door-frame.png'),
    doorPanel: assetPath('tutorial', 'door-panel.png'),
    doorClosed: assetPath('tutorial', 'door-closed.png'),

    // L2: Window/Nest
    fgHole: assetPath('tutorial', 'fg-hole.png'),
    bgScene: assetPath('tutorial', 'bg-scene.png'),

    // L3: Gears
    gearFixed: assetPath('tutorial', 'gear-fixed.png'),
    gearMovable: assetPath('tutorial', 'gear-movable.png'),
    gearMeshed: assetPath('tutorial', 'gear-meshed.png'),
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
