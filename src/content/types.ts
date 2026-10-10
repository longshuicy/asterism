export type Sign =
  | 'aries'
  | 'taurus'
  | 'gemini'
  | 'cancer'
  | 'leo'
  | 'virgo'
  | 'libra'
  | 'scorpio'
  | 'sagittarius'
  | 'capricorn'
  | 'aquarius'
  | 'pisces'

export type Drawing = {
  sign: Sign
  name: string
  dates: string
  qualities: [string, string, string]
  couplet: [string, string]
  /** Column and row of this drawing's slot in the 6 × 3 Asterism grid. */
  cell: [number, number]
}

export type Kind = 'fragment' | 'echo' | 'sealed' | 'inscription' | 'counterpoint'

export type Condition =
  | { visited: Sign }
  | { found: string } // a fragment id
  | { followedAny: true }
  | { foundCount: number } // anywhere in the site

export type Fragment = {
  id: string // 'capricorn-lamp'
  drawing: Sign
  kind: Kind
  object: string // 'The oil lamp'
  sentence: string
  x: number // centre of the hotspot, 0–1
  y: number
  d: number // circle diameter, fraction of drawing width
  text: { x: number; y: number; align: 'left' | 'right' } // where the sentence appears
  echo?: { to: string; label: string } // echo: target fragment id + thread phrase
  pair?: string // counterpoint: the other fragment's id
  sealed?: Condition // sealed: what opens it
  signs?: string[] // inscription: words read one at a time
}
