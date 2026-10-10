import type { Kind } from '../content/types'

const GREY = 'var(--marker)'

/** The five clue marks from the clue map: dot, dot with tail, ring with bar, square, diamond. */
export function Marker({ kind, size = 22 }: { kind: Kind; size?: number }) {
  if (kind === 'echo') {
    return (
      <svg aria-hidden="true" width={(size * 36) / 22} height={size} viewBox="0 0 36 22">
        <path d="M11 11 C18 3, 24 19, 34 6" fill="none" stroke="var(--thread)" strokeWidth="2.5" />
        <circle cx="11" cy="11" r="6.5" fill="var(--thread)" stroke="var(--ground)" strokeWidth="1.5" />
      </svg>
    )
  }
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 22 22">
      {kind === 'fragment' && <circle cx="11" cy="11" r="5" fill={GREY} stroke="var(--ground)" strokeWidth="1.5" />}
      {kind === 'sealed' && (
        <>
          <circle cx="11" cy="11" r="6.5" fill="var(--ground)" stroke={GREY} strokeWidth="2" />
          <path d="M7 11H15" stroke={GREY} strokeWidth="2" />
        </>
      )}
      {kind === 'inscription' && (
        <rect x="5.5" y="5.5" width="11" height="11" fill={GREY} stroke="var(--ground)" strokeWidth="1.5" />
      )}
      {kind === 'counterpoint' && (
        <path d="M11 4L18 11L11 18L4 11Z" fill={GREY} stroke="var(--ground)" strokeWidth="1.5" />
      )}
    </svg>
  )
}

/** How each kind of clue behaves, as told to the visitor. */
export const KIND_RULE: Record<Kind, string> = {
  echo: 'Leads somewhere else. Its thread runs to a twin in another drawing; follow it to travel there.',
  fragment: 'Stays here. Rest the lens on it and its line fades in.',
  sealed: 'You can tell something is here, but the lens stays clouded until something happens in another drawing.',
  inscription: 'Signs drawn into the picture. Sweep the lens across and it reads them one at a time.',
  counterpoint: 'Half of a pair split across two drawings. Find both halves and the two lines sit together.',
}

export const KIND_LABEL: Record<Kind, string> = {
  fragment: 'Fragment',
  echo: 'Echo',
  sealed: 'Sealed',
  inscription: 'Inscription',
  counterpoint: 'Counterpoint',
}
