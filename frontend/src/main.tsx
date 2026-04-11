// FIX for simple-peer / randombytes and util polyfills
(window as any).global = window;

// Polyfill for process and Buffer if needed
if (!(window as any).process) {
  (window as any).process = { env: { NODE_ENV: 'development' } };
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
