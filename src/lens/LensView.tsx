import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { letterOf, objectPhrase } from '../content'
import type { Fragment, Sign } from '../content/types'
import { imageUrl, useImage } from '../lib/images'
import { useReducedMotion } from '../lib/useReducedMotion'
import { Marker } from '../components/Marker'
import { Threads } from '../thread/Threads'
import { drawLens } from './drawLens'
import { RevealBody } from './Reveal'
import './lens.css'

const DWELL_MS = 350
const LINGER_MS = 900

export type LensState = {
  found: Set<string>
  followed: Set<string> // ids of echoes that have been taken
  unlocked: (f: Fragment) => boolean
  pairFound: (f: Fragment) => boolean
}

/** Puts the lens somewhere from outside: an arrival, a keyboard focus, a nudge. */
export type Aim = { u: number; v: number; key: number }

type Props = {
  sign: Sign
  clues: Fragment[]
  state: LensState
  dim?: boolean
  showThreads?: boolean
  showMarkers?: boolean
  aim?: Aim | null
  frameRef?: RefObject<HTMLDivElement | null>
  onReveal?: (f: Fragment) => void
  onFollow?: (f: Fragment) => void
  onLook?: () => void
  children?: ReactNode
}

function hitTest(clues: Fragment[], u: number, v: number): Fragment | null {
  let best: Fragment | null = null
  let bestDist = Infinity
  for (const f of clues) {
    const dist = Math.hypot(u - f.x, v - f.y)
    if (dist <= f.d / 2 && dist < bestDist) {
      best = f
      bestDist = dist
    }
  }
  return best
}

/**
 * A drawing seen through the lens. The 2048 px source is magnified 2.6× onto a
 * canvas under the cursor (or above the finger); resting on a clue for 350 ms
 * reveals it. Every clue is also a hidden button you can Tab to.
 */
