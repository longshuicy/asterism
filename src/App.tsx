import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Asterism from './screens/Asterism'
import Room from './screens/Room'
import Loom from './screens/Loom'
import Story from './screens/Story'

// The clue editor exists only under `npm run dev`; in a build this is `false`
// and the whole module is left out of the bundle.
const Dev = import.meta.env.DEV ? lazy(() => import('./screens/Dev')) : null

// Strip the trailing slash so GitHub Pages' /<repo>/ base works as a router basename.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

export default function App() {
  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route path="/" element={<Asterism />} />
        <Route path="/d/:sign" element={<Room />} />
        <Route path="/loom" element={<Loom />} />
        <Route path="/story" element={<Story />} />
        {Dev && (
          <Route
            path="/dev"
            element={
              <Suspense fallback={null}>
                <Dev />
              </Suspense>
            }
          />
        )}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
