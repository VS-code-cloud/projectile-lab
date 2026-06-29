import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import type { User } from 'firebase/auth'
import { db } from './config'

/** A single recorded response for an interactive step. */
export interface StepAnswer {
  /** The numeric values the user submitted. */
  values: number[]
  /** Whether the submission was judged correct, or null for ungraded prompts. */
  correct: boolean | null
}

/** Per-lesson progress tracked for a user. */
export interface LessonProgress {
  /** Number of steps whose required interaction has been finished. */
  numStepsCompleted: number
  /** Number of question steps the user has submitted an answer to. */
  numAttempts: number
  /** Number of question steps answered correctly. */
  numCorrect: number
  /**
   * Step uids whose required interaction is finished. Backs numStepsCompleted
   * and prevents double counting when a user revisits a step.
   */
  completedStepUids: string[]
  /**
   * Recorded answers keyed by step uid. Persists locked answers so a returning
   * user sees their previous answer and feedback (one answer per step).
   */
  answers: Record<string, StepAnswer>
}

/** Returns an empty progress object for a not-yet-started lesson. */
export function emptyLessonProgress(): LessonProgress {
  return {
    numStepsCompleted: 0,
    numAttempts: 0,
    numCorrect: 0,
    completedStepUids: [],
    answers: {},
  }
}

/** Status of a "Sail the High Seas" voyage. */
export type HighSeasStatus = 'docked' | 'sailing' | 'sunk'

/** Normalized sea-map position in [0, 1] coordinates. */
export interface HighSeasPosition {
  x: number
  y: number
}

/** Recoverable autonav route state between two towns. */
export interface HighSeasRoute {
  fromTownId: string
  toTownId: string
  progress: number
}

/** The two tradeable cargo goods carried in the hold and sold at ports. */
export type CargoGood = 'silk' | 'spice'

/** Quantities of each good currently in the hold. */
export interface CargoHold {
  silk: number
  spice: number
}

/**
 * Persistent save for the "Sail the High Seas" capstone game. Derived values
 * (cargo capacity, engine force, max hull) come from `upgradeStage` via the
 * upgrade table in the game module, so only the raw progression is stored.
 */
export interface HighSeasSave {
  /** Banked coins — the score. */
  coins: number
  /** Cargo carried in the hold, split by good (silk + spice ≤ capacity). */
  cargo: CargoHold
  /** Index into the upgrade table (0 = starting sloop). */
  upgradeStage: number
  /** Remaining hull hit points. */
  hullHp: number
  /** Town the ship is currently at or sailing from. */
  townId: string
  /** Seed driving deterministic encounter rolls. */
  seed: number
  /** Whether the player is docked, at sea, or sunk. */
  status: HighSeasStatus
  /** Current sea-map position; older saves are migrated from `townId`. */
  location?: HighSeasPosition
  /** Active autonav route, if any. Kept null when docked or free-sailing. */
  route?: HighSeasRoute | null
}

/** Returns a fresh High Seas save for a brand-new voyage. */
export function emptyHighSeasSave(): HighSeasSave {
  return {
    coins: 0,
    cargo: { silk: 0, spice: 0 },
    upgradeStage: 0,
    hullHp: 100,
    townId: '',
    seed: Date.now() % 2147483647,
    status: 'docked',
  }
}

/** Shape of a `users/{uid}` Firestore document. */
export interface UserDoc {
  email: string
  name: string
  /** Map of lessonUid -> progress. */
  lessons: Record<string, LessonProgress>
  /** Epoch milliseconds (UTC) of the last activity used for streak math. */
  lastTimeActive: number
  /** Current consecutive-day streak. */
  currentStreak: number
  /** Saved "Sail the High Seas" voyage, if the player has started one. */
  highSeas?: HighSeasSave
}

/**
 * Returns the Firestore document reference for a given user id.
 * @param uid Firebase auth user id.
 */
function userRef(uid: string) {
  return doc(db, 'users', uid)
}

/**
 * Fetches a user's document, returning null if it does not yet exist.
 * @param uid Firebase auth user id.
 */
export async function getUserDoc(uid: string): Promise<UserDoc | null> {
  const snap = await getDoc(userRef(uid))
  return snap.exists() ? (snap.data() as UserDoc) : null
}

/**
 * Ensures a `users/{uid}` document exists, creating it for new users with a
 * starting streak of 1. Returns the existing or newly created document.
 * @param user Authenticated Firebase user.
 */
export async function ensureUserDoc(user: User): Promise<UserDoc> {
  const existing = await getUserDoc(user.uid)
  if (existing) return existing

  const fresh: UserDoc = {
    email: user.email ?? '',
    name: user.displayName ?? '',
    lessons: {},
    lastTimeActive: Date.now(),
    currentStreak: 1,
  }
  await setDoc(userRef(user.uid), fresh)
  return fresh
}

/**
 * Persists an updated streak value and last-active timestamp.
 * @param uid Firebase auth user id.
 * @param currentStreak New streak value.
 * @param lastTimeActive Epoch milliseconds (UTC) of this activity.
 */
export async function saveStreak(
  uid: string,
  currentStreak: number,
  lastTimeActive: number,
): Promise<void> {
  await updateDoc(userRef(uid), { currentStreak, lastTimeActive })
}

/**
 * Writes a lesson's progress object back to the user document.
 * @param uid Firebase auth user id.
 * @param lessonUid Lesson identifier.
 * @param progress Updated progress for that lesson.
 */
export async function saveLessonProgress(
  uid: string,
  lessonUid: string,
  progress: LessonProgress,
): Promise<void> {
  await setDoc(
    userRef(uid),
    { lessons: { [lessonUid]: progress } },
    { merge: true },
  )
}

/**
 * Persists the player's High Seas voyage save.
 * @param uid Firebase auth user id.
 * @param save Updated voyage state.
 */
export async function saveHighSeas(
  uid: string,
  save: HighSeasSave,
): Promise<void> {
  await setDoc(userRef(uid), { highSeas: save }, { merge: true })
}
