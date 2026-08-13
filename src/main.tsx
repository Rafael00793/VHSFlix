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

// Registro do Service Worker com estratégia Cache-First para imagens do TMDB
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[SW TMDB] Service Worker registrado com sucesso no escopo:', registration.scope);
      })
      .catch((error) => {
        console.warn('[SW TMDB] Falha ao registrar Service Worker:', error);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

