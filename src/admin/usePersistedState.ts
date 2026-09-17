import { useEffect, useState } from 'react'

/**
 * Same as useState, but persisted to localStorage under `key` — used for things like list
 * filters that should survive navigating away and coming back (or a reload), since they're
 * a per-browser preference, not shared app state.
 */
export function usePersistedState<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw !== null ? (JSON.parse(raw) as T) : defaultValue
    } catch {
      return defaultValue
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // private browsing / storage quota — losing the persisted filter is an acceptable fallback
    }
  }, [key, value])

  return [value, setValue] as const
}
