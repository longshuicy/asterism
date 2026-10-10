import drawingsJson from './drawings.json'
import fragmentsJson from './fragments.json'
import type { Drawing, Fragment, Sign } from './types'

export const drawings = drawingsJson as Drawing[]
export const fragments = fragmentsJson as Fragment[]

export const SIGNS = drawings.map((d) => d.sign)

const drawingBySign = new Map(drawings.map((d) => [d.sign, d]))
const fragmentById = new Map(fragments.map((f) => [f.id, f]))

export const isSign = (s: string | undefined): s is Sign => !!s && drawingBySign.has(s as Sign)
export const drawingOf = (sign: Sign): Drawing => drawingBySign.get(sign)!
export const fragmentOf = (id: string): Fragment | undefined => fragmentById.get(id)
export const fragmentsIn = (sign: Sign): Fragment[] => fragments.filter((f) => f.drawing === sign)

/** A clue's letter within its drawing (a, b, c …), in the order of fragments.json. */
export const letterOf = (f: Fragment) => {
  const i = fragmentsIn(f.drawing).findIndex((x) => x.id === f.id)
  return i < 26 ? String.fromCharCode(97 + i) : String(i + 1)
}

/** "the oil lamp" — object names read as lower-case phrases in running text. */
export const objectPhrase = (f: Fragment) => f.object.charAt(0).toLowerCase() + f.object.slice(1)
