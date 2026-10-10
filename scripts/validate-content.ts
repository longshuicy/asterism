// `npm run validate` — checks fragments.json against the content rules.
import drawings from '../src/content/drawings.json'
import fragments from '../src/content/fragments.json'
import type { Drawing, Fragment } from '../src/content/types.ts'
import { validate } from '../src/lib/validate.ts'

const problems = validate(fragments as Fragment[], drawings as Drawing[])
if (problems.length) {
  for (const p of problems) console.error(`✗ ${p}`)
  process.exit(1)
}
console.log(`✓ ${fragments.length} clues across ${drawings.length} drawings`)
