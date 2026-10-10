import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { drawings, fragmentsIn, objectPhrase } from '../content'
import type { Drawing, Fragment } from '../content/types'
import { imageUrl } from '../lib/images'
import { useVisit } from '../store/visit'
import { printLayout } from '../story/layout'
import { PrintSVG } from '../story/PrintSVG'
import { Nav } from '../components/Nav'
import type { RoomArrival } from './Room'
import './asterism.css'

const PER_DRAWING = 3

/** The specimen windows shown for a drawing: its first few open clues. */
const specimensOf = (d: Drawing) => fragmentsIn(d.sign).filter((f) => f.kind !== 'sealed').slice(0, PER_DRAWING)

export default function Asterism() {
  const navigate = useNavigate()
  const stories = useVisit((s) => s.stories)
  const last = stories[stories.length - 1]
  const lastLayout = useMemo(() => (last ? printLayout(last) : null), [last])

  function pick(f: Fragment) {
    const state: RoomArrival = { via: 'asterism', at: f.id, lift: true }
    navigate(`/d/${f.drawing}`, { state })
  }

  return (
    <motion.main
      className="asterism"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <Nav home={false} />

      <div className="sky">
        <div className="field">
          {drawings.map((d) => (
            <div
              key={d.sign}
              className="cell"
              style={{ '--col': d.cell[0] + 1, '--row': d.cell[1] + 1 } as React.CSSProperties}
            >
              <img className="ghost" src={imageUrl(d.sign, 256)} alt="" />
              {specimensOf(d).map((f) => (
                <Specimen key={f.id} f={f} onPick={pick} />
              ))}
            </div>
          ))}

          <div className="title-block">
            <h1>Asterism</h1>
            <p className="tagline">All that we cannot say takes shape in the dark.</p>
            <p className="how">Each of these belongs to one of twelve drawings. Choose one to find out which.</p>
            <p className="credit">
              All twelve drawings are original works, drawn by hand in Procreate.{' '}
              <a href="https://www.instagram.com/chenniferwang" target="_blank" rel="noopener noreferrer">
                @chenniferwang
              </a>
            </p>
          </div>

          {lastLayout && (
            <Link className="last-story" to="/story">
              <PrintSVG className="mini-print" layout={lastLayout} detail="mini" imageSize={256} />
              Your last untold story
            </Link>
          )}
        </div>
      </div>
    </motion.main>
  )
}

/**
 * A window punched in the dark: the drawing shows through at full strength,
 * exactly where the clue sits in its faint ghost.
 */
function Specimen({ f, onPick }: { f: Fragment; onPick: (f: Fragment) => void }) {
  const label = objectPhrase(f)
  return (
    <a
      href={`${import.meta.env.BASE_URL}d/${f.drawing}`}
      className={`specimen${f.x > 0.6 ? ' label-left' : ''}`}
      style={{ left: `${(f.x - f.d / 2) * 100}%`, top: `${(f.y - f.d / 2) * 100}%`, width: `${f.d * 100}%` }}
      aria-label={label}
      onClick={(e) => {
        e.preventDefault()
        onPick(f)
      }}
    >
      <span className="window">
        <img
          src={imageUrl(f.drawing, 1024)}
          alt=""
          loading="lazy"
          style={{
            width: `${100 / f.d}%`,
            left: `${(-(f.x - f.d / 2) / f.d) * 100}%`,
            top: `${(-(f.y - f.d / 2) / f.d) * 100}%`,
          }}
        />
      </span>
      <span className="specimen-label" aria-hidden="true">
        {label}
      </span>
    </a>
  )
}
