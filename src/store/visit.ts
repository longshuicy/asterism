import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { fragmentOf, fragmentsIn } from '../content'
import type { Fragment, Sign } from '../content/types'

export type Via = 'asterism' | 'thread' | 'loom'

export type Event =
  | { t: number; type: 'enter'; drawing: Sign; via: Via }
  | { t: number; type: 'find'; fragment: string }
  | { t: number; type: 'follow'; from: string; to: string } // an echo taken
  | { t: number; type: 'cut' } // a story was made

export type Visit = { version: 1; events: Event[]; stories: Event[][] }

type Actions = {
  enter: (drawing: Sign, via: Via) => void
  find: (fragment: string) => void
  follow: (from: string, to: string) => void
  cut: () => boolean
  forget: () => void
}

const empty: Visit = { version: 1, events: [], stories: [] }

export const useVisit = create<Visit & Actions>()(
  persist(
    (set, get) => ({
      ...empty,
      enter: (drawing, via) => {
        // Re-entering the drawing you are already in (a reload, or back-and-forth
        // through the Asterism) is not a crossing.
        if (currentDrawing(get().events) === drawing) return
        set((s) => ({ events: [...s.events, { t: Date.now(), type: 'enter', drawing, via }] }))
      },
      find: (fragment) => {
        if (foundSet(get().events).has(fragment)) return
        set((s) => ({ events: [...s.events, { t: Date.now(), type: 'find', fragment }] }))
      },
      follow: (from, to) => set((s) => ({ events: [...s.events, { t: Date.now(), type: 'follow', from, to }] })),
      cut: () => {
        const { events, stories } = get()
        if (!canCut(events)) return false
        set({ events: [...events, { t: Date.now(), type: 'cut' }], stories: [...stories, sinceLastCut(events)] })
        return true
      },
      forget: () => set({ ...empty }),
    }),
    {
      name: 'asterism-visit',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ version, events, stories }) => ({ version, events, stories }),
    },
  ),
)

/* ── selectors: everything is derived from the log, never stored twice ── */

export function currentDrawing(events: Event[]): Sign | null {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i]
    if (e.type === 'enter') return e.drawing
  }
  return null
}

/** Drawings in the order they were entered; a drawing can appear more than once. */
export const visitOrder = (events: Event[]): Sign[] =>
  events.flatMap((e) => (e.type === 'enter' ? [e.drawing] : []))

export const foundOrder = (events: Event[]): string[] =>
  events.flatMap((e) => (e.type === 'find' ? [e.fragment] : []))

export const foundSet = (events: Event[]) => new Set(foundOrder(events))

export const visitedSet = (events: Event[]) => new Set(visitOrder(events))

export const followedAny = (events: Event[]) => events.some((e) => e.type === 'follow')

export function isUnlocked(f: Fragment, events: Event[]): boolean {
  const c = f.sealed
  if (f.kind !== 'sealed' || !c) return true
  if ('visited' in c) return visitedSet(events).has(c.visited)
  if ('found' in c) return foundSet(events).has(c.found)
  if ('followedAny' in c) return followedAny(events)
  return foundSet(events).size >= c.foundCount
}

/** The clues that can currently be found in a drawing (sealed ones count once opened). */
export const openClues = (sign: Sign, events: Event[]) => fragmentsIn(sign).filter((f) => isUnlocked(f, events))

export function hasRunDry(sign: Sign, events: Event[]): boolean {
  const all = fragmentsIn(sign)
  if (!all.length) return false
  const found = foundSet(events)
  // Dry means nothing more can be found here right now: every open clue found,
  // and anything still sealed is waiting on somewhere else.
  return openClues(sign, events).every((f) => found.has(f.id))
}

export function sinceLastCut(events: Event[]): Event[] {
  let i = events.length
  while (i > 0 && events[i - 1].type !== 'cut') i--
  return events.slice(i)
}

/** Drawings touched in a slice of the log, in first-visit order. */
export function drawingsIn(slice: Event[]): Sign[] {
  const seen: Sign[] = []
  const add = (s: Sign) => !seen.includes(s) && seen.push(s)
  for (const e of slice) {
    if (e.type === 'enter') add(e.drawing)
    if (e.type === 'find') {
      const f = fragmentOf(e.fragment)
      if (f) add(f.drawing)
    }
  }
  return seen
}

/** How many drawings must be woven (since the last cut) before the cloth can be cut. */
export const CUT_AT = 6

export const wovenCount = (events: Event[]) => drawingsIn(sinceLastCut(events)).length

export const canCut = (events: Event[]) => wovenCount(events) >= CUT_AT
