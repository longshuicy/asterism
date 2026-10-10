import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { drawings } from '../content'
import type { RoomArrival } from '../screens/Room'

type Props = {
  /** Show the "Asterism" home link (everywhere but the opening itself). */
  home?: boolean
  /** Overrides "The Loom" link, e.g. so the room can hand its rect to the loom. */
  onCloth?: () => void
}

export function Nav({ home = true, onCloth }: Props) {
  return (
    <nav className="topnav" aria-label="Asterism">
      {home && (
        <Link className="home-link" to="/">
          Asterism
        </Link>
      )}
      <div className="links">
        <DrawingsMenu />
        {onCloth ? (
          <button type="button" className="navlink" onClick={onCloth}>
            The Loom
          </button>
        ) : (
          <Link className="navlink" to="/loom">
            The Loom
          </Link>
        )}
      </div>
    </nav>
  )
}

/** Jump straight to any of the twelve drawings. */
function DrawingsMenu() {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { sign } = useParams()

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="menu" ref={box}>
      <button
        type="button"
        className="navlink"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
      >
        Drawings
        <svg aria-hidden="true" width="10" height="10" viewBox="0 0 10 10" className="chevron">
          <path d="M1.5 3.5L5 7L8.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
        </svg>
      </button>
      {open && (
        <ul className="menu-list">
          {drawings.map((d) => (
            <li key={d.sign}>
              <a
                href={`${import.meta.env.BASE_URL}d/${d.sign}`}
                aria-current={d.sign === sign ? 'page' : undefined}
                onClick={(e) => {
                  e.preventDefault()
                  setOpen(false)
                  const state: RoomArrival = { via: 'asterism' }
                  navigate(`/d/${d.sign}`, { state })
                }}
              >
                {d.name}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
