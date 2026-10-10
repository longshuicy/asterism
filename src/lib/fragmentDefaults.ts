import type { Fragment, Kind, Sign } from '../content/types'

const r3 = (n: number) => Math.round(n * 1000) / 1000

/** A sentence box beside the clue, on the side with more room. */
export function defaultText(x: number, y: number, d: number): Fragment['text'] {
  const align = x < 0.5 ? 'left' : 'right'
  const tx = align === 'left' ? Math.min(0.9, x + d / 2 + 0.02) : Math.max(0.1, x - d / 2 - 0.02)
  const ty = y > 0.8 ? y - d / 2 - 0.1 : Math.max(0.03, y - 0.03)
  return { x: r3(tx), y: r3(ty), align }
}

export function newFragment(id: string, drawing: Sign, x: number, y: number): Fragment {
  const d = 0.1
  return { id, drawing, kind: 'fragment', object: '', sentence: '', x: r3(x), y: r3(y), d, text: defaultText(x, y, d) }
}

const KIND_FIELDS: Record<Kind, (keyof Fragment)[]> = {
  fragment: [],
  echo: ['echo'],
  sealed: ['sealed'],
  inscription: ['signs'],
  counterpoint: ['pair'],
}

/** Drops fields that don't belong to the clue's kind and rounds positions, in a stable key order. */
export function normalize(f: Fragment): Fragment {
  const out: Fragment = {
    id: f.id.trim(),
    drawing: f.drawing,
    kind: f.kind,
    object: f.object.trim(),
    sentence: f.sentence.trim(),
    x: r3(f.x),
    y: r3(f.y),
    d: r3(f.d),
    text: { x: r3(f.text.x), y: r3(f.text.y), align: f.text.align },
  }
  for (const k of KIND_FIELDS[f.kind]) {
    if (f[k] !== undefined) (out as Record<string, unknown>)[k] = f[k]
  }
  return out
}
