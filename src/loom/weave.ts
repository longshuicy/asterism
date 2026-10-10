import { fragmentOf, SIGNS } from '../content'
import type { Sign } from '../content/types'
import type { Event } from '../store/visit'

/* Loom geometry, in the 1440-wide coordinate space of the design. */
export const LOOM_W = 1440
export const PITCH = LOOM_W / SIGNS.length // 120
export const STRIP = 84
export const WARP_TOP = 78
const HALF = STRIP / 2
const MARGIN = 12 // how far a pass reaches past the strip before turning
export const ROW = 21
const FIRST_ROW = 122
const TAIL = 100 // room below the last row for the loose end

export const warpX = (i: number) => PITCH / 2 + i * PITCH

export type Weave = {
  coral: string // the thread: passes, echo crossings and turns, with over/under gaps
  plain: { x1: number; x2: number; y: number }[] // crossings via the Asterism or the loom
  beads: { x: number; y: number }[] // one per clue found
  snips: { x: number; y: number }[] // where a story was cut
  row: number // vertical distance between passes
  height: number
  touched: Set<Sign>
}

/**
 * Walks the log into rows. Each `find` is a pass across the current warp with a
 * bead on it; each `enter` is a crossing to another warp. Crossings made by
 * following an echo are coral; the rest are a thin plain weft.
 *
 * With `fit`, rows are packed closer together so the weave is no taller than `fit`.
 */
export function weave(events: Event[], fit = 0): Weave {
  const full = walk(events, ROW)
  if (!fit || full.height <= fit) return full
  const rows = (full.height - FIRST_ROW - TAIL) / ROW
  return walk(events, Math.max(1, (fit - FIRST_ROW - TAIL) / rows))
}

function walk(events: Event[], rowH: number): Weave {
  const index = (s: Sign) => SIGNS.indexOf(s)
  const left = (i: number) => warpX(i) - HALF - MARGIN
  const right = (i: number) => warpX(i) + HALF + MARGIN

  const coral: string[] = []
  const plain: Weave['plain'] = []
  const beads: Weave['beads'] = []
  const snips: Weave['snips'] = []
  const touched = new Set<Sign>()

  let cur: number | null = null
  let x = 0
  let row = 0
  let open = false // is the coral path continuous into the next row?
  let followed = false // was the next crossing made by following an echo?

  const y = () => FIRST_ROW + row * rowH

  /** Horizontal coral run at the current row, broken wherever it passes under a strip. */
  function run(x1: number, x2: number) {
    const a = Math.min(x1, x2)
    const b = Math.max(x1, x2)
    let pieces: [number, number][] = [[a, b]]
    SIGNS.forEach((_, k) => {
      if ((row + k) % 2 === 0) return // over this strip
      const s0 = warpX(k) - HALF
      const s1 = warpX(k) + HALF
      pieces = pieces.flatMap(([p, q]) => {
        if (q <= s0 || p >= s1) return [[p, q]]
        const out: [number, number][] = []
        if (p < s0) out.push([p, s0])
        if (q > s1) out.push([s1, q])
        return out
      })
    })
    for (const [p, q] of pieces) coral.push(`M${p} ${y()}H${q}`)
  }

  /** Turn down to the next row, bulging away from the warp. */
  function turn(warp: number) {
    const sweep = x > warpX(warp) ? 1 : 0
    coral.push(`M${x} ${y()} A${rowH / 2} ${rowH / 2} 0 0 ${sweep} ${x} ${y() + rowH}`)
    row++
  }

  for (const e of events) {
    if (e.type === 'enter') {
      const j = index(e.drawing)
      touched.add(e.drawing)
      if (cur === null) {
        cur = j
        x = left(j)
        continue
      }
      if (j === cur) continue
      const to = warpX(j) > x ? left(j) : right(j)
      if (e.via === 'thread' && followed) run(x, to)
      else plain.push({ x1: x, x2: to, y: y() })
      followed = false
      x = to
      cur = j
      turn(cur)
      open = true
    } else if (e.type === 'find') {
      const f = fragmentOf(e.fragment)
      if (!f || cur === null) continue
      touched.add(f.drawing)
      const to = x <= warpX(cur) ? right(cur) : left(cur)
      run(x, to)
      beads.push({ x: warpX(cur), y: y() })
      x = to
      turn(cur)
      open = true
    } else if (e.type === 'follow') {
      followed = true
    } else if (e.type === 'cut' && cur !== null) {
      // Drop the last turn and leave a gap with a snip mark: the cloth was cut here.
      if (open) coral.pop()
      snips.push({ x, y: y() - rowH })
      row++
      open = false
    }
  }

  if (open && cur !== null) {
    // The loose end hangs off the loom.
    coral.pop()
    coral.push(`M${x} ${y() - rowH}V${y() + 70}`)
  }

  return {
    coral: coral.join(' '),
    plain,
    beads,
    snips,
    row: rowH,
    height: FIRST_ROW + row * rowH + TAIL,
    touched,
  }
}
