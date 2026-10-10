import type { Fragment } from '../content/types'

export type Exit = { x: number; y: number; side: 'left' | 'right' }

/**
 * Where a clue's thread leaves the drawing: through the nearer side, a little
 * below or above the clue so it hangs like real thread. Units are 0–1.
 */
export function exitFor(f: Pick<Fragment, 'x' | 'y'>): Exit {
  const side = f.x < 0.5 ? 'left' : 'right'
  const y = Math.min(0.9, Math.max(0.1, f.y + (f.y < 0.5 ? 0.16 : -0.16)))
  return { x: side === 'left' ? -0.02 : 1.02, y, side }
}

/** SVG path in a 0–100 viewBox from the clue to its exit. */
export function threadPath(f: Pick<Fragment, 'x' | 'y'>, e: Exit = exitFor(f)): string {
  const x1 = f.x * 100
  const y1 = f.y * 100
  const x2 = e.x * 100
  const y2 = e.y * 100
  const cx = (x1 + x2) / 2
  const cy = Math.max(y1, y2) + 6
  return `M${x1} ${y1} Q${cx} ${cy} ${x2} ${y2}`
}
