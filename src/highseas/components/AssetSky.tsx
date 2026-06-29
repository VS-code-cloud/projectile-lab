import { Environment } from '@react-three/drei'
import { ASSET_SKY_HDRI_URL } from '../assets'

interface AssetSkyProps {
  /**
   * When true the HDRI is also drawn as the sky backdrop (a clear blue sky with
   * sun). When false it only provides image-based lighting/reflections and the
   * scene keeps its solid horizon-color background + fog.
   */
  background?: boolean
}

/**
 * CC0 HDRI sky/environment. Provides image-based lighting (nicer reflections on
 * the ship + water specular) and, optionally, a real sky backdrop. The scene's
 * fog still fades distant geometry into the horizon color, so the fogged sea
 * meets the sky seamlessly. Suspends while the .hdr loads (the solid background
 * shows meanwhile); the caller gates + error-bounds it.
 */
export function AssetSky({ background = true }: AssetSkyProps) {
  return (
    <Environment
      files={ASSET_SKY_HDRI_URL}
      background={background}
      backgroundBlurriness={0.04}
      environmentIntensity={0.85}
    />
  )
}
