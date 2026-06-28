import type { ReactElement } from 'react'
import {
  Bloom,
  BrightnessContrast,
  EffectComposer,
  HueSaturation,
  SMAA,
  ToneMapping,
  Vignette,
} from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import type { GraphicsSettings } from '../graphicsQuality'

/**
 * Open-sea post-processing stack, mounted INSIDE the memoized SeaCanvas so it
 * never reconciles on a HUD re-render. The renderer's own tone mapping is
 * disabled (Canvas `gl.toneMapping = NoToneMapping`) so Bloom operates in HDR
 * and ACES tone mapping is applied once here. Effects are gated by quality;
 * `low` keeps only tone mapping. Bloom needs emissive materials with
 * `toneMapped={false}` to glow. (EffectComposer's children are typed as
 * elements, so we assemble a filtered list rather than inline `&&`.)
 */
export function SeaPostFx({ settings }: { settings: GraphicsSettings }) {
  const effects: ReactElement[] = []

  if (settings.bloom) {
    effects.push(
      <Bloom
        key="bloom"
        luminanceThreshold={0.72}
        luminanceSmoothing={0.2}
        intensity={0.55}
        radius={0.7}
        mipmapBlur
      />,
    )
  }
  // Always present: maps HDR → display once (renderer tone mapping is off).
  effects.push(<ToneMapping key="tone" mode={ToneMappingMode.ACES_FILMIC} />)
  if (settings.colorGrade) {
    effects.push(<BrightnessContrast key="bc" brightness={0.015} contrast={0.06} />)
    effects.push(<HueSaturation key="hs" saturation={0.1} />)
  }
  if (settings.vignette) {
    effects.push(<Vignette key="vig" offset={0.3} darkness={0.5} />)
  }
  // SMAA last so it anti-aliases the final composited image.
  if (settings.smaa) {
    effects.push(<SMAA key="smaa" />)
  }

  return <EffectComposer multisampling={settings.multisampling}>{effects}</EffectComposer>
}
