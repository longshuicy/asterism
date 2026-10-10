import { useLayoutEffect, useRef } from 'react'
import { animate, motion, useMotionTemplate, useMotionValue } from 'motion/react'
import type { Fragment } from '../content/types'

type Props = { f: Fragment; reduced: boolean; onDone: () => void }

/**
 * Arriving from a specimen window on the Asterism: the window grows into the
 * lens and the dark lifts off the rest of the drawing. About 1.2 s.
 */
export function DarkLift({ f, reduced, onDone }: Props) {
  const el = useRef<HTMLDivElement>(null)
  const r = useMotionValue(0)
  const opacity = useMotionValue(1)
  const mask = useMotionTemplate`radial-gradient(circle at ${f.x * 100}% ${f.y * 100}%, transparent ${r}px, #000 calc(${r}px + 1px))`

  useLayoutEffect(() => {
    const w = el.current?.offsetWidth ?? 600
    r.set((f.d / 2) * w)
    const c = reduced
      ? animate(opacity, 0, { duration: 0.6 })
      : animate(r, w * 1.6, { duration: 1.2, ease: [0.45, 0, 0.2, 1] })
    c.finished.then(onDone)
    return () => c.stop()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.div
      ref={el}
      className="dark-lift"
      aria-hidden="true"
      style={{ maskImage: mask, WebkitMaskImage: mask, opacity }}
    />
  )
}
