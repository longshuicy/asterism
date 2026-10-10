import { useSyncExternalStore } from 'react'

const query = typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null

const subscribe = (cb: () => void) => {
  query?.addEventListener('change', cb)
  return () => query?.removeEventListener('change', cb)
}

export const prefersReducedMotion = () => !!query?.matches

/** Swaps zooms for crossfades and turns off the idle nudge. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, prefersReducedMotion, () => false)
}
