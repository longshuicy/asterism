import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { drawings } from '../content'
import type { Sign } from '../content/types'
import { imageUrl } from '../lib/images'
import { CLOTH_H, PRINT_H, type PrintLayout } from './layout'

type Phase = 'snip' | 'letgo' | 'turn'
const TIMES: Record<Phase, number> = { snip: 0, letgo: 700, turn: 1300 }
const END = 2400

const PITCH = 100 / drawings.length
const STRIP_W = PITCH * 0.7
const STRIP_H = 84
const STRIP_TOP = 6

/**
 * Cut the cloth, steps 1–3: snip the thread where it leaves the loom, let the
 * unvisited drawings go, and turn the visited ones on their side, stacked in
 * visit order. Steps 4–5 (re-thread, settle) are the print drawing itself in.
 */
export function CutSequence({ layout, onDone }: { layout: PrintLayout; onDone: () => void }) {
  const [phase, setPhase] = useState<Phase>('snip')
  const order: Sign[] = layout.bands.map((b) => b.sign)
  const n = Math.max(1, order.length)

  useEffect(() => {
    const ts = [
      setTimeout(() => setPhase('letgo'), TIMES.letgo),
      setTimeout(() => setPhase('turn'), TIMES.turn),
      setTimeout(onDone, END),
    ]
    return () => ts.forEach(clearTimeout)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // A zigzag through the visited strips, as on the loom.
  const zig = order
    .map((s, k) => {
      const i = drawings.findIndex((d) => d.sign === s)
      const x = i * PITCH + PITCH / 2
      const y = STRIP_TOP + 6 + (k / n) * (STRIP_H - 12)
      return `${k ? 'L' : 'M'}${(x + (k % 2 ? 4 : -4)).toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')
  const lastY = STRIP_TOP + STRIP_H - 4

  return (
    <div className="cut-stage" aria-hidden="true">
      {drawings.map((d, i) => {
        const k = order.indexOf(d.sign)
        const visited = k >= 0
        const left = i * PITCH + (PITCH - STRIP_W) / 2
        const bandCentre = visited ? ((layout.bands[k].top + layout.bands[k].height / 2) / PRINT_H) * 100 : 50
        const turned = phase === 'turn' && visited
        return (
          <motion.div
            key={d.sign}
            className="cut-strip"
            style={{ width: `${STRIP_W}%`, height: `${STRIP_H}%`, backgroundImage: `url(${imageUrl(d.sign, 1024)})` }}
            initial={{ left: `${left}%`, top: `${STRIP_TOP}%`, rotate: 0, opacity: visited ? 1 : 0.22, scale: 1 }}
            animate={
              turned
                ? {
                    left: `${50 - STRIP_W / 2}%`,
                    top: `${bandCentre - STRIP_H / 2}%`,
                    rotate: 90,
                    scale: CLOTH_H / PRINT_H,
                    opacity: 1,
                  }
                : { opacity: !visited && phase !== 'snip' ? 0 : visited ? 1 : 0.22 }
            }
            transition={{ duration: turned ? 1 : 0.5, ease: [0.5, 0, 0.2, 1], delay: turned ? k * 0.04 : 0 }}
          />
        )
      })}

      <motion.svg
        className="cut-thread"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        animate={{ opacity: phase === 'turn' ? 0 : 1 }}
        transition={{ duration: 0.4 }}
      >
        <path d={zig} />
        <motion.path
          d={`M50 ${lastY - 4} V100`}
          animate={{ opacity: phase === 'snip' ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        />
      </motion.svg>
      <motion.svg
        className="cut-snip"
        viewBox="0 0 24 24"
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: phase === 'turn' ? 0 : 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        style={{ top: `${lastY}%` }}
      >
        <path d="M6 6L18 18M18 6L6 18" />
      </motion.svg>
    </div>
  )
}
