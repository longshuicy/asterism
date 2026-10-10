import type { Condition, Fragment } from '../content/types'
import { drawingOf, fragmentOf } from '../content'

export function waitingLine(c: Condition | undefined): string {
  if (!c) return 'Not yet.'
  if ('visited' in c) return "Not yet. Somewhere you haven't been holds the other end of this."
  if ('found' in c) return "Not yet. Something you haven't found holds the other end of this."
  if ('followedAny' in c) return 'Not yet. Someone elsewhere is still holding the other end.'
  return 'Not yet. Look closer elsewhere first.'
}

type Props = {
  f: Fragment
  locked: boolean
  pairFound: boolean
  /** Inscription: how many of its words the lens has read so far. */
  read: number
  onFollow?: (f: Fragment) => void
}

/** What the lens says about a clue, by kind (see "Five kinds of clue"). */
export function RevealBody({ f, locked, pairFound, read, onFollow }: Props) {
  if (f.kind === 'sealed' && locked) {
    return <p className="reveal-waiting">{waitingLine(f.sealed)}</p>
  }

  if (f.kind === 'inscription' && f.signs?.length) {
    const words = f.signs.slice(0, Math.max(1, read))
    const done = read >= f.signs.length
    return (
      <>
        <p className="reveal-words">
          {words.map((w, i) => (
            <span key={i} className={i === words.length - 1 ? 'current' : undefined}>
              {w}
            </span>
          ))}
        </p>
        {done && <p className="reveal-sentence">“{f.sentence}”</p>}
      </>
    )
  }

  if (f.kind === 'counterpoint') {
    const pair = f.pair ? fragmentOf(f.pair) : undefined
    return (
      <>
        <p className="reveal-sentence">“{f.sentence}”</p>
        {pair && pairFound ? (
          <>
            <div className="reveal-rule" />
            <p className="reveal-from">from {drawingOf(pair.drawing).name}</p>
            <p className="reveal-sentence">“{pair.sentence}”</p>
          </>
        ) : (
          <div className="reveal-rule half" />
        )}
      </>
    )
  }

  return (
    <>
      <p className="reveal-sentence">“{f.sentence}”</p>
      {f.kind === 'echo' && f.echo && (
        <a
          className="reveal-phrase"
          href={`#${f.echo.to}`}
          onClick={(e) => {
            e.preventDefault()
            onFollow?.(f)
          }}
        >
          {f.echo.label}
        </a>
      )}
    </>
  )
}
