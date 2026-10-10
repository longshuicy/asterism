import { useId, useMemo } from 'react'
import { motion } from 'motion/react'
import { imageUrl, type ImageSize } from '../lib/images'
import { DrawPath } from '../components/DrawPath'
import { chipSize, LABEL_SIZE } from './measure'
import { CLOTH_H, INVERT_MATRIX, madeOn, PRINT_H, PRINT_W, signName, type PrintLayout } from './layout'

type Props = {
  layout: PrintLayout
  /** 'mini' draws only the cloth and the thread, for the small print on the Asterism. */
  detail?: 'full' | 'mini'
  /** Re-thread and settle: the thread draws itself, then the title arrives. */
  animate?: boolean
  imageSize?: ImageSize
  className?: string
}

const NAVY = '#0A1F31'
const THREAD = '#FF7A6B'

/** The Untold Story as SVG, 1080 × 1350. The PNG export draws the same layout to canvas. */
export function PrintSVG({ layout, detail = 'full', animate = false, imageSize = 1024, className }: Props) {
  const uid = useId().replace(/:/g, '')
  const full = detail === 'full'
  const matrix = INVERT_MATRIX.map((r) => r.join(' ')).join(' ')
  const beads = layout.bands.filter((b) => b.point)

  const chips = useMemo(
    () => (full ? layout.bands.map((b) => chipSize(b.label, signName(b.sign))) : []),
    [layout, full],
  )

  const fade = (delay: number) =>
    animate
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { delay, duration: 0.5 } }
      : {}

  return (
    <svg
      className={className}
      viewBox={`0 0 ${PRINT_W} ${PRINT_H}`}
      role="img"
      aria-label={`The Untold Story: ${layout.bands.length} drawings, ${beads.length} clues, in the order they were found`}
    >
      <defs>
        <filter id={`${uid}inv`} colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values={matrix} />
        </filter>
        {layout.bands.map((b, i) => (
          <clipPath key={i} id={`${uid}b${i}`}>
            <rect x="0" y={b.top} width={PRINT_W} height={b.height + 0.5} />
          </clipPath>
        ))}
        {full &&
          layout.lenses.map((l, i) => (
            <clipPath key={i} id={`${uid}l${i}`}>
              <circle cx={l.band.point!.x} cy={l.band.point!.y} r={l.r} />
            </clipPath>
          ))}
      </defs>

      <rect width={PRINT_W} height={PRINT_H} fill={NAVY} />

      {layout.bands.map((b, i) => (
        <g key={b.sign} clipPath={`url(#${uid}b${i})`}>
          <image
            href={imageUrl(b.sign, imageSize)}
            x="0"
            y={b.top + b.imageTop}
            width={PRINT_W}
            height={PRINT_W}
            preserveAspectRatio="none"
            filter={b.invert ? `url(#${uid}inv)` : undefined}
          />
        </g>
      ))}

      {full &&
        layout.bands.map((b, i) => {
          const c = chips[i]
          const x = b.labelSide === 'right' ? PRINT_W - c.w : 0
          const y = b.top + b.height - c.h
          return (
            <motion.g key={b.sign} {...fade(1.1 + i * 0.04)}>
              <rect x={x} y={y} width={c.w} height={c.h} fill={NAVY} />
              <text x={x + 14} y={y + 23} fontFamily="'EB Garamond', Georgia, serif" fontSize={LABEL_SIZE}>
                {b.label && (
                  <tspan fontStyle="italic" fill="#F2EEE3">
                    {b.label}
                  </tspan>
                )}
                <tspan fill="#9FB2C1">{c.signText}</tspan>
              </text>
            </motion.g>
          )
        })}

      <path d={layout.thread} fill="none" stroke={NAVY} strokeWidth="9" strokeLinecap="round" opacity="0.55" />
      <DrawPath
        d={layout.thread}
        fill="none"
        stroke={THREAD}
        strokeWidth={full ? 5 : 9}
        strokeLinecap="round"
        draw={animate}
        duration={1100}
      />
      {full &&
        beads.map((b, i) => (
          <motion.g key={b.sign} {...fade(0.15 + (i / Math.max(1, beads.length)) * 0.9)}>
            <circle cx={b.point!.x} cy={b.point!.y} r="13" fill="none" stroke={THREAD} strokeWidth="3" />
            <circle cx={b.point!.x} cy={b.point!.y} r="5" fill={THREAD} />
          </motion.g>
        ))}

      {full &&
        layout.lenses.map((l, i) => {
          const p = l.band.point!
          const clue = l.band.clue!
          const size = PRINT_W * l.zoom
          return (
            <motion.g key={i} {...fade(1.0 + i * 0.12)}>
              <circle cx={p.x} cy={p.y} r={l.r + 8} fill="none" stroke={NAVY} strokeWidth="6" />
              <circle cx={p.x} cy={p.y} r={l.r + 2.5} fill="none" stroke={THREAD} strokeWidth="5" />
              <g clipPath={`url(#${uid}l${i})`}>
                <image
                  href={imageUrl(l.band.sign, imageSize === 256 ? 256 : 2048)}
                  x={p.x - clue.x * size}
                  y={p.y - clue.y * size}
                  width={size}
                  height={size}
                  preserveAspectRatio="none"
                  filter={l.band.invert ? `url(#${uid}inv)` : undefined}
                />
              </g>
            </motion.g>
          )
        })}

      <rect x="0" y={CLOTH_H} width={PRINT_W} height={PRINT_H - CLOTH_H} fill={NAVY} />
      <rect x="0" y={CLOTH_H} width={PRINT_W} height={full ? 5 : 24} fill={THREAD} />
      {full && (
        <motion.g {...fade(1.4)} fontFamily="'EB Garamond', Georgia, serif">
          <text x="64" y="1253" fontSize="60" fill="#F2EEE3">
            The Untold Story
          </text>
          <text x="64" y="1298" fontSize="22" fontStyle="italic" fill="#E8E3D6">
            Told to no one else, in the order you found it.
          </text>
          <text
            x={PRINT_W - 64}
            y="1283"
            fontSize="15"
            textAnchor="end"
            fill="#C9D3DB"
            fontFamily="'Archivo Narrow', 'Arial Narrow', sans-serif"
          >
            <tspan x={PRINT_W - 64}>Made by one visit</tspan>
            <tspan x={PRINT_W - 64} dy="22.5">
              {madeOn(layout.made)}
            </tspan>
          </text>
        </motion.g>
      )}
    </svg>
  )
}
