# High Seas — Handoff for a New Chat Session

Paste this whole file into the new chat (or tell the agent: "Read `HIGH_SEAS_HANDOFF.md` and start with the TOP PRIORITY bug").

---

## ✅ RESOLVED (2026-06-28): open-sea canvas flicker — fixed by decoupling the sim from React render

**Root cause (confirmed):** the per-frame React `setState` in `HighSeasPage.tsx`'s rAF loop re-rendered the page → `OpenSeaScene3D` → `<Canvas>` ~60fps, churning the renderer and producing transient transparent frames.

**Fix (as recommended below):**
- The open-sea simulation now runs in a **single `useFrame`** inside the scene. `HighSeasPage` exposes a stable `onSimFrame(delta)` callback (the old `tick` body) that the scene calls each frame; it advances physics into refs (`playerRef`/`headingRef`/`speedRef`/`elapsedRef`) and lifts **only** discrete events (contact refresh, encounter trigger, fire-control transitions) plus a **throttled ~10Hz HUD snapshot** (`player`/`speed`/`sailingSeconds`) to React. No per-frame `setState`.
- The scene reads the sim refs in `useFrame` and mutates `THREE.Object3D` transforms directly (player-ship heading, floating-origin town/contact group positions, sparkle tiling, chase camera). The `headingDeg` React state was removed.
- The `<Canvas>` subtree is wrapped in `React.memo` (`SeaCanvas`) so the throttled HUD/map re-renders never reconcile the renderer. The wrapper div is also backed with `HORIZON_COLOR` as defense-in-depth (the R3F context actually composites with alpha:true, so this guarantees the dark page can never show through even on a bad frame).

**Verification (real browser via CDP `Runtime.evaluate`, not screenshots):** added a dev-only `window.__highSeasSim` hook (gated by `import.meta.env.DEV`). Over a sailing session: `frames` climbed 692 → 6076 while `seaCanvasRenders` stayed at **2 → 14** (the Canvas is NOT re-rendering per frame — the actual fix), `contextLost` = **0**, frame delta ~16–17ms, and `playerX` advanced while sailing. `gl.readPixels` returned opaque (alpha 255) brown-ship + blue-sea pixels; screenshot showed a solid opaque ocean. `npm run lint && build && test` (175 tests) all green.

**Dev aids left in place (DEV-only, tree-shaken from prod):** `window.__highSeasSim` diagnostics + `webglcontextlost/restored` listeners in `OpenSeaScene3D.tsx`, and the `/dev/high-seas?calm` flag in `HighSeasPage.tsx` (pauses auto-encounters so the scene stays mounted for inspection).

---

## (Historical) TOP PRIORITY — bug write-up that led to the fix above

**Symptom (reproduces in a real browser):** On `/high-seas` → **Begin voyage** → **Enter open sea**, the 3D canvas flickers in and out — the dark page background shows through the canvas intermittently while the ship moves. It looks like the WebGL canvas is being cleared/transparent on some frames.

### What was already tried and did NOT fix it
All in `src/highseas/components/OpenSeaScene3D.tsx`:
- Made the `<Canvas>` `camera` and `dpr` props **stable module constants** (`CAMERA_PROPS`, `CANVAS_DPR`) instead of inline literals.
- Removed `performance={{ min: 0.5 }}` (adaptive DPR regression).
- Set `gl={{ alpha: false }}` (opaque canvas; `GL_PROPS`).
- Earlier: replaced the reflective sea (`MeshReflectorMaterial`) with a plain ship-centered plane; set the canvas background `<color>` to match the fog/horizon color.

These were aimed at "R3F reconfiguring the renderer every frame because the parent re-renders 60fps with fresh prop identities." It did **not** resolve the flicker, so the real cause is most likely deeper (see below).

### Strongest remaining hypothesis — FIX THIS FIRST
**The scene is driven by per-frame React `setState`.** `src/pages/HighSeasPage.tsx` runs a `requestAnimationFrame` loop (search for `function tick(`) that calls `setPlayer`, `setHeadingDeg`, `setSpeed`, `setSailingSeconds` **every frame (~60fps)**. That re-renders the entire page → `OpenSeaScene3D` → `<Canvas>` every frame. This is the exact anti-pattern the `3d-web-experience` skill warns against ("avoid per-frame React setState; mutate refs in `useFrame`"). Combined with React `<StrictMode>` (see `src/main.tsx`), this is the likely source of canvas churn / intermittent transparency.

