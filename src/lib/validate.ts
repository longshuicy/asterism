import type { Drawing, Fragment } from '../content/types'

/** Area of the lens-shaped intersection of two circles. */
function overlapArea(r1: number, r2: number, dist: number): number {
  if (dist >= r1 + r2) return 0
  if (dist <= Math.abs(r1 - r2)) return Math.PI * Math.min(r1, r2) ** 2
  const a = r1 * r1 * Math.acos((dist * dist + r1 * r1 - r2 * r2) / (2 * dist * r1))
  const b = r2 * r2 * Math.acos((dist * dist + r2 * r2 - r1 * r1) / (2 * dist * r2))
  const c = 0.5 * Math.sqrt((-dist + r1 + r2) * (dist + r1 - r2) * (dist - r1 + r2) * (dist + r1 + r2))
  return a + b - c
}

/**
 * Content rules from the implementation doc. Used by the /dev editor before saving,
 * by the dev-server endpoint, and by `npm run validate`.
 */
export function validate(fragments: Fragment[], drawings: Drawing[]): string[] {
  const problems: string[] = []
  const signs = new Set(drawings.map((d) => d.sign))
  const byId = new Map<string, Fragment>()

  for (const f of fragments) {
    if (!f.id) problems.push('A clue has no id.')
    else if (byId.has(f.id)) problems.push(`Two clues share the id “${f.id}”.`)
    byId.set(f.id, f)
  }

  for (const f of fragments) {
    const at = `“${f.id}”`
    if (!signs.has(f.drawing)) problems.push(`${at} belongs to an unknown drawing “${f.drawing}”.`)
    if (!f.object?.trim()) problems.push(`${at} has no object name.`)
    if (!f.sentence?.trim()) problems.push(`${at} has no sentence.`)
    for (const k of ['x', 'y', 'd'] as const) {
      if (!(f[k] >= 0 && f[k] <= 1)) problems.push(`${at} has ${k} outside 0–1.`)
    }

    if (f.kind === 'echo') {
      const target = f.echo && byId.get(f.echo.to)
      if (!f.echo?.to) problems.push(`${at} is an echo with no target.`)
      else if (!target) problems.push(`${at} echoes to “${f.echo.to}”, which doesn't exist.`)
      else if (target.drawing === f.drawing) problems.push(`${at} echoes to a clue in its own drawing.`)
      if (!f.echo?.label?.trim()) problems.push(`${at} is an echo with no thread phrase.`)
    }

    if (f.kind === 'counterpoint') {
      const pair = f.pair && byId.get(f.pair)
      if (!f.pair) problems.push(`${at} is a counterpoint without a pair.`)
      else if (!pair) problems.push(`${at} is paired with “${f.pair}”, which doesn't exist.`)
      else if (pair.drawing === f.drawing) problems.push(`${at} is paired with a clue in its own drawing.`)
      else if (pair.pair !== f.id) problems.push(`${at} and “${f.pair}” should name each other as pairs.`)
    }

    if (f.kind === 'sealed') {
      const c = f.sealed
      if (!c) problems.push(`${at} is sealed with no condition.`)
      else if ('visited' in c && c.visited === f.drawing)
        problems.push(`${at} waits for a visit to its own drawing.`)
      else if ('found' in c) {
        const target = byId.get(c.found)
        if (!target) problems.push(`${at} waits for “${c.found}”, which doesn't exist.`)
        else if (target.drawing === f.drawing) problems.push(`${at} waits for a clue in its own drawing.`)
      }
    }

    if (f.kind === 'inscription' && !f.signs?.length) problems.push(`${at} is an inscription with no words.`)
  }

  // Two clues in one drawing overlapping by more than half of the smaller one.
  for (let i = 0; i < fragments.length; i++) {
    for (let j = i + 1; j < fragments.length; j++) {
      const a = fragments[i]
      const b = fragments[j]
      if (a.drawing !== b.drawing) continue
      const r1 = a.d / 2
      const r2 = b.d / 2
      const overlap = overlapArea(r1, r2, Math.hypot(a.x - b.x, a.y - b.y))
      if (overlap > 0.5 * Math.PI * Math.min(r1, r2) ** 2)
        problems.push(`“${a.id}” and “${b.id}” overlap by more than half.`)
    }
  }

  return problems
}
