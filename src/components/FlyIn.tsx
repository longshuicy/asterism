import { useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { animate } from 'motion'

export type RectLike = { left: number; top: number; width: number; height: number }

export const toRect = (r: DOMRect): RectLike => ({ left: r.left, top: r.top, width: r.width, height: r.height })

type Props = {
  from: RectLike
  /** Measured once the destination has laid out. */
  to: () => RectLike | null
  src: string
  reduced: boolean
  onDone: () => void
}

/**
 * A drawing moving between its full square and its warp strip on the loom.
 * The box is cropped with object-fit: cover, so narrowing it reveals exactly the
 * centre slice the loom shows. About 1 s.
 */
export function FlyIn({ from, to, src, reduced, onDone }: Props) {
  const el = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const target = to()
    if (!target || reduced || !el.current) {
      onDone()
      return
    }
    const c = animate(
      el.current,
      {
        left: [from.left, target.left],
        top: [from.top, target.top],
        width: [from.width, target.width],
        height: [from.height, target.height],
      },
      { duration: 1, ease: [0.5, 0, 0.15, 1] },
    )
    c.finished.then(onDone)
    return () => c.stop()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return createPortal(
    <div ref={el} className="fly" aria-hidden="true" style={{ ...from }}>
      <img src={src} alt="" />
    </div>,
    document.body,
  )
}
