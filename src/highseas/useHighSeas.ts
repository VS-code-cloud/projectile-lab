import { useCallback } from 'react'
import { useUserData } from '../hooks/useUserData'
import type {
  CargoGood,
  EncounterResult,
  HighSeasPosition,
  HighSeasSave,
  Town,
} from './types'
import {
  applyResult,
  arriveAt,
  normalizeHighSeasSave,
  setSail,
  startVoyage,
  updateLocation as updateVoyageLocation,
} from './voyage'
import { buyCargo, buyUpgrade, sellAllCargo } from './economy'

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
  /** Buy up to `amount` units of a good at the given town. */
  buy: (town: Town, good: CargoGood, amount: number) => void
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

  const buy = useCallback(
    (town: Town, good: CargoGood, amount: number) => {
      updateHighSeas((prev) => buyCargo(prev ?? startVoyage(), town, good, amount))
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
    // Always hand consumers a normalized save (hold shape migrated, location/route
    // defaulted) so cargo is reliably a CargoHold everywhere.
    save: highSeas ? normalizeHighSeasSave(highSeas) : null,
    loading,
    beginVoyage,
    resolveEncounter,
    sell,
    buy,
    upgrade,
    dock,
    depart,
    updateLocation,
  }
}
