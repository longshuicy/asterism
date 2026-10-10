import { useEffect, useRef } from 'react'
import { animate } from 'motion'
import type { Fragment } from '../content/types'
import { imageUrl, loadImage } from '../lib/images'

type Props = {
  from: Fragment
  to: Fragment
  reduced: boolean
  /** Called while the twin fills the frame, so the room underneath can change. */
  onSwap: () => void
  onDone: () => void
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Following an echo: zoom into the shared object, crossfade to its twin, pull
 * back. About 2.7 s, skippable; reduced motion gets a plain crossfade.
 */
export function Transit({ from, to, reduced, onSwap, onDone }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const a = useRef<HTMLImageElement>(null)
  const b = useRef<HTMLImageElement>(null)
  const swapped = useRef(false)
  const finished = useRef(false)
  const running = useRef<{ stop: () => void }[]>([])

  const swap = () => {
    if (swapped.current) return
    swapped.current = true
    onSwap()
  }
  const finish = () => {
    if (finished.current) return
    finished.current = true
    running.current.forEach((c) => c.stop())
    swap()
    onDone()
  }

  useEffect(() => {
    let live = true
    const play = <T,>(c: T & { stop: () => void; finished: Promise<unknown> }) => {
      running.current.push(c)
      return c.finished
    }
    const twin = imageUrl(to.drawing, 2048)

    async function run() {
      const A = a.current!
      const B = b.current!
      // Have the twin ready before we arrive, but never stall the zoom for long.
      const ready = Promise.race([loadImage(twin).catch(() => {}), wait(900)])

      if (reduced) {
        await ready
        if (!live) return
        await play(animate(B, { opacity: [0, 1] }, { duration: 0.6 }))
        if (!live) return
        swap()
        await play(animate(box.current!, { opacity: [1, 0] }, { duration: 0.3 }))
        if (live) finish()
        return
      }

      const S = Math.min(7, 0.85 / Math.max(from.d, to.d, 0.05))
      A.style.transformOrigin = `${from.x * 100}% ${from.y * 100}%`
      B.style.transformOrigin = `${to.x * 100}% ${to.y * 100}%`
      B.style.transform = `scale(${S})`

      await play(animate(A, { scale: [1, S] }, { duration: 1.0, ease: [0.6, 0, 0.8, 0.45] }))
      await ready
      if (!live) return
      await play(animate(B, { opacity: [0, 1] }, { duration: 0.4 }))
      if (!live) return
      swap()
      await play(animate(B, { scale: [S, 1] }, { duration: 1.0, ease: [0.15, 0.55, 0.35, 1] }))
      if (!live) return
      await play(animate(box.current!, { opacity: [1, 0] }, { duration: 0.25 }))
      if (live) finish()
    }

    run().catch(() => live && finish())
    return () => {
      live = false
      running.current.forEach((c) => c.stop())
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div ref={box} className="transit" aria-hidden="true">
        <img ref={a} src={imageUrl(from.drawing, 2048)} alt="" />
        <img ref={b} src={imageUrl(to.drawing, 2048)} alt="" style={{ opacity: 0 }} />
      </div>
      <button type="button" className="skip" onClick={finish}>
        Skip
      </button>
    </>
  )
}
