import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'motion/react'
import { useReducedMotion } from '../lib/useReducedMotion'
import { useVisit } from '../store/visit'
import { printLayout } from '../story/layout'
import { PrintSVG } from '../story/PrintSVG'
import { CutSequence } from '../story/CutSequence'
import { Nav } from '../components/Nav'
import { savePrint } from '../story/exportPng'
import './story.css'

export default function Story() {
  const location = useLocation()
  const reduced = useReducedMotion()
  const stories = useVisit((s) => s.stories)
  const story = stories[stories.length - 1]
  const layout = useMemo(() => (story ? printLayout(story) : null), [story])

  const justCut = !!(location.state as { justCut?: boolean } | null)?.justCut
  const [cutting, setCutting] = useState(justCut && !reduced)
  const [saving, setSaving] = useState(false)

  if (!layout) {
    return (
      <main className="story empty-story">
        <Nav />
        <div className="story-empty">
          <h1>No story yet</h1>
          <p>Weave six drawings together, then cut the cloth on the loom.</p>
          <Link className="pill" to="/loom">
            The Loom
          </Link>
        </div>
      </main>
    )
  }

  async function save() {
    setSaving(true)
    try {
      await savePrint(layout!)
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.main className="story" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <Nav />

      <div className="story-body">
        <div className="print-wrap">
          {cutting ? (
            <>
              <CutSequence layout={layout} onDone={() => setCutting(false)} />
              <button type="button" className="skip" onClick={() => setCutting(false)}>
                Skip
              </button>
            </>
          ) : (
            <PrintSVG className="print" layout={layout} animate={justCut && !reduced} />
          )}
        </div>

        <motion.aside
          className="story-notes"
          initial={justCut ? { opacity: 0 } : false}
          animate={{ opacity: cutting ? 0 : 1 }}
          transition={{ delay: cutting ? 0 : 1.2, duration: 0.6 }}
        >
          <h1>The Untold Story</h1>
          <p>
            Save the print as an image. You can return to the drawings and keep weaving; cutting again makes a new,
            longer story.
          </p>
          <div className="story-actions">
            <button type="button" className="pill" onClick={save} disabled={saving || cutting}>
              {saving ? 'Saving…' : 'Save the print'}
            </button>
            <Link className="navlink" to="/">
              Back to the drawings
            </Link>
          </div>
        </motion.aside>
      </div>
    </motion.main>
  )
}
