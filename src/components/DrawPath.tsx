import { useLayoutEffect, useRef, type SVGProps } from 'react'

type Props = SVGProps<SVGPathElement> & {
  /** Draw the line in from its start; otherwise it simply appears. */
  draw?: boolean
  duration?: number // ms
  delay?: number // ms
}

/**
 * A path that can draw itself in. The dash pattern is set from the path's real
 * length (not `pathLength="1"`, which some browsers ignore and render as 1px
 * dashes) and removed when the draw finishes, so at rest it is a plain solid line.
 */
export function DrawPath({ draw = false, duration = 1600, delay = 0, ...props }: Props) {
  const el = useRef<SVGPathElement>(null)

  useLayoutEffect(() => {
    const p = el.current
    if (!draw || !p || typeof p.getTotalLength !== 'function') return
    const len = p.getTotalLength()
    if (!len) return
    p.style.strokeDasharray = `${len} ${len}`
    const anim = p.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], {
      duration,
      delay,
      easing: 'cubic-bezier(0.5, 0, 0.2, 1)',
      fill: 'backwards',
    })
    const clear = () => {
      p.style.strokeDasharray = ''
    }
    anim.finished.then(clear, clear)
    return () => anim.cancel()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <path ref={el} {...props} />
}
