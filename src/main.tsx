import { createRoot } from 'react-dom/client'
import '@fontsource/eb-garamond/400.css'
import '@fontsource/eb-garamond/400-italic.css'
import '@fontsource/eb-garamond/500.css'
import '@fontsource/archivo-narrow/400.css'
import '@fontsource/archivo-narrow/500.css'
import './styles.css'
import App from './App'

createRoot(document.getElementById('root')!).render(<App />)
