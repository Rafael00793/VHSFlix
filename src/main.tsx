import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Silenciar erros benignos de conexão de WebSocket e HMR do Vite em ambiente de container
const isBenignViteError = (msg: string): boolean => {
  if (!msg || typeof msg !== 'string') return false;
  const lower = msg.toLowerCase();
  return (
    lower.includes('websocket') ||
    lower.includes('vite') ||
    lower.includes('failed to connect') ||
    lower.includes('connection closed') ||
    lower.includes('without opened')
  );
};

window.addEventListener('error', (event) => {
  const msg = event.message || (event.error && event.error.message) || '';
  if (isBenignViteError(msg)) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}, true);

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const msg = reason instanceof Error ? reason.message : String(reason || '');
  if (isBenignViteError(msg)) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}, true);

// Filtra logs de warn/error do console para mensagens benignas de websocket do Vite
const origConsoleError = console.error;
console.error = (...args: any[]) => {
  const firstArg = typeof args[0] === 'string' ? args[0] : (args[0]?.message || '');
  if (isBenignViteError(firstArg)) return;
  origConsoleError.apply(console, args);
};

const origConsoleWarn = console.warn;
console.warn = (...args: any[]) => {
  const firstArg = typeof args[0] === 'string' ? args[0] : (args[0]?.message || '');
  if (isBenignViteError(firstArg)) return;
  origConsoleWarn.apply(console, args);
};

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

