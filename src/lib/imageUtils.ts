import React from 'react';

export const DEFAULT_POSTER_FALLBACK = 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=780&q=80';
export const DEFAULT_BACKDROP_FALLBACK = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80';

export const BROKEN_IMAGE_HASHES = [
  'jX7mK6H2', '49Wp6m9l', 'orS9OFID', '8uO0gUMY', 'lS9cl9mS', 'h66GZ66W',
  'vfrQZS3m', 'n779Ufe', 'b0Y6209q', '6v8yNlId', '670T88B4', '7g72uV9Q',
  '6gX2ZcQ7', '9p3i8O2g', 'vKof7jZ50vS2pYgO569ofCidG9y', '16a34aofqK8gZ9s4aofqK8gZ'
];

export const isBrokenImageUrl = (url?: string): boolean => {
  if (!url || typeof url !== 'string' || url.trim() === '') return true;
  const trimmed = url.trim();
  if (trimmed === 'null' || trimmed === 'undefined' || trimmed === 'NO PIC') return true;
  if (trimmed.endsWith('/null') || trimmed.endsWith('/undefined') || trimmed.includes('originalnull') || trimmed.includes('w780null') || trimmed.includes('w1280null') || trimmed.includes('w500null')) return true;
  return BROKEN_IMAGE_HASHES.some(h => trimmed.includes(h));
};

export function getCleanPosterUrl(url?: string): string {
  if (!url || typeof url !== 'string') return DEFAULT_POSTER_FALLBACK;
  let trimmed = url.trim();
  if (isBrokenImageUrl(trimmed)) return DEFAULT_POSTER_FALLBACK;

  // Upgrade http -> https
  if (trimmed.startsWith('http://')) {
    trimmed = 'https://' + trimmed.slice(7);
  }

  // Handle relative TMDB path (e.g. "/8uO0gUMYrj5BNZ6Z9ZgWaS9Stj3.jpg" or "8uO0gUMYrj5BNZ6Z9ZgWaS9Stj3.jpg")
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('data:image')) {
    const tmdbPath = trimmed.startsWith('/') ? trimmed : '/' + trimmed;
    trimmed = `https://image.tmdb.org/t/p/w780${tmdbPath}`;
  }

  return trimmed;
}

export function getCleanBackdropUrl(url?: string, fallbackPoster?: string): string {
  if (!url || typeof url !== 'string') {
    return fallbackPoster ? getCleanPosterUrl(fallbackPoster) : DEFAULT_BACKDROP_FALLBACK;
  }
  let trimmed = url.trim();
  if (isBrokenImageUrl(trimmed)) {
    return fallbackPoster ? getCleanPosterUrl(fallbackPoster) : DEFAULT_BACKDROP_FALLBACK;
  }

  // Upgrade http -> https
  if (trimmed.startsWith('http://')) {
    trimmed = 'https://' + trimmed.slice(7);
  }

  // Handle relative TMDB path (e.g. "/vKof7jZ50vS2pYgO569ofCidG9y.jpg")
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('data:image')) {
    const tmdbPath = trimmed.startsWith('/') ? trimmed : '/' + trimmed;
    trimmed = `https://image.tmdb.org/t/p/w1280${tmdbPath}`;
  }

  return trimmed;
}

export const handlePosterError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
  const target = e.currentTarget;
  if (target.dataset.hasFailed) return;
  target.dataset.hasFailed = 'true';
  target.src = DEFAULT_POSTER_FALLBACK;
};

export const handleBackdropError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
  const target = e.currentTarget;
  if (target.dataset.hasFailed) return;
  target.dataset.hasFailed = 'true';
  target.src = DEFAULT_BACKDROP_FALLBACK;
};

/**
 * Pré-carrega e armazena preventivamente imagens do TMDB no cache local do Service Worker
 */
export const prefetchTmdbImage = (url: string) => {
  if (!url || typeof window === 'undefined' || !('caches' in window)) return;
  if (!url.includes('image.tmdb.org') && !url.includes('tmdb.org')) return;

  caches.open('tmdb-images-v1').then((cache) => {
    cache.match(url).then((existing) => {
      if (!existing) {
        fetch(url, { mode: 'cors' })
          .then((res) => {
            if (res.status === 200 || res.type === 'opaque') {
              cache.put(url, res);
            }
          })
          .catch(() => {
            fetch(url, { mode: 'no-cors' })
              .then((res) => {
                if (res.status === 200 || res.type === 'opaque' || res.status === 0) {
                  cache.put(url, res);
                }
              })
              .catch(() => {});
          });
      }
    });
  }).catch(() => {});
};
