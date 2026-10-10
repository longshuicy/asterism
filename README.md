# Asterism

Twelve hand-drawn star signs. Look closer through the lens, follow the threads between drawings, and leave with The Untold Story: a print of your own path.

A static single-page app (Vite + React + TypeScript). Content lives in the repo as JSON; each visitor's progress lives in their browser.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173 — also renders the drawings to WebP first
```

| Route | Screen |
| --- | --- |
| `/` | The Asterism opening |
| `/d/:sign` | A drawing (the room) with the lens |
| `/loom` | The Loom |
| `/story` | The Untold Story |
| `/dev` | Clue editor (dev server only, never shipped) |

## Where things live

```
assets/drawings/        source PNGs from Procreate, one per sign (aries.png …)
scripts/build-images.ts sharp → public/img/<sign>-{2048,1024,256}.webp (git-ignored)
src/content/            drawings.json (couplets, Asterism slots), fragments.json (every clue), types.ts
src/store/visit.ts      the append-only visit log + derived selectors
src/lens/               canvas lens and the reveal box per clue kind
src/thread/             echo threads and the follow-an-echo transit
src/loom/weave.ts       the log → loom rows (passes, crossings, beads, snips)
src/story/              print layout, SVG print, PNG export, cut-the-cloth sequence
src/screens/            Asterism, Room, Loom, Story, Dev
```

## Placing clues

Open `/dev` while `npm run dev` is running. Click the drawing to drop a clue, drag to move it, drag the square handle to resize, and drag the sentence box to place the text. Arrow keys nudge (Shift for bigger steps). **Save** writes `src/content/fragments.json` directly, and refuses if the content breaks a rule (an echo to its own drawing, a counterpoint without its pair, a sealed clue waiting on its own drawing, overlapping clues). `npm run validate` runs the same checks.

The current clues are a starting set: Capricorn's twelve come from the design's clue map; the rest come from the earlier prototype and are placeholders to replace.

## Deploying

`.github/workflows/deploy.yml` builds and publishes to GitHub Pages on every push to `main`. One-time setup in the GitHub repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

The workflow sets the base path from the Pages configuration, so the site works both at `https://<user>.github.io/<repo>/` and on a custom domain. `dist/404.html` is a copy of `index.html`, so deep links like `/d/capricorn` load the app.
