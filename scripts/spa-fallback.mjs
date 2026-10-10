// GitHub Pages has no rewrites: serving index.html as 404.html lets deep links
// such as /d/capricorn or /story load the app, which then routes client-side.
import { copyFile } from 'node:fs/promises'

await copyFile('dist/index.html', 'dist/404.html')
console.log('spa-fallback: dist/404.html written')
