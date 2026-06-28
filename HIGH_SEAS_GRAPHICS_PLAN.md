# High Seas Graphics Upgrade — In-Depth Plan

Self-contained implementation plan for making the `/high-seas` open-sea scene look like a professional game. Orchestrated with the `supervisor` skill (ticket topology, sequencing, integration) and executed leaf-by-leaf with `tdd-loop` (Plan → Act → Check, tests first). Grounded in the installed skills `r3f-postprocessing`, `threejs-shaders`, `blender-web-pipeline`, `game-engine`, and `3d-web-experience` (all under `.agents/skills/`).

> This doc is the single source of truth for the graphics work. Do not pull in unrelated bug-fix history.

## Progress log
- **2026-06-28 — Phase 1 underway (verified):**
  - ✅ **P1 shared** — added `@react-three/postprocessing@^3` + `postprocessing@^6.39` (installed with `--legacy-peer-deps`; postprocessing's three peer range lags 0.185 but runs fine). New pure `src/highseas/graphicsQuality.ts` (`selectGraphicsQuality` / `graphicsSettings` / `isMobileUserAgent`) + `src/test/highSeasGraphicsQuality.test.ts` (7 tests). `window.__highSeasSim` extended with `fps/drawCalls/triangles/quality`.
  - ✅ **P1-T1 post-FX** — `src/highseas/components/SeaPostFx.tsx` (`EffectComposer`: ACES `ToneMapping`, `Bloom`, `BrightnessContrast`+`HueSaturation` grade, `Vignette`, `SMAA`), gated by `GraphicsQuality`; renderer tone mapping disabled (`GL_PROPS.toneMapping = NoToneMapping`) so bloom is HDR. Verified in browser (composer renders, opaque, `seaCanvasRenders` flat, `contextLost` 0).
  - ✅ **P1-T3 water** — `src/highseas/components/SeaWater.tsx` (fog-enabled `ShaderMaterial`: procedural ripple normals, Schlick Fresnel deep→shallow, HDR sun specular for bloom, drifting foam), world-anchored via `uOrigin`, declarative `<shaderMaterial ref>` updated in `useFrame`. Pure `src/highseas/waterField.ts` + `src/test/highSeasWaterField.test.ts` (8 tests). Verified: rippled depth-graded sea fading into fog, streams while sailing, invariant holds.
  - ⏸️ **P1-T2 Environment/IBL — deferred**: the custom water shader does its own sun specular + Fresnel, so an env map adds little now; revisit if PBR ship/asset reflections are wanted (would also feed Phase 2 GLTF assets).
  - ⬜ **Remaining**: P1-T4 wake; Phase 1 regression sweep of other `/dev/*`; Phase 2 (terrain/assets/collision/shadows); Phase 3 (perf/LOD/robustness).
  - Status: `npm run lint` clean, `build` passing, **194 tests** green.

## Stack & key files
- React 19, Vite 8, TypeScript, React Three Fiber 9 / three 0.185, drei 10, Tailwind 4, Vitest.
- `src/highseas/components/OpenSeaScene3D.tsx` — the open-sea R3F scene. Contains the memoized `SeaCanvas` (the `<Canvas>` subtree), `SeaScene` (single `useFrame`), floating-origin helpers (`relX/relZ`, `WORLD=275000`), `ISLAND_RADIUS=2000`, `OCEAN_SIZE`, `FOG_*`, `CAMERA_PROPS`, `CANVAS_DPR`, and a dev-only `window.__highSeasSim` diagnostics hook + `webglcontextlost/restored` listeners.
- `src/pages/HighSeasPage.tsx` — owns React state + the per-frame `onSimFrame(delta)` callback the scene calls each frame (advances refs, soft collision, docking, throttled ~10 Hz HUD snapshot).
- `src/highseas/navigation.ts` — world math + `resolveIslandCollision`, `displayedSpeedMetersPerSecond`, `WORLD_SCALE_FACTOR`.
- `src/components/interactive/naval/` — shared `Ship`, `NavalEnvironment` (SHARED with lesson mini-games — do not edit for open-sea looks), `dampVec3`, WebGL detect.
- Dev harness: `/dev/high-seas` (no auth), supports `?calm` (pauses auto-encounters so the scene stays mounted for inspection).

## Critical rendering invariants (every ticket's Check must uphold these)
1. **No per-frame React `setState`.** All continuous animation runs in the scene's single `useFrame` (mutating refs / `THREE.Object3D` transforms) or in shader uniforms. React state is only for discrete events + a throttled ~10 Hz HUD snapshot. `EffectComposer`/effects live INSIDE the memoized `SeaCanvas`. A ticket that makes the parent re-render per frame FAILS — verify `window.__highSeasSim.seaCanvasRenders` stays ~flat while `frames` climbs.
2. **Floating origin.** The player ship sits at the scene origin; everything else is placed relative to the player (`relX/relZ`, scaled by `WORLD`). New visuals (water, terrain, assets) must respect this so huge world magnitudes never reach the GPU.
3. **Opaque frame.** The scene clears to the horizon color and the canvas wrapper is backed with that color; never let the page background show through. Adding drei `<Environment>` must reconcile with the existing `<color attach="background">` + fog.
4. **Perf budget.** Desktop ≥ 60 fps, mobile ≥ 30 fps. DPR capped `[1, 1.5]`. Heavy effects gated off on mobile / reduced motion (`useMotionPreference`).

## Verification strategy (the tdd-loop "Check" for this domain)
- **Pure logic** (quality selector, wave field, island height, collision) → `vitest` unit tests authored FIRST (red → green). The shader/sim math lives behind a pure TS function so it is deterministic and testable independent of the GPU.
- **WebGL / visual** → drive `/dev/high-seas?calm` through the browser MCP + CDP `Runtime.evaluate`, asserting `window.__highSeasSim` counters and `gl.readPixels` (opacity/colour). Screenshots are human corroboration only — never the pass/fail signal (the compositor can return stale frames).
- Always finish a ticket with `npm run lint && npm run build && npm run test` green.

## Shared contracts (supervisor finalizes before delegating)
1. **Deps:** add `@react-three/postprocessing postprocessing` (Phase 1) once.
2. **`GraphicsQuality` (`'high' | 'low'`):** a pure selector from device + `useMotionPreference` (reduced motion ⇒ `low`). Threads into the scene; gates effect toggles, `multisampling`, DPR, shadows/AO. Unit-tested.
3. **Asset/loader conventions:** `public/models/*.glb` (Draco) + `public/draco/` decoder path; `useGLTF` + `useGLTF.preload`; reuse the existing Suspense + WebGL fallback.
4. **`NavalEnvironment.tsx` is SHARED** — add an open-sea-specific sky/environment in the scene; do not edit the shared component for open-sea aesthetics.

## Collision map (file ownership)
- **Sequenced / supervisor-reserved (never parallelize):** `OpenSeaScene3D.tsx` (everything integrates here), `SeaCanvas` Canvas-level props (postfx, `shadows`), `navigation.ts` (collision + `heightAt`), `package.json`, `NavalEnvironment.tsx` (shared — avoid).
- **Disjoint / parallelizable leaves (new files + their tests):** `SeaPostFx.tsx`, `SeaWater.tsx` + `shaders/water.*.glsl` + pure `waterField.ts`, `SeaWake.tsx`, `SeaIsland.tsx` + island shaders + pure `islandHeight.ts`, asset-loader util. Draft in parallel; the supervisor integrates them into `OpenSeaScene3D` sequentially.

---

## Phase 1 — Atmosphere, water, post-FX (highest impact, additive, low risk)

**P1-T1 · Post-processing pipeline** — new `SeaPostFx.tsx` mounted inside `SeaCanvas`.
- `r3f-postprocessing`: `<EffectComposer multisampling={quality==='high'?4:0}>` with `ToneMapping(ACES_FILMIC)`, `Bloom(luminanceThreshold≈0.7, mipmapBlur, intensity)`, `SMAA` (last), `Vignette`, subtle `BrightnessContrast`/`HueSaturation`. Emissive highlights use `toneMapped={false}`. Animate via refs in `useFrame`, never `setState`. Low quality ⇒ ToneMapping + SMAA only.
- Acceptance: composer renders; AA on; FPS ≥ budget; `seaCanvasRenders` flat; `contextLost=0`. Check = CDP counters + `readPixels` + screenshot. Unit-test the `GraphicsQuality` selector.
- Sequence: FIRST (everything else assumes the composer + quality flag).

**P1-T2 · Sky / IBL** — open-sea-specific `<Environment>` (HDRI/preset) for reflections + exposure; optional sun mesh for `GodRays`.
- `3d-web-experience` (Environment/HDRI, single directional light) + `r3f-postprocessing` (GodRays with a `sun` ref). Reconcile with fog + opaque backstop. Do NOT touch shared `NavalEnvironment`.
- Acceptance: realistic sky + reflections on sea/ship; horizon still fogged seamlessly; other `/dev/*` games unaffected (regression). Sequence after T1 (shares `OpenSeaScene3D`).

**P1-T3 · Animated water** — replace the flat plane with a water shader.
- `threejs-shaders`: `ShaderMaterial` — vertex Gerstner/sine displacement (swell) + animated normal maps (ripples); fragment Fresnel deep/shallow tint via `cameraPosition`, depth/noise foam; `uTime` + player-velocity uniforms updated in the existing `useFrame`. Prefer `mix/step` over branches; `GLSL3`. Alternative: `onBeforeCompile` on `MeshStandardMaterial` to keep PBR + fog while injecting waves at `#include <begin_vertex>`.
- Pure seam: `waterField.ts` `gerstner(pos, t, params)` mirroring the shader math → vitest first.
- Files: `SeaWater.tsx`, `shaders/water.vert.glsl` / `.frag.glsl`, `waterField.ts` (+ test); edit `OpenSeaScene3D` to swap the plane.
- Acceptance: sea undulates + ripples while sailing; deep/shallow tint; shore foam; floating-origin respected; opaque; 60 fps; flat `seaCanvasRenders`. Sequence after T1/T2.

**P1-T4 · Ship wake + bow foam** — speed-driven trailing foam (soft particles / scrolling ribbon); Bloom catches bright foam; reduced motion ⇒ none. New `SeaWake.tsx`; sequence after T3.

**Phase 1 integration check:** sail `/dev/high-seas?calm` 30 s — CDP frames↑, `seaCanvasRenders` flat, `contextLost` 0, `readPixels` opaque + varied; FPS; regression on other `/dev/*`; `npm run lint && build && test`.

## Phase 2 — Real terrain islands + GLTF assets + shadows (structural)

**P2-T1 · Terrain island** — displaced mesh replacing the flat disc.
- `threejs-shaders` (heightfield/noise vertex displacement; triplanar/splat sand→grass→rock by height/slope; normal maps) + `game-engine/references/algorithms.md` (vector math). Pure seam: `islandHeight.ts` `heightAt(x,z)` (vitest), reused by collision so visuals and collision agree.
- Non-coplanar terrain removes shoreline z-fighting at the root → delete the interim `polygonOffset` and revisit `near/far` (cleanup in this ticket).
- Files: `SeaIsland.tsx` + island shaders + `islandHeight.ts` (+ test); edit `OpenSeaScene3D` town rendering. Acceptance: beaches/elevation; blended textures; no shore flicker over 30 s (CDP); LOD-ready.

**P2-T2 · GLTF asset pipeline** — port buildings/lighthouse/rocks/palms (+ optional ship).
- `blender-web-pipeline` incl. bundled `scripts/{batch_export,optimize_model,generate_lods}.py` and `references/*` (Draco level 6, ≤1024 textures JPEG/WebP, <50k tris, Principled BSDF; `GLTFLoader`+`DRACOLoader` / `useGLTF`+`preload`); instanced vegetation via drei `<Instances>`. Optional `blender-mcp` for agent-driven modeling (needs local Blender + MCP server). Asset authoring is offline; this ticket is pipeline + loaders + integration (placeholder/procedural meshes until real `.glb` art exists). Acceptance: models load under Suspense within budget, instanced; FPS holds; fallback intact.

**P2-T3 · Collision on terrain** — extend `resolveIslandCollision` to the terrain footprint, reuse `heightAt`; keep arm-then-moor. Pure fn + extend `highSeasNavigation.test.ts`. Shares `navigation.ts` → sequence after T1.

**P2-T4 · Shadows + AO** — `<Canvas shadows>`, one `directionalLight castShadow` with a frustum sized to the view; `r3f-postprocessing` `N8AO`/`SSAO` for grounding. Edits Canvas-level props (supervisor-reserved).

**Phase 2 integration:** confirm shoreline flicker gone via terrain (interim hacks removed), asset budgets, regression, lint/build/test.

## Phase 3 — Performance, LOD, robustness, polish
- **P3-T1 LOD + instancing + culling:** drei `<Detailed>` + `<Instances>`; consume `generate_lods.py` output.
- **P3-T2 Quality scaling:** DPR/effect/sample scaling via `GraphicsQuality` (r3f-postprocessing mobile guidance); `?quality=low` dev flag.
- **P3-T3 Robustness:** upgrade the `webglcontextlost/restored` listeners from logging to recovery (`game-engine/references/web-apis.md`); Suspense loaders for GLTF/HDRI; keep WebGL fallback.
- **P3-T4 Polish:** wake/foam/vegetation tuning, full reduced-motion paths.
- **Phase 3 integration:** FPS budget on desktop + throttled mobile (CDP), context-loss recovery test, full lint/build/test, final visual pass.

## Harness to extend (verification)
Extend the dev-only `window.__highSeasSim` with `fps`, `drawCalls` (`renderer.info.render.calls`), `triangles`, `quality`, effect flags, and asset-loaded counts (it already has `frames`, `seaCanvasRenders`, `contextLost/restored`, `playerX/Y`). Keep `/dev/high-seas?calm`; add `?quality=low`. Assert via CDP + `gl.readPixels`; `vitest` for every pure seam (`GraphicsQuality`, `waterField`, `islandHeight`, collision).

## Current code state this builds on (already implemented — do not redo)
- Ship traverses 10× slower than its displayed knots (`WORLD_SCALE_FACTOR=10`); islands are ~4× bigger (`ISLAND_RADIUS=2000`), camera FOV 68, depth range `near 2.5 / far 36000`, island-ground `polygonOffset` as an **interim** z-fight fix (Phase 2 P2-T1 retires it).
- Soft island collision + docking only via the mooring mini-game (sail clear to "arm", then enter a harbor; "Return to port" also routes through it).
- The open-sea sim already runs in a single `useFrame` via `onSimFrame`; the `SeaCanvas` is `React.memo`'d; `window.__highSeasSim` + context-loss listeners + `?calm` exist.
