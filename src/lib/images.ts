import { useEffect, useState } from 'react'
import type { Sign } from '../content/types'

export type ImageSize = 2048 | 1024 | 256

/** Built by scripts/build-images.ts into public/img/. */
export const imageUrl = (sign: Sign, size: ImageSize) => `${import.meta.env.BASE_URL}img/${sign}-${size}.webp`

const cache = new Map<string, Promise<HTMLImageElement>>()

export function loadImage(src: string): Promise<HTMLImageElement> {
  let p = cache.get(src)
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image()
      img.decoding = 'async'
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = src
    })
    cache.set(src, p)
  }
  return p
}

/** The loaded image for `src`, or null while it loads. */
export function useImage(src: string | null): HTMLImageElement | null {
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  useEffect(() => {
    let live = true
    setImg(null)
    if (src) loadImage(src).then((i) => live && setImg(i), () => {})
    return () => {
      live = false
    }
  }, [src])
  return img
}
