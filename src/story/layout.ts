import { drawingOf, fragmentOf, objectPhrase } from '../content'
import type { Fragment, Sign } from '../content/types'
import { drawingsIn, type Event } from '../store/visit'

export const PRINT_W = 1080
export const PRINT_H = 1350
export const CLOTH_H = 1128 // the bands; the footer takes the rest

export type Band = {
  sign: Sign
  top: number
  height: number
  /** Where the 1080 px square drawing sits relative to the band's top. */
  imageTop: number
  invert: boolean
  clue: Fragment | null
  point: { x: number; y: number } | null // the clue, in print coordinates
  label: string
  labelSide: 'left' | 'right'
}

export type Lens = { band: Band; r: number; zoom: number }

export type PrintLayout = {
  bands: Band[]
  thread: string // SVG path through every clue, in visit order
  lenses: Lens[]
  made: Date
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

/** Smooth path through points (Catmull–Rom as cubic Béziers). */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return ''
  let d = `M${pts[0].x} ${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 }
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 }
    d += ` C${c1.x.toFixed(1)} ${c1.y.toFixed(1)}, ${c2.x.toFixed(1)} ${c2.y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
  }
  return d
}

/**
 * The Untold Story: one band per drawing in first-visit order, each cut through
 * the first clue found there, alternate bands inverted, and the thread running
 * through every clue in the order it was found.
 */
export function printLayout(story: Event[]): PrintLayout {
  const signs = drawingsIn(story)
  const finds = story.flatMap((e) => (e.type === 'find' ? [fragmentOf(e.fragment)].filter(Boolean) : [])) as Fragment[]
  const n = Math.max(1, signs.length)
  const h = CLOTH_H / n

  const bands: Band[] = signs.map((sign, i) => {
    const clue = finds.find((f) => f.drawing === sign) ?? null
    const cy = clue ? clue.y : 0.5
    const imageTop = clamp(h / 2 - cy * PRINT_W, h - PRINT_W, 0)
    const top = i * h
    return {
      sign,
      top,
      height: h,
      imageTop,
      invert: i % 2 === 1,
      clue,
      point: clue ? { x: clue.x * PRINT_W, y: top + imageTop + clue.y * PRINT_W } : null,
      label: clue ? objectPhrase(clue) : '',
      labelSide: clue && clue.x < 0.5 ? 'right' : 'left',
    }
  })

  const pts = bands.flatMap((b) => (b.point ? [b.point] : []))
  const thread = smoothPath([{ x: -20, y: 10 }, ...pts, { x: PRINT_W + 20, y: CLOTH_H + 20 }])

  // Up to three magnified windows: the first clue, one in the middle, the last.
  const withClue = bands.filter((b) => b.point)
  const picks = [...new Set([withClue[0], withClue[Math.floor(withClue.length / 2)], withClue[withClue.length - 1]])]
    .filter(Boolean)
    .slice(0, withClue.length >= 3 ? 3 : 1)
  const radii = [150, 125, 105]
  const lenses = picks.map((band, i) => ({ band, r: radii[i] * Math.min(1, 0.6 + h / 400), zoom: 1.7 }))

  const lastT = story.length ? story[story.length - 1].t : Date.now()
  return { bands, thread, lenses, made: new Date(lastT) }
}

export const madeOn = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

export const signName = (s: Sign) => drawingOf(s).name

/**
 * CSS `invert(1) hue-rotate(180deg)` as one colour matrix: swaps a drawing's two
 * inks while keeping their hues. Rows of r', g', b' over (r, g, b, a, 1).
 */
export const INVERT_MATRIX = [
  [0.574, -1.43, -0.144, 0, 1],
  [-0.426, -0.43, -0.144, 0, 1],
  [-0.426, -1.43, 0.856, 0, 1],
  [0, 0, 0, 1, 0],
]
