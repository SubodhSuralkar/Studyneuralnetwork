import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// ── SERVICE WORKER REGISTRATION ─────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swUrl = window.location.origin + '/sw.js';

    // Guard: verify the file exists AND is JS before registering.
    // This surfaces MIME/404 errors as clear console warnings instead
    // of an opaque SecurityError.
    fetch(swUrl, { headers: { 'Service-Worker': 'script' } })
      .then((res) => {
        const contentType = res.headers.get('content-type') ?? '';
        if (
          res.status === 404 ||
          !contentType.includes('javascript')
        ) {
          console.warn(
            `[NEXUS SW] Skipping registration — sw.js not found or ` +
            `wrong MIME type ("${contentType}"). ` +
            `Make sure sw.js is in your public/ folder.`
          );
          return;
        }
        // File is valid JS — safe to register.
        navigator.serviceWorker
          .register(swUrl, { scope: '/' })
          .then((reg) => {
            console.log('[NEXUS SW] Registered. Scope:', reg.scope);
          })
          .catch((err) => {
            console.warn('[NEXUS SW] Registration failed:', err);
          });
      })
      .catch((err) => {
        console.warn('[NEXUS SW] Could not reach sw.js:', err);
      });
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
