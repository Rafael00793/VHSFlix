import React from 'react';

export const DEFAULT_POSTER_FALLBACK = 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=780&q=80';
export const DEFAULT_BACKDROP_FALLBACK = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80';

export const isBrokenImageUrl = (url?: string): boolean => {
  if (!url || typeof url !== 'string' || url.trim() === '') return true;
  const trimmed = url.trim();
  if (trimmed === 'null' || trimmed === 'undefined' || trimmed === 'NO PIC') return true;
  if (trimmed.endsWith('/null') || trimmed.endsWith('/undefined') || trimmed.includes('originalnull') || trimmed.includes('w780null') || trimmed.includes('w1280null') || trimmed.includes('w500null')) return true;
  return false;
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

  // Se for uma imagem do TMDB que falhou por rede/adblocker, tenta primeiro através do proxy do backend
  if (!target.dataset.hasTriedProxy && target.src && target.src.includes('image.tmdb.org')) {
    target.dataset.hasTriedProxy = 'true';
    try {
      const urlObj = new URL(target.src);
      target.src = `/api/tmdb-image-proxy?path=${encodeURIComponent(urlObj.pathname)}`;
      return;
    } catch {
      // continua para o fallback
    }
  }

  if (target.dataset.hasFailed) return;
  target.dataset.hasFailed = 'true';
  target.src = DEFAULT_POSTER_FALLBACK;
};

export const handleBackdropError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
  const target = e.currentTarget;

  if (!target.dataset.hasTriedProxy && target.src && target.src.includes('image.tmdb.org')) {
    target.dataset.hasTriedProxy = 'true';
    try {
      const urlObj = new URL(target.src);
      target.src = `/api/tmdb-image-proxy?path=${encodeURIComponent(urlObj.pathname)}`;
      return;
    } catch {
      // continua para o fallback
    }
  }

  if (target.dataset.hasFailed) return;
  target.dataset.hasFailed = 'true';
  target.src = DEFAULT_BACKDROP_FALLBACK;
};

export const prefetchTmdbImage = (_url: string) => {
  // No-op inteligente para evitar gargalos no carregamento
};
