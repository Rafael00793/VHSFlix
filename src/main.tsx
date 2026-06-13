import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// @ts-ignore
import cssVars from 'css-vars-ponyfill';

// Ativar ponyfill de variáveis CSS para navegadores antigos (ex: Smart TVs Samsung de 2015 com Chrome 37)
try {
  cssVars({
    onlyLegacy: true,
    watch: true,
    shadowDOM: true,
  });
} catch (err) {
  console.warn('Erro ao inicializar o ponyfill para navegadores antigos:', err);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
