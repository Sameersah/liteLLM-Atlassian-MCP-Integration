import { useState, useCallback } from 'react'

function safeGetItem(key, fallback = '') {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(key) || fallback : fallback
  } catch {
    return fallback
  }
}

function safeSetItem(key, value) {
  try {
    if (value != null && value !== '') localStorage.setItem(key, value)
    else localStorage.removeItem(key)
  } catch (_) {}
}

export function useLocalStorage(key, fallback = '') {
  const [value, setValue] = useState(() => safeGetItem(key, fallback))

  const set = useCallback(
    (next) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next
        safeSetItem(key, resolved)
        return resolved
      })
    },
    [key]
  )

  return [value, set]
}