**Recommended fix:** Decouple the simulation from React rendering.
- Move the ship/world/camera updates into a single `useFrame` **inside** the R3F scene, mutating refs / `THREE.Object3D` transforms directly. The other naval mini-games already do exactly this and do NOT flicker — copy their pattern:
  - `src/components/interactive/MoorStopGame3D.tsx`, `JettisonGame3D.tsx`, `KedgeGame3D.tsx` (they keep sim values in `useRef`, mutate mesh positions in `useFrame`, and only `setState` on discrete events).
- Keep React state ONLY for discrete/low-frequency UI: encounter started, contacts list changed, fire-control readiness, HUD text (speed/sailing seconds can update a few times per second, not every frame).
- NOTE: the open-sea scene uses a **floating origin** — every object is positioned *relative to the player* (`relArray(pos, player)`), because the world scale is huge (`WORLD = 275000`). So to move the world via refs you'll need refs to the ship + each world group and update their positions from a `playerRef` inside `useFrame` (or restructure so the player ship + camera stay at origin and a single "world" group is offset by `-playerRenderPos` each frame — but beware: children far from origin will get float precision jitter, which is why per-object relative positioning was used).

### Other hypotheses to check if the above isn't enough
1. **WebGL context loss/restore loop.** Add `webglcontextlost` / `webglcontextrestored` listeners on the canvas and log them; if they fire repeatedly, the GPU is losing the context (R3F doesn't auto-recover the scene → blank/flicker). The huge `WORLD = 275000` and `OCEAN_SIZE = 80000` plane *shouldn't* crash, but confirm.
2. **StrictMode double-mount of the Canvas (dev only).** Test a production build behavior. (Caveat: the `/dev/*` harness routes and the `?calm` idea below are dev-only; `/high-seas` is auth-gated — see Project Facts.)
3. **Depth precision / z-fighting** at the large scale (`near: 0.5`, `far: 42000`). Would be localized shimmer on the ocean/ship, not whole-canvas transparency, but rule it out (e.g., raise `near`, lower `far`, or reduce `WORLD`).

### How to reproduce
`npm run dev`, open `http://localhost:5173/dev/high-seas` (dev harness, no auth) → **Begin voyage** → **Enter open sea**. Sail with arrow keys; watch the 3D area flicker.

### How to verify a fix (IMPORTANT)
- **Verify in a real desktop browser.** The previous session used an automation/CDP browser whose GPU process became saturated (lost WebGL contexts) and whose screenshot compositor returned **stale/transparent frames** — so screenshots there were unreliable and repeatedly showed a transparent canvas even when the scene was actually rendering (proven once via `gl.readPixels`: blue sea + brown ship, opaque). Do not trust automation screenshots for this bug.
- Good check: in DevTools console, run a `requestAnimationFrame` loop for a few seconds that (a) logs any `webglcontextlost` events and (b) samples canvas pixels; confirm no transparent frames and no context-loss events. Or just watch it sail for 20–30s.
- A handy temporary trick the previous session used: a dev-only `?calm=1` flag to pause auto-encounters so the scene stays up for inspection (it was reverted; re-add if useful).

---

## Project facts
- **Repo:** `/home/vs/AlphaAI/brilliant-alpha-clone`
- **Stack:** React 19, Vite 8, TypeScript, React Three Fiber 9 / three 0.185, Tailwind 4, Firebase, react-router 7, Vitest.
- **Commands:** `npm run dev`, `npm run test` (vitest — 175 tests, all passing), `npm run lint` (eslint — clean), `npm run build` (tsc + vite — passing).
- **StrictMode:** enabled in `src/main.tsx`.
- **Dev harness routes (no auth), gated by `import.meta.env.DEV` in `src/App.tsx`:** `/dev/high-seas`, `/dev/cannon`, `/dev/moor-stop`, `/dev/jettison`, `/dev/kedge`, `/dev/heel-deck`, `/dev/maelstrom`. The real `/high-seas` is behind `ProtectedRoute` (auth).
- **WSL note:** the dev server binds to localhost; to reach it from an external browser the previous session ran `npm run dev -- --host 0.0.0.0 --port <p>`.

---

## High Seas architecture (key files)
- `src/pages/HighSeasPage.tsx` — orchestrates modes (`port` / `open` / encounter overlays), the **per-frame rAF sim loop** (the bug lives here), arrow-key input, encounter triggering + cadence, teleport, and the open-sea pirate fire-control state. Also `PORT_OFFSHORE` spawn offset.
- `src/highseas/components/OpenSeaScene3D.tsx` — the open-sea R3F scene: ocean plane, player `Ship`, island/town meshes, contact ships, dotted firing-range circle, top-right clickable mini-map, bottom-right Fire button. **Floating-origin** rendering; `WORLD`, `ISLAND_RADIUS`, `OCEAN_SIZE`, `FOG_*`, `CAMERA_PROPS`, `CANVAS_DPR`, `GL_PROPS`, `relArray()`.
- `src/highseas/navigation.ts` — world math: `WORLD_DISTANCE_METERS = 6000` (gameplay meters; independent of render `WORLD`), heading↔vector/render-rotation helpers, `applyShipControls`, `distanceMeters`, `findTownAtPosition`, `mapPositionPercent`.
- `src/highseas/worldEncounters.ts` — `generateVisibleContacts`, cadence consts (`OPEN_SEA_ENCOUNTER_INTERVAL_SECONDS = 20`, `OPEN_SEA_CONTACT_REFRESH_SECONDS = 15`), `buildNavyEncounter` / `buildPirateEncounter`, `windForceFor` (navy force), `NAVY_ESCAPE_ACCEL = 7`.
- `src/highseas/components/EncounterChallenges.tsx` — `NavyPursuit` (Newton/jettison; ship mass `200 + 40·cargo`, auto-escapes if already light enough), `OverboardRescue`, `TownMooring`, `ReloadChallenge`, `WhirlpoolHazard` (reuse lesson mini-games).
- `src/highseas/components/PirateBattle.tsx` — wraps `CannonGame3D` for pirate fights; supports `autoStart`.
- `src/components/interactive/CannonGame3D.tsx` — the 2D-kinematics cannon scene, rethemed to **ship-vs-pirate-ship**; the cannon is small and mounted on the player ship. Used by lesson `projectile-2d` step-7 AND by `PirateBattle`. (This scene renders fine / does not flicker — it does NOT use per-frame React setState; good reference.)
- `src/components/interactive/naval/` — shared `Ship` model, `NavalEnvironment`, `NavalGameShell`, `dampVec3`, WebGL detect.
- `src/highseas/useHighSeas.ts`, `voyage.ts`, `upgrades.ts`, `encounters.ts`, `constants.ts`, `types.ts`, `rng.ts` — voyage state/persistence, upgrade tiers, encounter rolls, towns.

---

## Behaviors already implemented (do NOT redo unless changing them)
- Arrow-key open-sea sailing; held-key movement; ship faces its heading.
- Top-right mini-map shows player position + towns; click a town to **teleport** (always triggers exactly one encounter, then docks).
- Manual sailing triggers pirate/navy encounters at a ~20s cadence; the clock resets on resolve so **"Return to sea" does not immediately re-trigger** a navy fight.
- Navy fight (Newton's law / jettison): force `4000 + 500·upgradeStage ± 1000`, escape accel `7`, ship mass `200 + 40·cargo`; auto-escape if light enough.
- Open-sea pirate fight: dotted max-firing-range ring; bottom-right **Fire** button is disabled until in range, then a 0.5–2s "preparing" delay, then it opens the 2D-kinematics cannon sim at the frozen distance.
- Map-triggered pirate fight opens the cannon sim directly.
- 2D projectile lesson capstone rethemed to ship-firing-on-enemy-pirate-ship at 500 m; cannon shrunk and mounted on the ship.
- Larger/farther islands (~100× ship; towns ~100× island apart) via floating origin; ship spawns just offshore of its port.

---

## Suggested first action for the new session
The flicker (former top priority) is **fixed** — see the RESOLVED section at the top. The open-sea sim now runs in a single `useFrame` driven by `onSimFrame`, with refs as the source of truth and only discrete/throttled events lifted to React.

If continuing High Seas work, sensible next steps:
1. Sanity-check the refactor again in a real browser if anything feels off (use `/dev/high-seas?calm` and read `window.__highSeasSim`: `seaCanvasRenders` should stay tiny while `frames` climbs; `contextLost` should be 0).
2. Optional cleanup: the `gl={{ alpha: false }}` hint on `<Canvas>` does not actually take effect in this R3F/three version (context reports `alpha:true`); the horizon-color wrapper background compensates, but making the context truly opaque would be tidier.
3. Otherwise, pick up gameplay/UX polish; the per-frame-`setState` anti-pattern is gone.

## Graphics upgrade plan → moved to its own doc
The in-depth, supervisor-orchestrated graphics-upgrade plan (water/terrain/post-FX, phased tickets, verification harness) now lives in **`HIGH_SEAS_GRAPHICS_PLAN.md`** — the single source of truth for that work. The earlier gameplay changes (10× slower ship, ~4× bigger islands, soft collision + mooring-only docking) are summarized there under "Current code state this builds on".
