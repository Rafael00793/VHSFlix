import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Silenciar erros benignos de conexão de WebSocket e HMR do Vite em desenvolvimento
window.addEventListener('error', (event) => {
  const msg = event.message || '';
  if (
    msg.toLowerCase().includes('websocket') ||
    msg.toLowerCase().includes('vite') ||
    msg.toLowerCase().includes('failed to connect') ||
    msg.toLowerCase().includes('connection')
  ) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}, true);

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const msg = reason instanceof Error ? reason.message : String(reason);
  if (
    msg.toLowerCase().includes('websocket') ||
    msg.toLowerCase().includes('vite') ||
    msg.toLowerCase().includes('failed to connect') ||
    msg.toLowerCase().includes('connection')
  ) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}, true);

// Unregister service worker and clear sw caches to restore direct image loading
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  }).catch(() => {});
  if ('caches' in window) {
    caches.keys().then((names) => {
      for (const name of names) {
        caches.delete(name);
      }
    }).catch(() => {});
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

