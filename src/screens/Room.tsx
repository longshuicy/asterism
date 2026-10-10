import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { drawingOf, fragmentOf, fragmentsIn, isSign, letterOf } from '../content'
import type { Condition, Fragment, Kind, Sign } from '../content/types'
import { imageUrl } from '../lib/images'
import { useReducedMotion } from '../lib/useReducedMotion'
import { foundOrder, foundSet, hasRunDry, isUnlocked, useVisit, type Via } from '../store/visit'
import { LensView, type Aim, type LensState } from '../lens/LensView'
import { KIND_LABEL, KIND_RULE, Marker } from '../components/Marker'
import { Nav } from '../components/Nav'
import { DarkLift } from '../components/DarkLift'
import { FlyIn, toRect, type RectLike } from '../components/FlyIn'
import { Transit } from '../thread/Transit'
import './room.css'

export type RoomArrival = {
  via?: Via
  /** A clue to put the lens on as you arrive. */
  at?: string
  /** Arrived from a specimen window: lift the dark off the drawing. */
  lift?: boolean
  /** Arrived from a warp on the loom: widen the strip into the drawing. */
  fromRect?: RectLike
}

const IDLE_MS = 45_000
/** Ways to make the found list fit, gentlest first: the design's layout, then
 * each note moved up beside its object, then sentences cut to 3, 2, 1 lines. */
const FIT_LEVELS = [
  { compact: false, clamp: 'none' },
  { compact: true, clamp: 'none' },
  { compact: true, clamp: '3' },
  { compact: true, clamp: '2' },
  { compact: true, clamp: '1' },
]
const nudgedThisSession = new Set<Sign>()

export default function Room() {
  const { sign } = useParams()
  if (!isSign(sign)) return <Navigate to="/" replace />
  return <RoomIn sign={sign} />
}

function RoomIn({ sign }: { sign: Sign }) {
  const location = useLocation()
  const navigate = useNavigate()
  const arrival = (location.state ?? {}) as RoomArrival
  const reduced = useReducedMotion()

  const events = useVisit((s) => s.events)
  const { enter, find, follow } = useVisit.getState()

  const drawing = drawingOf(sign)
  const clues = useMemo(() => fragmentsIn(sign), [sign])
  const frameRef = useRef<HTMLDivElement>(null)

  const [aim, setAim] = useState<Aim | null>(null)
  const [lift, setLift] = useState<Fragment | null>(null)
  const [fly, setFly] = useState<RectLike | null>(null)
  const [transit, setTransit] = useState<{ from: Fragment; to: Fragment } | null>(null)
  const [looked, setLooked] = useState(false)
  const [nudge, setNudge] = useState<string | null>(null)

  // On a laptop the room fits the screen: if the found list overflows its share
  // of the height, it steps through FIT_LEVELS until it does.
  const listRef = useRef<HTMLOListElement>(null)
  const [clamp, setClamp] = useState(0)
  useEffect(() => {
    const el = listRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setClamp(0))
    ro.observe(el.parentElement!)
    return () => ro.disconnect()
  }, [])
  useLayoutEffect(() => setClamp(0), [sign, events.length])
  useLayoutEffect(() => {
    const el = listRef.current
    if (el && clamp < FIT_LEVELS.length - 1 && el.scrollHeight > el.clientHeight + 1) setClamp(clamp + 1)
  })

  // Arriving: log the crossing, then play whichever entrance brought us here.
  useEffect(() => {
    enter(sign, arrival.via ?? 'asterism')
    const at = arrival.at ? fragmentOf(arrival.at) : undefined
    if (at && at.drawing === sign) setAim({ u: at.x, v: at.y, key: Date.now() })
    if (arrival.lift && at) setLift(at)
    if (arrival.fromRect) setFly(arrival.fromRect)
    window.scrollTo(0, 0)
  }, [sign, location.key]) // eslint-disable-line react-hooks/exhaustive-deps

  const found = useMemo(() => foundSet(events), [events])
  const lensState: LensState = useMemo(() => {
    const followed = new Set(events.flatMap((e) => (e.type === 'follow' ? [e.from] : [])))
    return {
      found,
      followed,
      unlocked: (f) => isUnlocked(f, events),
      pairFound: (f) => !!f.pair && found.has(f.pair),
    }
  }, [events, found])
  const dry = hasRunDry(sign, events)

  const foundHere = useMemo(
    () => foundOrder(events).flatMap((id) => clues.filter((f) => f.id === id)),
    [events, clues],
  )

  // One idle nudge per drawing: after 45 s with no new find, an untaken thread in the notes pulses once.
  useEffect(() => {
    setNudge(null)
    if (reduced || nudgedThisSession.has(sign)) return
    const echo = foundHere.find((f) => f.kind === 'echo' && !lensState.followed.has(f.id))
    if (!echo) return
    const t = setTimeout(() => {
      nudgedThisSession.add(sign)
      setNudge(echo.id)
    }, IDLE_MS)
    return () => clearTimeout(t)
  }, [sign, foundHere.length, reduced]) // eslint-disable-line react-hooks/exhaustive-deps

  function takeThread(f: Fragment) {
    const to = f.echo && fragmentOf(f.echo.to)
    if (!to || transit) return
    follow(f.id, to.id)
    setTransit({ from: f, to })
  }

  function toLoom() {
    const r = frameRef.current?.getBoundingClientRect()
    navigate('/loom', { state: { fromSign: sign, fromRect: r ? toRect(r) : undefined } })
  }

  return (
    <motion.main
      className="room"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <Nav onCloth={toLoom} />

      <div className="room-body">
        <div className="stage">
          <LensView
            sign={sign}
            clues={clues}
            state={lensState}
            dim={dry}
            aim={aim}
            frameRef={frameRef}
            onReveal={(f) => find(f.id)}
            onFollow={takeThread}
            onLook={() => !looked && setLooked(true)}
          >
            {lift && <DarkLift key={lift.id} f={lift} reduced={reduced} onDone={() => setLift(null)} />}
            {transit && (
              <Transit
                key={transit.from.id}
                from={transit.from}
                to={transit.to}
                reduced={reduced}
                onSwap={() =>
                  navigate(`/d/${transit.to.drawing}`, {
                    state: { via: 'thread', at: transit.to.id } satisfies RoomArrival,
                  })
                }
                onDone={() => setTransit(null)}
              />
            )}
          </LensView>
          <p className={`look${looked || found.size ? ' gone' : ''}`}>Look closer.</p>
        </div>

        <aside className="notes" aria-label={`${drawing.name}: what you have found`}>
          <h1 className="sign-name">{drawing.name}</h1>
          <p className="couplet">
            {drawing.couplet[0]} {drawing.couplet[1]}
          </p>

          <ul className="legend" aria-label="Kinds of clue">
            {LEGEND.map((k) => (
              <li key={k} className={k === 'echo' ? 'echo' : undefined}>
                <span className="legend-term" tabIndex={0} aria-describedby={`rule-${k}`}>
                  <Marker kind={k} size={14} />
                  {KIND_LABEL[k]}
                </span>
                <span className="legend-rule" role="tooltip" id={`rule-${k}`}>
                  {KIND_RULE[k]}
                </span>
              </li>
            ))}
          </ul>

          {dry && <p className="dry">This one has said what it can.</p>}

          <h2 className="found-count">
            {foundHere.length} of {clues.length} found
            {foundHere.length === 0 && <span> · move the lens slowly over the drawing</span>}
          </h2>
          <ol
            className={`found${FIT_LEVELS[clamp].compact ? ' compact' : ''}`}
            ref={listRef}
            style={{ '--clamp': FIT_LEVELS[clamp].clamp } as React.CSSProperties}
          >
            {clues.map((f) =>
              found.has(f.id) ? (
                <FoundItem key={f.id} f={f} state={lensState} nudge={nudge === f.id} onFollow={takeThread} />
              ) : (
                <li key={f.id} className="unfound" aria-label={`${letterOf(f)}: not found yet`}>
                  <div className="found-obj">
                    <span className="found-letter">{letterOf(f)}.</span>
                  </div>
                  <span className="placeholder" aria-hidden="true" />
                  <span className="placeholder short" aria-hidden="true" />
                </li>
              ),
            )}
          </ol>
        </aside>
      </div>

      {fly && (
        <FlyIn
          from={fly}
          to={() => (frameRef.current ? toRect(frameRef.current.getBoundingClientRect()) : null)}
          src={imageUrl(sign, 1024)}
          reduced={reduced}
          onDone={() => setFly(null)}
        />
      )}
    </motion.main>
  )
}

