import { useContext } from 'react'
import { UserDataContext } from '../context/userDataContext'
import type { UserDataContextValue } from '../context/userDataContext'

/** Reads the shared user-data context (lesson progress + streak). */
export function useUserData(): UserDataContextValue {
  return useContext(UserDataContext)
}
