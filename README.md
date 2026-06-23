# ProjectileLab

A Brilliant-style interactive lesson app that teaches 2D projectile kinematics to
high-school physics students. Built with React + TypeScript + Vite, Firebase
(Google auth + Firestore), and Tailwind CSS. Interactive simulations render on an
HTML5 Canvas and are driven by a physically accurate kinematics engine.

## Features

- Google sign-in / sign-out via Firebase Auth (login is a dedicated page).
- Lessons and progress are gated behind authentication.
- Daily streak counter (increments once per local calendar day; resets on a
  missed day; new users start at 1).
- Per-lesson mastery bar: steps completed and
  `mastery % = (correct answers / total questions) * 100`.
- A 7-step (0-6) interactive lesson with instant correct/incorrect feedback.
- Mobile-first, touch-friendly UI.

## Getting started

```bash
npm install
cp .env.example .env   # fill in your Firebase web config values
npm run dev
```

Other scripts:

- `npm run build` - type-check and build for production.
- `npm run lint` - run ESLint.
- `npm run preview` - preview the production build.

## Environment variables

All Firebase config is read from `.env` (Vite `VITE_`-prefixed). These are public
client-side values. The Firebase project id is `brilliant-clone-eee48`. Firestore
is expected to run in open test mode for the MVP (no security rules hardening).

## Project structure

- `src/firebase/` - Firebase init, auth helpers, Firestore data access.
- `src/context/`, `src/hooks/` - auth state, streak, and lesson-progress logic.
- `src/physics/kinematics.ts` - the accurate projectile physics engine.
- `src/components/` - shared UI, the `CannonCanvas` renderer, and
  `src/components/interactive/` step components (lazy-loaded).
- `src/lessons/` - lesson types, the lesson JSON, and the interactive-component
  registry.
- `src/pages/` - login, home, and lesson-player pages.

## Authoring lessons

Lessons live as JSON (see [`src/lessons/projectile-2d.json`](src/lessons/projectile-2d.json))
so new content can be added without code changes. Each step references an
interactive React component by name via the registry in
[`src/lessons/registry.ts`](src/lessons/registry.ts).

Step shape:

```jsonc
{
  "uid": "step-id",
  "stepType": "demo | question",
  "displayText": "Prompt shown above the interactive area",
  "interactiveComponent": "RegistryKey",
  "expected": [21.2, 21.2],      // [0] for demonstrations
  "explanation": "Shown when wrong", // "" for demonstrations
  "tolerance": [0.1, 0.1],        // optional; defaults to 1 unit in last decimal place
  "params": { "v": 30, "theta": 45 } // optional scenario parameters
}
```

Answers are accepted within one rounding error of `expected`.