const LEGEND: Kind[] = ['echo', 'fragment', 'sealed', 'inscription', 'counterpoint']

/** "Libra's lamp": a clue named by where it lives. */
function possessive(f: Fragment) {
  const name = drawingOf(f.drawing).name
  return `${name}'s ${f.object.replace(/^the\s+/i, '').toLowerCase()}`
}

function opensWhen(c: Condition | undefined): string {
  if (!c) return 'Opened'
  if ('visited' in c) return `Opens after a visit to ${drawingOf(c.visited).name}`
  if ('found' in c) {
    const t = fragmentOf(c.found)
    return t ? `Opens after finding ${possessive(t)}` : 'Opens after another find'
  }
  if ('followedAny' in c) return 'Opens after any thread is followed'
  return `Opens after ${c.foundCount} finds`
}

/** One found clue, as on the clue map: letter and object, the sentence, and what it does. */
type FoundProps = { f: Fragment; state: LensState; nudge: boolean; onFollow: (f: Fragment) => void }

function FoundItem({ f, state, nudge, onFollow }: FoundProps) {
  const target = f.echo ? fragmentOf(f.echo.to) : undefined
  const pair = f.pair ? fragmentOf(f.pair) : undefined
  return (
    <li>
      <div className="found-obj">
        <span className="found-letter">{letterOf(f)}.</span>
        <span>{f.object}</span>
      </div>
      <p className="found-sentence" title={f.sentence}>“{f.sentence}”</p>
      {f.kind === 'echo' && target ? (
        <a
          className={`found-note echo${state.followed.has(f.id) ? ' taken' : ''}${nudge ? ' nudge' : ''}`}
          href={`#${target.id}`}
          onClick={(e) => {
            e.preventDefault()
            onFollow(f)
          }}
        >
          <Marker kind="echo" size={11} />
          <span className="found-note-text">Thread to {possessive(target)}</span>
        </a>
      ) : (
        <p className="found-note" title={pair && state.pairFound(f) ? `“${pair.sentence}”` : undefined}>
          <Marker kind={f.kind} size={11} />
          {f.kind === 'inscription' && <span className="found-note-text">Lens reads the signs one by one</span>}
          {f.kind === 'sealed' && <span className="found-note-text">{opensWhen(f.sealed)}</span>}
          {f.kind === 'fragment' && <span className="found-note-text">Stays here</span>}
          {f.kind === 'counterpoint' && pair && (
            <span className="found-note-text">
              Answers {pair.object.toLowerCase()} in {drawingOf(pair.drawing).name}
              {state.pairFound(f) && <em>: “{pair.sentence}”</em>}
            </span>
          )}
        </p>
      )}
    </li>
  )
}