export function LensView({
  sign,
  clues,
  state,
  dim = false,
  showThreads = true,
  showMarkers = true,
  aim = null,
  frameRef,
  onReveal,
  onFollow,
  onLook,
  children,
}: Props) {
  const ownRef = useRef<HTMLDivElement>(null)
  const frame = frameRef ?? ownRef
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reduced = useReducedMotion()

  const [width, setWidth] = useState(0)
  const [pos, setPos] = useState<{ u: number; v: number } | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overBox, setOverBox] = useState(false)
  const [read, setRead] = useState(0)

  const small = useImage(imageUrl(sign, 1024))
  const large = useImage(imageUrl(sign, 2048))
  const lensImg = large ?? small

  const hover = useMemo(() => (pos ? hitTest(clues, pos.u, pos.v) : null), [clues, pos])
  const active = clues.find((f) => f.id === activeId) ?? null

  // A new drawing starts with a clean lens.
  useEffect(() => {
    setActiveId(null)
    setRead(0)
  }, [sign])

  useLayoutEffect(() => {
    const el = frame.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [frame])

  useEffect(() => {
    if (aim) setPos({ u: aim.u, v: aim.v })
  }, [aim?.key]) // eslint-disable-line react-hooks/exhaustive-deps

  // Dwell on a clue to reveal it; drift off and it lingers briefly, so its link can be reached.
  useEffect(() => {
    if (hover) {
      if (hover.id === activeId) return
      const t = setTimeout(() => {
        setActiveId(hover.id)
        setRead(0)
      }, DWELL_MS)
      return () => clearTimeout(t)
    }
    if (!activeId || overBox) return
    const t = setTimeout(() => setActiveId(null), LINGER_MS)
    return () => clearTimeout(t)
  }, [hover, activeId, overBox])

  // An inscription is read word by word as the lens crosses it.
  useEffect(() => {
    if (!pos || !active || active.kind !== 'inscription' || !active.signs?.length) return
    const n = active.signs.length
    const t = (pos.u - (active.x - active.d / 2)) / active.d
    const word = Math.max(1, Math.min(n, Math.floor(t * n) + 1))
    setRead((r) => Math.max(r, word))
  }, [pos, active])

  const locked = (f: Fragment) => f.kind === 'sealed' && !state.unlocked(f)

  useEffect(() => {
    if (active && !locked(active)) onReveal?.(active)
  }, [activeId]) // eslint-disable-line react-hooks/exhaustive-deps

  // When the lens finds a clue it settles onto it, and a ring sweeps round the
  // clue for the length of the dwell. An inscription is read by crossing it, so
  // the lens stays with the pointer there.
  const dwellStart = useRef(0)
  useEffect(() => {
    dwellStart.current = performance.now()
  }, [hover?.id])

  const scene = useRef({ pos, hover, width, lensImg, dim, reduced, locked: false, found: false, letter: '' })
  scene.current = {
    pos,
    hover,
    width,
    lensImg,
    dim,
    reduced,
    locked: !!hover && locked(hover),
    found: !!hover && state.found.has(hover.id),
    letter: hover ? letterOf(hover) : '',
  }
  const drawn = useRef<{ u: number; v: number } | null>(null)
  const raf = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !width) return
    const dpr = window.devicePixelRatio || 1
    if (canvas.width !== Math.round(width * dpr)) {
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(width * dpr)
    }
    const ctx = canvas.getContext('2d')!

    const paint = (now: number) => {
      const s = scene.current
      const snap = s.hover && s.hover.kind !== 'inscription'
      const target = snap ? { u: s.hover!.x, v: s.hover!.y } : s.pos
      const d = drawn.current
      if (!target) drawn.current = null
      else if (!d || s.reduced) drawn.current = { ...target }
      else drawn.current = { u: d.u + (target.u - d.u) * 0.2, v: d.v + (target.v - d.v) * 0.2 }

      const progress = !s.hover ? 0 : s.found || s.reduced ? 1 : Math.min(1, (now - dwellStart.current) / DWELL_MS)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      drawLens({
        ctx,
        width: s.width,
        pos: drawn.current,
        img: s.lensImg,
        clouded: s.locked,
        dim: s.dim,
        engaged: !!s.hover,
        thread: '#FF7A6B',
        ring: s.hover ? { u: s.hover.x, v: s.hover.y, d: s.hover.d, progress } : null,
        letter: s.found ? s.letter : null,
      })

      const moving = target && drawn.current && Math.hypot(target.u - drawn.current.u, target.v - drawn.current.v) > 0.0005
      raf.current = moving || (s.hover && progress < 1) ? requestAnimationFrame(paint) : 0
    }

    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(paint)
    return () => cancelAnimationFrame(raf.current)
  }, [pos, hover, width, lensImg, dim, reduced, state]) // eslint-disable-line react-hooks/exhaustive-deps

  function onPointer(e: React.PointerEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    const lift = e.pointerType === 'touch' ? Math.min(90, r.width * 0.16) : 0
    const u = (e.clientX - r.left) / r.width
    const v = (e.clientY - r.top - lift) / r.height
    setPos({ u: Math.min(1, Math.max(0, u)), v: Math.min(1, Math.max(0, v)) })
    onLook?.()
  }

  const showReveal = active && (!locked(active) || hover?.id === active.id || overBox)

  return (
    <div
      ref={frame}
      className="frame lensing"
      onPointerMove={onPointer}
      onPointerDown={onPointer}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setPos(null)}
    >
      <img
        className="drawing"
        src={imageUrl(sign, 1024)}
        srcSet={`${imageUrl(sign, 1024)} 1024w, ${imageUrl(sign, 2048)} 2048w`}
        sizes="(max-width: 860px) 100vw, 80vh"
        alt=""
        draggable={false}
      />

      {showMarkers &&
        clues
          .filter((f) => state.found.has(f.id))
          .map((f) => (
            <span key={f.id} className="marker-at" style={{ left: `${f.x * 100}%`, top: `${f.y * 100}%` }}>
              <Marker kind={f.kind} size={18} />
              <span className="marker-letter">{letterOf(f)}</span>
            </span>
          ))}

      {showThreads && (
        <Threads
          clues={clues}
          found={state.found}
          followed={state.followed}
          pairFound={state.pairFound}
          bright={dim}
          reducedMotion={reduced}
          width={width}
        />
      )}

      <canvas ref={canvasRef} aria-hidden="true" />

      {clues.map((f) => (
        <button
          key={f.id}
          type="button"
          className="hotspot"
          style={{ left: `${f.x * 100}%`, top: `${f.y * 100}%`, width: `${f.d * 100}%`, height: `${f.d * 100}%` }}
          aria-label={`Look closer at ${objectPhrase(f)}`}
          onFocus={() => setPos({ u: f.x, v: f.y })}
          onBlur={() => setPos(null)}
          onClick={() => {
            setPos({ u: f.x, v: f.y })
            setActiveId(f.id)
            setRead(f.signs?.length ?? 0)
          }}
        />
      ))}

      <AnimatePresence>
        {showReveal && active && (
          <motion.div
            key={active.id}
            className={`reveal ${active.text.align}`}
            style={
              active.text.align === 'left'
                ? { left: `${active.text.x * 100}%`, top: `${active.text.y * 100}%` }
                : { right: `${(1 - active.text.x) * 100}%`, top: `${active.text.y * 100}%` }
            }
            role="status"
            initial={{ opacity: 0, y: reduced ? 0 : 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            onPointerEnter={() => setOverBox(true)}
            onPointerLeave={() => setOverBox(false)}
          >
            <RevealBody
              f={active}
              locked={locked(active)}
              pairFound={state.pairFound(active)}
              read={read}
              onFollow={onFollow}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {children}
    </div>
  )
}
