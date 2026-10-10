let ctx: CanvasRenderingContext2D | null = null

/** Text width in px for a CSS font shorthand, e.g. `italic 17px "EB Garamond"`. */
export function textWidth(text: string, font: string): number {
  ctx ??= document.createElement('canvas').getContext('2d')
  if (!ctx) return text.length * 8
  ctx.font = font
  return ctx.measureText(text).width
}

export const LABEL_SIZE = 17
export const labelFonts = {
  object: `italic ${LABEL_SIZE}px "EB Garamond", Georgia, serif`,
  sign: `${LABEL_SIZE}px "EB Garamond", Georgia, serif`,
}

/** Size of a band label chip: italic object, then ", Sign". */
export function chipSize(object: string, sign: string) {
  const objectW = object ? textWidth(object, labelFonts.object) : 0
  const signText = object ? `, ${sign}` : sign
  const signW = textWidth(signText, labelFonts.sign)
  return { w: objectW + signW + 28, h: 34, objectW, signText }
}
