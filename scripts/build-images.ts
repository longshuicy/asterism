// Turns each Procreate export in assets/drawings/ into WebP at three sizes:
//   2048 — the lens and echo zooms (loaded only when a room opens)
//   1024 — the room, loom warps and Asterism specimen windows
//    256 — the Asterism ghost grid and small prints
// Output goes to public/img/ (git-ignored) and is skipped when already up to date.
import { mkdir, readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const SRC = path.join(root, 'assets/drawings')
const OUT = path.join(root, 'public/img')
const SIZES = [2048, 1024, 256] as const

async function mtime(file: string): Promise<number> {
  try {
    return (await stat(file)).mtimeMs
  } catch {
    return 0
  }
}

await mkdir(OUT, { recursive: true })
const sources = (await readdir(SRC)).filter((f) => f.endsWith('.png'))
let written = 0

for (const file of sources) {
  const sign = path.basename(file, '.png')
  const src = path.join(SRC, file)
  const srcTime = await mtime(src)
  for (const size of SIZES) {
    const dest = path.join(OUT, `${sign}-${size}.webp`)
    if ((await mtime(dest)) > srcTime) continue
    await sharp(src)
      .resize(size, size, { fit: 'cover' })
      .flatten({ background: '#0A1F31' })
      .webp({ quality: size === 2048 ? 86 : 82, effort: 5 })
      .toFile(dest)
    written++
  }
}

console.log(`images: ${sources.length} drawings, ${written} file(s) written`)
