// Dev-only clue editor. Only reachable under `npm run dev` (App.tsx imports it
// behind import.meta.env.DEV, so it never ships in the build).
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { drawingOf, drawings, fragments as saved, isSign } from '../content'
import type { Condition, Fragment, Kind, Sign } from '../content/types'
import { imageUrl } from '../lib/images'
import { validate } from '../lib/validate'
import { defaultText, newFragment, normalize } from '../lib/fragmentDefaults'
import { LensView, type LensState } from '../lens/LensView'
import { RevealBody } from '../lens/Reveal'
import { KIND_LABEL, Marker } from '../components/Marker'
import './dev.css'

type Drag =
  | { type: 'move'; id: string; du: number; dv: number }
  | { type: 'size'; id: string }
  | { type: 'text'; id: string; du: number; dv: number }

type Status = { ok: boolean; lines: string[] } | null

const KINDS: Kind[] = ['fragment', 'echo', 'sealed', 'inscription', 'counterpoint']
const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

const previewState: LensState = {
  found: new Set(),
  followed: new Set(),
  unlocked: () => true,
  pairFound: () => true,
}

export default function Dev() {
  const [params, setParams] = useSearchParams()
  const sign: Sign = isSign(params.get('sign') ?? undefined) ? (params.get('sign') as Sign) : 'capricorn'

  const [list, setList] = useState<Fragment[]>(() => structuredClone(saved))
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(true)
  const [preview, setPreview] = useState(false)
  const [status, setStatus] = useState<Status>(null)
  const [dirty, setDirty] = useState(false)

  const frame = useRef<HTMLDivElement>(null)
  const drag = useRef<Drag | null>(null)

  const here = useMemo(() => list.filter((f) => f.drawing === sign), [list, sign])
  const selected = list.find((f) => f.id === selectedId) ?? null

  function change(next: Fragment[]) {
    setList(next)
    setDirty(true)
    setStatus(null)
  }

  function update(id: string, patch: Partial<Fragment>) {
    change(list.map((f) => (f.id === id ? { ...f, ...patch } : f)))
  }

  function rename(oldId: string, newId: string) {
    const fix = (id: string) => (id === oldId ? newId : id)
    change(
      list.map((f) => ({
        ...f,
        id: fix(f.id),
        echo: f.echo ? { ...f.echo, to: fix(f.echo.to) } : f.echo,
        pair: f.pair ? fix(f.pair) : f.pair,
        sealed: f.sealed && 'found' in f.sealed ? { found: fix(f.sealed.found) } : f.sealed,
      })),
    )
    setSelectedId(newId)
  }

  function add(u: number, v: number) {
    let n = here.length + 1
    while (list.some((f) => f.id === `${sign}-clue-${n}`)) n++
    const f = newFragment(`${sign}-clue-${n}`, sign, u, v)
    // Keep each drawing's clues together in the file.
    const lastHere = list.map((x) => x.drawing).lastIndexOf(sign)
    const next = [...list]
    next.splice(lastHere + 1, 0, f)
    change(next)
    setSelectedId(f.id)
  }

  function remove(id: string) {
    if (!window.confirm(`Delete “${id}”?`)) return
    change(list.filter((f) => f.id !== id))
    setSelectedId(null)
  }

  const point = (e: { clientX: number; clientY: number }) => {
    const r = frame.current!.getBoundingClientRect()
    return { u: (e.clientX - r.left) / r.width, v: (e.clientY - r.top) / r.height }
  }

  function startDrag(e: React.PointerEvent, d: Drag) {
    e.stopPropagation()
    e.preventDefault()
    frame.current!.setPointerCapture(e.pointerId)
    drag.current = d
    setSelectedId(d.id)
  }

  function onMove(e: React.PointerEvent) {
    const d = drag.current
    if (!d) return
    const { u, v } = point(e)
    const f = list.find((x) => x.id === d.id)
    if (!f) return
    if (d.type === 'move') update(f.id, { x: clamp01(u - d.du), y: clamp01(v - d.dv) })
    if (d.type === 'size') update(f.id, { d: Math.max(0.02, Math.min(0.6, 2 * Math.hypot(u - f.x, v - f.y))) })
    if (d.type === 'text') update(f.id, { text: { ...f.text, x: clamp01(u - d.du), y: clamp01(v - d.dv) } })
  }

  function onUp(e: React.PointerEvent) {
    if (drag.current) frame.current!.releasePointerCapture(e.pointerId)
    drag.current = null
  }

  // Arrow keys nudge by 0.001 (Shift: 0.01).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!selected || preview) return
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      const step = e.shiftKey ? 0.01 : 0.001
      const moves: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
      }
      const m = moves[e.key]
      if (!m) return
      e.preventDefault()
      update(selected.id, { x: clamp01(selected.x + m[0]), y: clamp01(selected.y + m[1]) })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const output = () => list.map(normalize)

  async function save() {
    const out = output()
    const problems = validate(out, drawings)
    if (problems.length) return setStatus({ ok: false, lines: problems })
    const res = await fetch('/__dev/fragments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(out),
    })
    const body = (await res.json().catch(() => ({}))) as { ok?: boolean; problems?: string[]; count?: number }
    if (res.ok && body.ok) {
      setDirty(false)
      setStatus({ ok: true, lines: [`Saved ${body.count} clues to src/content/fragments.json.`] })
    } else {
      setStatus({ ok: false, lines: body.problems ?? [`Save failed (${res.status}).`] })
    }
  }

  async function copySelected() {
    if (!selected) return
    await navigator.clipboard.writeText(JSON.stringify(normalize(selected), null, 2))
    setStatus({ ok: true, lines: [`Copied “${selected.id}”.`] })
  }

  function exportAll() {
    const blob = new Blob([JSON.stringify(output(), null, 2) + '\n'], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'fragments.json'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const shown = showAll ? here : here.filter((f) => f.id === selectedId)

  return (
    <main className="dev">
      <header className="dev-bar">
        <strong className="serif">Clue editor</strong>
        <label>
          Drawing{' '}
          <select
            value={sign}
            onChange={(e) => {
              setParams({ sign: e.target.value })
              setSelectedId(null)
            }}
          >
            {drawings.map((d) => (
              <option key={d.sign} value={d.sign}>
                {d.name} ({list.filter((f) => f.drawing === d.sign).length})
              </option>
            ))}
          </select>
        </label>
        <label>
          <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} /> All clues
        </label>
        <label>
          <input type="checkbox" checked={preview} onChange={(e) => setPreview(e.target.checked)} /> Preview lens
        </label>
        <span className="dev-spacer" />
        <button type="button" onClick={save} className="dev-primary">
          Save{dirty ? ' •' : ''}
        </button>
        <button type="button" onClick={copySelected} disabled={!selected}>
          Copy JSON
        </button>
        <button type="button" onClick={exportAll}>
          Export all
        </button>
      </header>

      {status && (
        <div className={`dev-status ${status.ok ? 'ok' : 'bad'}`} role="status">
          {status.lines.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      )}

      <div className="dev-body">
        <div className="dev-stage">
          {preview ? (
            <div className="dev-frame">
              <LensView sign={sign} clues={here} state={previewState} showMarkers={false} />
            </div>
          ) : (
            <div
              ref={frame}
              className="dev-frame editing"
              onPointerMove={onMove}
              onPointerUp={onUp}
              onClick={(e) => {
                if ((e.target as HTMLElement).dataset.bg !== undefined) {
                  const { u, v } = point(e)
                  add(u, v)
                }
              }}
            >
              <img data-bg="" className="drawing" src={imageUrl(sign, 2048)} alt="" draggable={false} />
              {here
                .filter((f) => !shown.includes(f))
                .map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className="dev-marker"
                    style={{ left: `${f.x * 100}%`, top: `${f.y * 100}%` }}
                    onClick={() => setSelectedId(f.id)}
                    title={f.id}
                  >
                    <Marker kind={f.kind} size={18} />
                  </button>
                ))}
              {shown.map((f) => {
                const sel = f.id === selectedId
                return (
                  <div key={f.id}>
                    <div
                      className={`dev-circle${sel ? ' sel' : ''}`}
                      style={{
                        left: `${f.x * 100}%`,
                        top: `${f.y * 100}%`,
                        width: `${f.d * 100}%`,
                        height: `${f.d * 100}%`,
                      }}
                      onPointerDown={(e) => {
                        const p = point(e)
                        startDrag(e, { type: 'move', id: f.id, du: p.u - f.x, dv: p.v - f.y })
                      }}
                    >
                      <span className="dev-tag">
                        <Marker kind={f.kind} size={14} /> {f.id}
                      </span>
                      {sel && (
                        <span
                          className="dev-handle"
                          onPointerDown={(e) => startDrag(e, { type: 'size', id: f.id })}
                          title="Drag to set the diameter"
                        />
                      )}
                    </div>
                    <div
                      className={`reveal ${f.text.align} dev-text${sel ? ' sel' : ''}`}
                      style={
                        f.text.align === 'left'
                          ? { left: `${f.text.x * 100}%`, top: `${f.text.y * 100}%` }
                          : { right: `${(1 - f.text.x) * 100}%`, top: `${f.text.y * 100}%` }
                      }
                      onPointerDown={(e) => {
                        const p = point(e)
                        startDrag(e, { type: 'text', id: f.id, du: p.u - f.text.x, dv: p.v - f.text.y })
                      }}
                    >
                      <RevealBody f={f} locked={false} pairFound read={f.signs?.length ?? 0} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {selected && !preview && (
            <p className="dev-readout">
              x {selected.x.toFixed(3)} · y {selected.y.toFixed(3)} · d {selected.d.toFixed(3)}
              <span>
                {' '}
                ({Math.round(selected.x * 2048)}, {Math.round(selected.y * 2048)}) px, ⌀ {Math.round(selected.d * 2048)}{' '}
                px
              </span>
            </p>
          )}
          {!preview && <p className="dev-hint">Click the drawing to drop a clue. Arrow keys nudge; Shift for more.</p>}
        </div>

        <aside className="dev-form">
          {selected ? (
            <ClueForm
              key={selected.id}
              f={selected}
              all={list}
              onChange={(patch) => update(selected.id, patch)}
              onRename={(id) => rename(selected.id, id)}
              onPair={(other) => {
                change(
                  list.map((x) =>
                    x.id === selected.id ? { ...x, pair: other } : x.id === other ? { ...x, pair: selected.id } : x,
                  ),
                )
              }}
              onDelete={() => remove(selected.id)}
            />
          ) : (
            <div className="dev-list">
              <p>
                {drawingOf(sign).name}: {here.length} clue{here.length === 1 ? '' : 's'}
              </p>
              <ul>
                {here.map((f) => (
                  <li key={f.id}>
                    <button type="button" onClick={() => setSelectedId(f.id)}>
                      <Marker kind={f.kind} size={14} /> {f.object || f.id}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </main>
  )
}

type FormProps = {
  f: Fragment
  all: Fragment[]
  onChange: (patch: Partial<Fragment>) => void
  onRename: (id: string) => void
  onPair: (id: string) => void
  onDelete: () => void
}

function ClueForm({ f, all, onChange, onRename, onPair, onDelete }: FormProps) {
  const [id, setId] = useState(f.id)
  const elsewhere = all.filter((x) => x.drawing !== f.drawing)
  const optionLabel = (x: Fragment) => `${drawingOf(x.drawing).name} · ${x.object || x.id}`

  const condType = !f.sealed ? 'followedAny' : Object.keys(f.sealed)[0]
  function setCondType(t: string) {
    const other = drawings.find((d) => d.sign !== f.drawing)!.sign
    const next: Condition =
      t === 'visited'
        ? { visited: other }
        : t === 'found'
          ? { found: elsewhere[0]?.id ?? '' }
          : t === 'foundCount'
            ? { foundCount: 5 }
            : { followedAny: true }
    onChange({ sealed: next })
  }

  return (
    <form className="dev-fields" onSubmit={(e) => e.preventDefault()}>
      <label>
        id
        <input
          value={id}
          onChange={(e) => setId(e.target.value)}
          onBlur={() => id.trim() && id !== f.id && onRename(id.trim())}
        />
      </label>
      <label>
        kind
        <select value={f.kind} onChange={(e) => onChange({ kind: e.target.value as Kind })}>
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {KIND_LABEL[k]}
            </option>
          ))}
        </select>
      </label>
      <label>
        object
        <input value={f.object} placeholder="The oil lamp" onChange={(e) => onChange({ object: e.target.value })} />
      </label>
      <label>
        sentence
        <textarea rows={3} value={f.sentence} onChange={(e) => onChange({ sentence: e.target.value })} />
      </label>
      <fieldset>
        <legend>sentence box</legend>
        <div className="dev-row">
          {(['left', 'right'] as const).map((a) => (
            <label key={a}>
              <input
                type="radio"
                name="align"
                checked={f.text.align === a}
                onChange={() => onChange({ text: { ...f.text, align: a } })}
              />{' '}
              {a}
            </label>
          ))}
          <button type="button" onClick={() => onChange({ text: defaultText(f.x, f.y, f.d) })}>
            Place beside clue
          </button>
        </div>
      </fieldset>

      {f.kind === 'echo' && (
        <fieldset>
          <legend>echo</legend>
          <label>
            target
            <select
              value={f.echo?.to ?? ''}
              onChange={(e) => onChange({ echo: { to: e.target.value, label: f.echo?.label ?? '' } })}
            >
              <option value="">Choose a clue in another drawing…</option>
              {elsewhere.map((x) => (
                <option key={x.id} value={x.id}>
                  {optionLabel(x)}
                </option>
              ))}
            </select>
          </label>
          <label>
            thread phrase
            <input
              value={f.echo?.label ?? ''}
              placeholder="Somewhere, another light is burning."
              onChange={(e) => onChange({ echo: { to: f.echo?.to ?? '', label: e.target.value } })}
            />
          </label>
        </fieldset>
      )}

      {f.kind === 'counterpoint' && (
        <fieldset>
          <legend>counterpoint</legend>
          <label>
            pair (set on both)
            <select value={f.pair ?? ''} onChange={(e) => onPair(e.target.value)}>
              <option value="">Choose a clue in another drawing…</option>
              {elsewhere.map((x) => (
                <option key={x.id} value={x.id}>
                  {optionLabel(x)}
                  {x.kind !== 'counterpoint' ? ` (${x.kind})` : ''}
                </option>
              ))}
            </select>
          </label>
        </fieldset>
      )}

      {f.kind === 'sealed' && (
        <fieldset>
          <legend>sealed until</legend>
          <select value={condType} onChange={(e) => setCondType(e.target.value)}>
            <option value="followedAny">any thread is followed</option>
            <option value="visited">a drawing is visited</option>
            <option value="found">a clue is found</option>
            <option value="foundCount">this many clues are found</option>
          </select>
          {f.sealed && 'visited' in f.sealed && (
            <select value={f.sealed.visited} onChange={(e) => onChange({ sealed: { visited: e.target.value as Sign } })}>
              {drawings
                .filter((d) => d.sign !== f.drawing)
                .map((d) => (
                  <option key={d.sign} value={d.sign}>
                    {d.name}
                  </option>
                ))}
            </select>
          )}
          {f.sealed && 'found' in f.sealed && (
            <select value={f.sealed.found} onChange={(e) => onChange({ sealed: { found: e.target.value } })}>
              {elsewhere.map((x) => (
                <option key={x.id} value={x.id}>
                  {optionLabel(x)}
                </option>
              ))}
            </select>
          )}
          {f.sealed && 'foundCount' in f.sealed && (
            <input
              type="number"
              min={1}
              value={f.sealed.foundCount}
              onChange={(e) => onChange({ sealed: { foundCount: Number(e.target.value) } })}
            />
          )}
        </fieldset>
      )}

      {f.kind === 'inscription' && (
        <label>
          words, one per line
          <textarea
            rows={4}
            value={(f.signs ?? []).join('\n')}
            onChange={(e) => onChange({ signs: e.target.value.split('\n') })}
            onBlur={(e) => onChange({ signs: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })}
          />
        </label>
      )}

      <button type="button" className="dev-delete" onClick={onDelete}>
        Delete clue
      </button>
    </form>
  )
}
