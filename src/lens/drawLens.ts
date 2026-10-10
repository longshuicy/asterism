export const ZOOM = 2.6

/** Lens radius in CSS px for a frame of width `w`. */
export const lensRadius = (w: number) => Math.max(54, Math.min(120, w * 0.12))

type DrawOptions = {
  ctx: CanvasRenderingContext2D
  width: number // frame size in CSS px (the frame is square)
  pos: { u: number; v: number } | null // lens centre, 0–1
  img: HTMLImageElement | null
  clouded: boolean // a sealed clue that is still waiting
  dim: boolean // this drawing has said what it can
  engaged: boolean // resting on a clue
  thread: string
  /** The clue under the lens, ringed; `progress` sweeps 0→1 over the dwell. */
  ring?: { u: number; v: number; d: number; progress: number } | null
  /** A found clue's letter, set on the lens rim. */
  letter?: string | null
}

let tiny: HTMLCanvasElement | null = null
let soft: HTMLCanvasElement | null = null

/**
 * A sealed clue's lens: the view is shrunk to a few pixels and scaled back up in
 * two smooth steps (a heavy blur that works in every browser, unlike
 * `ctx.filter`), misted over, and marked with the sealed sign so it reads as
 * "something is here, not yet".
 */
function fog(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  sx: number,
  sy: number,
  sw: number,
  x: number,
  y: number,
  R: number,
) {
  tiny ??= document.createElement('canvas')
  soft ??= document.createElement('canvas')
  tiny.width = tiny.height = 7
  soft.width = soft.height = 40
  const t = tiny.getContext('2d')!
  const s = soft.getContext('2d')!
  t.imageSmoothingQuality = 'high'
  t.drawImage(img, sx, sy, sw, sw, 0, 0, 7, 7)
  s.imageSmoothingEnabled = true
  s.drawImage(tiny, 0, 0, 40, 40)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(soft, x - R, y - R, 2 * R, 2 * R)

  // Mist: pale at the centre, darkening to the rim.
  const g = ctx.createRadialGradient(x, y, R * 0.1, x, y, R)
  g.addColorStop(0, 'rgba(201, 211, 219, 0.42)')
  g.addColorStop(0.65, 'rgba(120, 140, 158, 0.3)')
  g.addColorStop(1, 'rgba(10, 31, 49, 0.6)')
  ctx.fillStyle = g
  ctx.fillRect(x - R, y - R, 2 * R, 2 * R)

  // The sealed mark: a ring with a bar.
  const m = R * 0.16
  ctx.lineWidth = 2.5
  ctx.strokeStyle = 'rgba(10, 31, 49, 0.85)'
  ctx.fillStyle = 'rgba(232, 227, 214, 0.18)'
  ctx.beginPath()
  ctx.arc(x, y, m, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x - m * 0.6, y)
  ctx.lineTo(x + m * 0.6, y)
  ctx.stroke()
}

/** Draws the magnified circle onto the overlay canvas. */
export function drawLens({ ctx, width, pos, img, clouded, dim, engaged, thread, ring, letter }: DrawOptions) {
  ctx.clearRect(0, 0, width, width)
  if (!pos || !img) return

  const R = lensRadius(width)
  const x = pos.u * width
  const y = pos.v * width
  const n = img.naturalWidth
  const sw = ((2 * R) / width) * (n / ZOOM)
  const sx = pos.u * n - sw / 2
  const sy = pos.v * n - sw / 2

  ctx.save()
  ctx.beginPath()
  ctx.arc(x, y, R, 0, Math.PI * 2)
  ctx.clip()
  ctx.fillStyle = '#0A1F31'
  ctx.fillRect(x - R, y - R, 2 * R, 2 * R)

  if (clouded) {
    fog(ctx, img, sx, sy, sw, x, y, R)
  } else {
    ctx.drawImage(img, sx, sy, sw, sw, x - R, y - R, 2 * R, 2 * R)
  }
  if (dim) {
    ctx.fillStyle = 'rgba(10,31,49,0.22)'
    ctx.fillRect(x - R, y - R, 2 * R, 2 * R)
  }

  // Ring the clue inside the magnified view, so the lens shows what it found
  // rather than hiding it. The sweep starts at twelve o'clock.
  if (ring && ring.progress > 0) {
    const cx = x + (ring.u - pos.u) * width * ZOOM
    const cy = y + (ring.v - pos.v) * width * ZOOM
    const r = Math.max(R * 0.38, Math.min(R * 0.78, (ring.d / 2) * width * ZOOM * 0.55))
    const a0 = -Math.PI / 2
    const a1 = a0 + Math.PI * 2 * ring.progress
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.arc(cx, cy, r, a0, a1)
    ctx.strokeStyle = 'rgba(10,31,49,0.7)'
    ctx.lineWidth = 5
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(cx, cy, r, a0, a1)
    ctx.strokeStyle = thread
    ctx.lineWidth = 2
    ctx.stroke()
  }
  ctx.restore()

  if (letter) {
    const lx = x + R * 0.72
    const ly = y + R * 0.72
    ctx.beginPath()
    ctx.arc(lx, ly, 13, 0, Math.PI * 2)
    ctx.fillStyle = '#0A1F31'
    ctx.fill()
    ctx.strokeStyle = thread
    ctx.lineWidth = 1.2
    ctx.stroke()
    ctx.fillStyle = '#F2EEE3'
    ctx.font = 'italic 17px "EB Garamond", Georgia, serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(letter, lx, ly - 1)
  }

  ctx.beginPath()
  ctx.arc(x, y, R, 0, Math.PI * 2)
  ctx.strokeStyle = thread
  ctx.globalAlpha = dim ? 0.6 : 1
  ctx.lineWidth = engaged ? 2.4 : 1.4
  ctx.stroke()
  ctx.globalAlpha = 1
}
