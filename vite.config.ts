import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import drawings from './src/content/drawings.json'
import { validate } from './src/lib/validate.ts'
import type { Drawing, Fragment } from './src/content/types.ts'

const FRAGMENTS = fileURLToPath(new URL('./src/content/fragments.json', import.meta.url))

// Dev-only endpoint for the /dev editor: POST /__dev/fragments writes fragments.json.
// It refuses to write anything that fails validation and returns the problems instead.
function devFragmentsEndpoint(): Plugin {
  return {
    name: 'asterism-dev-fragments',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__dev/fragments', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end()
          return
        }
        let body = ''
        req.on('data', (chunk) => (body += chunk))
        req.on('end', async () => {
          res.setHeader('Content-Type', 'application/json')
          try {
            const fragments = JSON.parse(body) as Fragment[]
            const problems = validate(fragments, drawings as Drawing[])
            if (problems.length) {
              res.statusCode = 422
              res.end(JSON.stringify({ ok: false, problems }))
              return
            }
            await writeFile(FRAGMENTS, JSON.stringify(fragments, null, 2) + '\n')
            res.end(JSON.stringify({ ok: true, count: fragments.length }))
          } catch (err) {
            res.statusCode = 400
            res.end(JSON.stringify({ ok: false, problems: [String(err)] }))
          }
        })
      })
    },
  }
}

// GitHub Pages serves the site from /<repo>/; the workflow passes that in as BASE_PATH.
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [react(), devFragmentsEndpoint()],
})
