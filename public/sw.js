const TMDB_CACHE_NAME = 'tmdb-images-v1';
const STATIC_CACHE_NAME = 'vhx-static-v1';

self.addEventListener('install', (event) => {
  console.log('[SW TMDB] Instalando Service Worker de Cache de Imagens TMDB...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW TMDB] Ativando Service Worker e reivindicando clientes...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== TMDB_CACHE_NAME && cacheName !== STATIC_CACHE_NAME) {
            console.log('[SW TMDB] Limpando versão de cache antiga:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Identifica se a URL pertence às imagens do TMDB ou CDNs de mídias de capas
function isTmdbImageUrl(urlStr) {
  if (!urlStr) return false;
  return (
    urlStr.includes('image.tmdb.org') ||
    urlStr.includes('tmdb.org/t/p/') ||
    urlStr.includes('images.unsplash.com') ||
    urlStr.includes('m.media-amazon.com')
  );
}

// Estratégia CACHE-FIRST com revalidação em segundo plano e fallback
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = request.url;

  // Aplica Cache-First exclusivamente para requisições GET de imagens TMDB/Mídia
  if (request.method === 'GET' && isTmdbImageUrl(url)) {
    event.respondWith(
      caches.open(TMDB_CACHE_NAME).then(async (cache) => {
        // 1. Busca primeiro no Cache Persistente
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
          // Revalida silenciosamente em segundo plano para manter atualizado (stale-while-revalidate)
          fetch(request).then((networkResponse) => {
            if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
              cache.put(request, networkResponse);
            }
          }).catch(() => {
            // Silencioso em caso de ausência de rede durante revalidação
          });
          return cachedResponse;
        }

        // 2. Se não estiver em cache, efetua busca na Rede
        try {
          const networkResponse = await fetch(request, { mode: 'cors' }).catch(() => {
            // Em caso de falha de CORS ou restrição, tenta no-cors para salvar resposta opaca
            return fetch(request, { mode: 'no-cors' });
          });

          if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque' || networkResponse.status === 0)) {
            // Salva cópia no Cache Persistente do navegador
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch (err) {
          console.warn('[SW TMDB] Falha na rede para a imagem:', url, err);

          // 3. Em caso de falha total da rede sem cache, retorna SVG de reserva estilizado do VHSFLIX
          return new Response(
            `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" viewBox="0 0 300 450"><rect width="300" height="450" fill="#18181b"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#e4e4e7" font-family="sans-serif" font-size="18" font-weight="bold">VHSFLIX</text><text x="50%" y="58%" dominant-baseline="middle" text-anchor="middle" fill="#a1a1aa" font-family="sans-serif" font-size="12">CAPA INDISPONÍVEL</text></svg>`,
            {
              headers: {
                'Content-Type': 'image/svg+xml',
                'Cache-Control': 'no-store'
              }
            }
          );
        }
      })
    );
  }
});
