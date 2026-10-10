import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { drawings } from '../content'
import type { Sign } from '../content/types'
import { imageUrl } from '../lib/images'
import { useReducedMotion } from '../lib/useReducedMotion'
import { canCut, CUT_AT, useVisit, wovenCount } from '../store/visit'
import { LOOM_W, ROW, STRIP, WARP_TOP, warpX, weave } from '../loom/weave'
import { Nav } from '../components/Nav'
import { FlyIn, toRect, type RectLike } from '../components/FlyIn'
import type { RoomArrival } from './Room'
import './loom.css'

type LoomArrival = { fromSign?: Sign; fromRect?: RectLike }

const warpEl = (sign: Sign) => document.querySelector(`[data-warp="${sign}"]`)

export default function Loom() {
  const location = useLocation()
  const navigate = useNavigate()
  const reduced = useReducedMotion()
  const arrival = (location.state ?? {}) as LoomArrival

  const events = useVisit((s) => s.events)
  const stories = useVisit((s) => s.stories)
  const cut = useVisit((s) => s.cut)

  // On a laptop the loom fills the space between the nav and the bar at full
  // width, and a long weave packs its rows closer together rather than scrolling.
  const area = useRef<HTMLDivElement>(null)
  const [fitH, setFitH] = useState(0)
  useLayoutEffect(() => {
    const el = area.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect
      setFitH(width >= 900 ? Math.floor((LOOM_W * height) / width) : 0)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const w = useMemo(() => weave(events, fitH), [events, fitH])
  const H = fitH || Math.max(900, w.height)
  // Thread and beads thin out as the rows pack closer.
  const k = Math.min(1, w.row / ROW)
  const cuttable = canCut(events)
  const woven = wovenCount(events)

  const [fly, setFly] = useState<LoomArrival | null>(arrival.fromSign && arrival.fromRect ? arrival : null)

  function openWarp(sign: Sign) {
    const el = warpEl(sign)
    const state: RoomArrival = { via: 'loom', fromRect: el ? toRect(el.getBoundingClientRect()) : undefined }
    navigate(`/d/${sign}`, { state })
  }

  function cutCloth() {
    if (cut()) navigate('/story', { state: { justCut: true } })
  }

  const message = !events.length
    ? 'Nothing woven yet. Choose a drawing on the Asterism.'
    : cuttable
      ? 'Your cloth is long enough to cut.'
      : `${woven} of ${CUT_AT} drawings woven. Weave in ${CUT_AT - woven} more before you cut.`

  return (
    <main className="loom">
      <Nav />
      <h1 className="sr-only">The Loom</h1>

      <div
        className={`loom-scroll${fitH ? ' fit' : ''}`}
        ref={area}
        style={{ '--k': k } as React.CSSProperties}
      >
        <motion.svg
          className="loom-svg"
          viewBox={`0 0 ${LOOM_W} ${H}`}
          preserveAspectRatio="xMidYMin meet"
          role="group"
          aria-label="The loom: twelve strips cut from the drawings, with your path woven across them"
          initial={{ opacity: fly ? 0 : 1 }}
          animate={{ opacity: 1 }}
          transition={{ delay: fly ? 0.25 : 0, duration: fly ? 0.75 : 0.4 }}
        >
          {drawings.map((d, i) => {
            const on = w.touched.has(d.sign)
            return (
              <a
                key={d.sign}
                href={`${import.meta.env.BASE_URL}d/${d.sign}`}
                className={`warp${on ? ' on' : ''}`}
                aria-label={`${d.name}${on ? '' : ', not yet visited'}`}
                onClick={(e) => {
                  e.preventDefault()
                  openWarp(d.sign)
                }}
              >
                <image
                  data-warp={d.sign}
                  href={imageUrl(d.sign, 1024)}
                  x={warpX(i) - STRIP / 2}
                  y={WARP_TOP}
                  width={STRIP}
                  height={H - WARP_TOP}
                  preserveAspectRatio="xMidYMid slice"
                  opacity={on ? 1 : 0.22}
                />
                <text x={warpX(i)} y="52" textAnchor="middle" className="warp-name">
                  {d.name}
                </text>
              </a>
            )
          })}

          {w.plain.map((p, i) => (
            <path key={i} d={`M${p.x1} ${p.y}H${p.x2}`} className="weft-plain" />
          ))}
          <path d={w.coral} className="weft-under" />
          <path d={w.coral} className="weft" />
          {w.beads.map((b, i) => (
            <circle key={i} cx={b.x} cy={b.y} r={Math.max(2, 6 * k)} className="bead" />
          ))}
          {w.snips.map((s, i) => (
            <path
              key={i}
              d={`M${s.x - 6} ${s.y + 4}L${s.x + 6} ${s.y + 16}M${s.x + 6} ${s.y + 4}L${s.x - 6} ${s.y + 16}`}
              className="snip"
            />
          ))}
        </motion.svg>
      </div>

      <div className="loom-bar">
        <p>{message}</p>
        <span className="loom-actions">
          {stories.length > 0 && (
            <Link className="navlink" to="/story">
              Your last Untold Story
            </Link>
          )}
          <button type="button" className="pill" onClick={cutCloth} disabled={!cuttable}>
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="6" cy="6" r="3" />
            <circle cx="6" cy="18" r="3" />
            <path d="M8.6 7.6L20 18M8.6 16.4L20 6" />
          </svg>
          Cut the cloth
          </button>
        </span>
      </div>

      {fly?.fromSign && fly.fromRect && (
        <FlyIn
          from={fly.fromRect}
          to={() => {
            const el = warpEl(fly.fromSign!)
            return el ? toRect(el.getBoundingClientRect()) : null
          }}
          src={imageUrl(fly.fromSign, 1024)}
          reduced={reduced}
          onDone={() => setFly(null)}
        />
      )}
    </main>
  )
}
