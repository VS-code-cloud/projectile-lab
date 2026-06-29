/**
 * "HD assets" feature flag + asset URLs for the High Seas scene.
 *
 * A small set of CC0 glTF models + an HDRI sky live in `public/assets-hd/` and
 * are rendered ONLY when this flag is on. With the flag off (the default, and
 * what production ships unless `VITE_NEW_ASSETS_ENABLED` is set on Vercel) the
 * scene renders its original procedural meshes — so the UI works identically
 * with or without the downloaded assets. This gating keeps any asset-loading
 * risk (missing file, decode error) out of the default/production path.
 *
 * The flag logic is a pure function so it is unit-testable independent of the
 * bundler/runtime.
 */

/**
 * Resolve whether the HD asset layer is enabled.
 *
 * @param envValue  Value of `import.meta.env.VITE_NEW_ASSETS_ENABLED`.
 * @param search    A `location.search` string (e.g. `"?newAssets=1"`). Only the
 *                  caller's dev builds pass a real value here; production passes
 *                  `''` so the URL override can't flip the flag for real users.
 */
export function parseNewAssetsFlag(
  envValue: string | undefined,
  search: string,
): boolean {
  const env = (envValue ?? '').trim().toLowerCase()
  if (env === 'true' || env === '1') return true

  const params = new URLSearchParams(search)
  if (params.has('newAssets')) {
    const v = (params.get('newAssets') ?? '').trim().toLowerCase()
    // Bare `?newAssets` (empty value) enables; `=0`/`=false` explicitly disables.
    return v !== '0' && v !== 'false' && v !== 'no'
  }
  return false
}

const DEV = import.meta.env.DEV

/**
 * Runtime accessor used by the scene. Reads the build-time env flag; in dev it
 * also honors a `?newAssets` query override so both render paths can be
 * screenshot-tested without rebuilding. Evaluated once per mount.
 */
export function newAssetsEnabled(): boolean {
  const env = import.meta.env.VITE_NEW_ASSETS_ENABLED as string | undefined
  const search =
    DEV && typeof window !== 'undefined' ? window.location.search : ''
  return parseNewAssetsFlag(env, search)
}

/** Base-aware URL for a file under `public/assets-hd/`. */
function assetUrl(path: string): string {
  const base = import.meta.env.BASE_URL || '/'
  return `${base.replace(/\/$/, '')}/assets-hd/${path}`
}

export const ASSET_SHIP_URL = assetUrl('models/ship.glb')
export const ASSET_PALM_URL = assetUrl('models/palm.glb')
export const ASSET_ROCK_URL = assetUrl('models/rock.glb')
export const ASSET_SKY_HDRI_URL = assetUrl('hdri/sky_1k.hdr')
