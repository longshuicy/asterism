import { useRef } from 'react'
import type { Fragment } from '../content/types'
import { DrawPath } from '../components/DrawPath'
import { threadPath } from './edge'
import './threads.css'

type Props = {
  clues: Fragment[]
  found: Set<string>
  followed: Set<string>
  pairFound: (f: Fragment) => boolean
  bright: boolean
  reducedMotion: boolean
  /** Frame width in px; strokes are sized in the 0–100 viewBox. */
  width: number
}

/**
 * The coral threads that leave a drawing: one for every echo found here, and a
 * faint one for each counterpoint still waiting for its pair. Their phrases are
 * in the reveal box and the notes, not on the drawing.
 */
export function Threads({ clues, found, followed, pairFound, bright, reducedMotion, width }: Props) {
  // Threads drawn on first render appear as they are; ones found later draw themselves.
  const initial = useRef<Set<string> | null>(null)
  initial.current ??= new Set(clues.filter((f) => found.has(f.id)).map((f) => f.id))

  const unit = width ? 100 / width : 0.2 // one CSS px in viewBox units
  const echoes = clues.filter((f) => f.kind === 'echo' && f.echo && found.has(f.id))
  const loose = clues.filter((f) => f.kind === 'counterpoint' && found.has(f.id) && !pairFound(f))

  return (
    <svg className="threads" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      {loose.map((f) => (
        <path key={f.id} d={threadPath(f)} className="thread loose" strokeWidth={1.4 * unit} />
      ))}
      {echoes.map((f) => (
        <g key={f.id}>
          <path d={threadPath(f)} className="thread under" strokeWidth={5 * unit} />
          <DrawPath
            d={threadPath(f)}
            className={followed.has(f.id) || bright ? 'thread' : 'thread untaken'}
            strokeWidth={1.8 * unit}
            draw={!initial.current!.has(f.id) && !reducedMotion}
          />
          <circle cx={f.x * 100} cy={f.y * 100} r={3.5 * unit} className="knot" />
        </g>
      ))}
    </svg>
  )
}
