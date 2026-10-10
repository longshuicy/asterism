import { imageUrl, loadImage } from '../lib/images'
import { CLOTH_H, INVERT_MATRIX, madeOn, PRINT_H, PRINT_W, signName, type PrintLayout } from './layout'
import { chipSize, labelFonts } from './measure'

const NAVY = '#0A1F31'
const THREAD = '#FF7A6B'
const SCALE = 2

/** Swap the two inks in place (the same matrix as the SVG filter). */
function invertPixels(c: HTMLCanvasElement) {
  const ctx = c.getContext('2d')!
  const data = ctx.getImageData(0, 0, c.width, c.height)
  const px = data.data
  const [m0, m1, m2] = INVERT_MATRIX
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i] / 255
    const g = px[i + 1] / 255
    const b = px[i + 2] / 255
    px[i] = 255 * Math.min(1, Math.max(0, m0[0] * r + m0[1] * g + m0[2] * b + m0[4]))
    px[i + 1] = 255 * Math.min(1, Math.max(0, m1[0] * r + m1[1] * g + m1[2] * b + m1[4]))
    px[i + 2] = 255 * Math.min(1, Math.max(0, m2[0] * r + m2[1] * g + m2[2] * b + m2[4]))
  }
  ctx.putImageData(data, 0, 0)
}

/** Draws `img` at (x, y, size) into a w × h window, inverted if asked, as an offscreen canvas. */
function crop(img: HTMLImageElement, w: number, h: number, x: number, y: number, size: number, invert: boolean) {
  const c = document.createElement('canvas')
  c.width = Math.ceil(w * SCALE)
  c.height = Math.ceil(h * SCALE)
  const ctx = c.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, x * SCALE, y * SCALE, size * SCALE, size * SCALE)
  if (invert) invertPixels(c)
  return c
}

export async function renderPrint(layout: PrintLayout): Promise<HTMLCanvasElement> {
  await Promise.all([
    document.fonts.load(labelFonts.object),
    document.fonts.load(labelFonts.sign),
    document.fonts.load('60px "EB Garamond"'),
    document.fonts.load('15px "Archivo Narrow"'),
  ]).catch(() => {})
  const images = new Map(
    await Promise.all(
      layout.bands.map(async (b) => [b.sign, await loadImage(imageUrl(b.sign, 2048))] as const),
    ),
  )

  const canvas = document.createElement('canvas')
  canvas.width = PRINT_W * SCALE
  canvas.height = PRINT_H * SCALE
  const ctx = canvas.getContext('2d')!
  ctx.scale(SCALE, SCALE)
  ctx.fillStyle = NAVY
  ctx.fillRect(0, 0, PRINT_W, PRINT_H)

  for (const b of layout.bands) {
    const band = crop(images.get(b.sign)!, PRINT_W, b.height, 0, b.imageTop, PRINT_W, b.invert)
    ctx.drawImage(band, 0, b.top, PRINT_W, b.height)
  }

  for (const b of layout.bands) {
    const c = chipSize(b.label, signName(b.sign))
    const x = b.labelSide === 'right' ? PRINT_W - c.w : 0
    const y = b.top + b.height - c.h
    ctx.fillStyle = NAVY
    ctx.fillRect(x, y, c.w, c.h)
    ctx.textBaseline = 'alphabetic'
    if (b.label) {
      ctx.font = labelFonts.object
      ctx.fillStyle = '#F2EEE3'
      ctx.fillText(b.label, x + 14, y + 23)
    }
    ctx.font = labelFonts.sign
    ctx.fillStyle = '#9FB2C1'
    ctx.fillText(c.signText, x + 14 + c.objectW, y + 23)
  }

  const thread = new Path2D(layout.thread)
  ctx.lineCap = 'round'
  ctx.globalAlpha = 0.55
  ctx.strokeStyle = NAVY
  ctx.lineWidth = 9
  ctx.stroke(thread)
  ctx.globalAlpha = 1
  ctx.strokeStyle = THREAD
  ctx.lineWidth = 5
  ctx.stroke(thread)

  for (const b of layout.bands) {
    if (!b.point) continue
    ctx.beginPath()
    ctx.arc(b.point.x, b.point.y, 13, 0, Math.PI * 2)
    ctx.lineWidth = 3
    ctx.strokeStyle = THREAD
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(b.point.x, b.point.y, 5, 0, Math.PI * 2)
    ctx.fillStyle = THREAD
    ctx.fill()
  }

  for (const l of layout.lenses) {
    const p = l.band.point!
    const clue = l.band.clue!
    const size = PRINT_W * l.zoom
    const view = crop(
      images.get(l.band.sign)!,
      2 * l.r,
      2 * l.r,
      l.r - clue.x * size,
      l.r - clue.y * size,
      size,
      l.band.invert,
    )
    ctx.beginPath()
    ctx.arc(p.x, p.y, l.r + 8, 0, Math.PI * 2)
    ctx.lineWidth = 6
    ctx.strokeStyle = NAVY
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(p.x, p.y, l.r + 2.5, 0, Math.PI * 2)
    ctx.lineWidth = 5
    ctx.strokeStyle = THREAD
    ctx.stroke()
    ctx.save()
    ctx.beginPath()
    ctx.arc(p.x, p.y, l.r, 0, Math.PI * 2)
    ctx.clip()
    ctx.drawImage(view, p.x - l.r, p.y - l.r, 2 * l.r, 2 * l.r)
    ctx.restore()
  }

  ctx.fillStyle = NAVY
  ctx.fillRect(0, CLOTH_H, PRINT_W, PRINT_H - CLOTH_H)
  ctx.fillStyle = THREAD
  ctx.fillRect(0, CLOTH_H, PRINT_W, 5)
  ctx.fillStyle = '#F2EEE3'
  ctx.font = '60px "EB Garamond", Georgia, serif'
  ctx.fillText('The Untold Story', 64, 1253)
  ctx.fillStyle = '#E8E3D6'
  ctx.font = 'italic 22px "EB Garamond", Georgia, serif'
  ctx.fillText('Told to no one else, in the order you found it.', 64, 1298)
  ctx.fillStyle = '#C9D3DB'
  ctx.font = '15px "Archivo Narrow", "Arial Narrow", sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText('Made by one visit', PRINT_W - 64, 1283)
  ctx.fillText(madeOn(layout.made), PRINT_W - 64, 1305.5)
  ctx.textAlign = 'left'

  return canvas
}

/** Saves The Untold Story as a PNG. */
export async function savePrint(layout: PrintLayout) {
  const canvas = await renderPrint(layout)
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'))
  if (!blob) return
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `the-untold-story-${layout.made.toISOString().slice(0, 10)}.png`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}
