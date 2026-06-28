import { useCallback } from 'react'
import { useUserData } from '../hooks/useUserData'
import type { EncounterResult, HighSeasPosition, HighSeasSave, Town } from './types'
import {
  applyResult,
  arriveAt,
  setSail,
  startVoyage,
  updateLocation as updateVoyageLocation,
} from './voyage'
import { buyUpgrade, sellAllCargo } from './economy'

/** Hook API for driving a High Seas voyage, persisted via the user-data context. */
export interface UseHighSeasResult {
  /** The current voyage save, or null if none started / still loading. */
  save: HighSeasSave | null
  /** True until the user document has loaded. */
  loading: boolean
  /** Start a fresh voyage (also used to restart after being sunk). */
  beginVoyage: () => void
  /** Apply the outcome of a resolved encounter to the save. */
  resolveEncounter: (result: EncounterResult) => void
  /** Sell the entire hold at the given town. */
  sell: (town: Town) => void
  /** Buy the next ship upgrade if affordable. */
  upgrade: () => void
  /** Dock at a town (ends the leg). */
  dock: (townId: string) => void
  /** Set sail (advances the encounter seed). */
  depart: () => void
  /** Persist current open-sea position. */
  updateLocation: (location: HighSeasPosition) => void
}

/**
 * Thin façade over the shared user-data context that applies the pure voyage
 * transitions and persists each change to Firestore. All mutations funnel
 * through `updateHighSeas`, so a brand-new player gets a fresh voyage lazily.
 */
export function useHighSeas(): UseHighSeasResult {
  const { highSeas, loading, updateHighSeas } = useUserData()

  const beginVoyage = useCallback(() => {
    updateHighSeas(() => startVoyage())
  }, [updateHighSeas])

  const resolveEncounter = useCallback(
    (result: EncounterResult) => {
      updateHighSeas((prev) => applyResult(prev ?? startVoyage(), result))
    },
    [updateHighSeas],
  )

  const sell = useCallback(
    (town: Town) => {
      updateHighSeas((prev) => sellAllCargo(prev ?? startVoyage(), town))
    },
    [updateHighSeas],
  )

  const upgrade = useCallback(() => {
    updateHighSeas((prev) => buyUpgrade(prev ?? startVoyage()))
  }, [updateHighSeas])

  const dock = useCallback(
    (townId: string) => {
      updateHighSeas((prev) => arriveAt(prev ?? startVoyage(), townId))
    },
    [updateHighSeas],
  )

  const depart = useCallback(() => {
    updateHighSeas((prev) => setSail(prev ?? startVoyage()))
  }, [updateHighSeas])

  const updateLocation = useCallback(
    (location: HighSeasPosition) => {
      updateHighSeas((prev) => updateVoyageLocation(prev ?? startVoyage(), location))
    },
    [updateHighSeas],
  )

  return {
    save: highSeas,
    loading,
    beginVoyage,
    resolveEncounter,
    sell,
    upgrade,
    dock,
    depart,
    updateLocation,
  }
}
