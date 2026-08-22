import React from 'react';

// Fallback neutro e elegante em SVG escuro (estilo VHS/Cinema escuro) sem fotos externas aleatórias
export const DEFAULT_POSTER_FALLBACK = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22300%22%20height%3D%22450%22%20viewBox%3D%220%200%20300%20450%22%3E%3Crect%20width%3D%22300%22%20height%3D%22450%22%20fill%3D%22%23121216%22%2F%3E%3Cpath%20d%3D%22M110%20180h80v90h-80z%22%20fill%3D%22%2327272a%22%20rx%3D%228%22%2F%3E%3Ccircle%20cx%3D%22135%22%20cy%3D%22225%22%20r%3D%2214%22%20fill%3D%22%233f3f46%22%2F%3E%3Ccircle%20cx%3D%22165%22%20cy%3D%22225%22%20r%3D%2214%22%20fill%3D%22%233f3f46%22%2F%3E%3Ctext%20x%3D%22150%22%20y%3D%22310%22%20fill%3D%22%2371717a%22%20font-family%3D%22sans-serif%22%20font-size%3D%2212%22%20font-weight%3D%22bold%22%20text-anchor%3D%22middle%22%3EVHS%20FLIX%3C%2Ftext%3E%3C%2Fsvg%3E';

export const DEFAULT_BACKDROP_FALLBACK = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%221280%22%20height%3D%22720%22%20viewBox%3D%220%200%201280%20720%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22bg%22%20x1%3D%220%25%22%20y1%3D%220%25%22%20x2%3D%22100%22%20y2%3D%22100%25%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%2309090b%22%2F%3E%3Cstop%20offset%3D%2250%25%22%20stop-color%3D%22%2318181b%22%2F%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%2309090b%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Crect%20width%3D%221280%22%20height%3D%22720%22%20fill%3D%22url(%23bg)%22%2F%3E%3C%2Fsvg%3E';

export const isBrokenImageUrl = (url?: string): boolean => {
  if (!url || typeof url !== 'string' || url.trim() === '') return true;
  const trimmed = url.trim();
  if (trimmed === 'null' || trimmed === 'undefined' || trimmed === 'NO PIC') return true;
  if (trimmed.endsWith('/null') || trimmed.endsWith('/undefined') || trimmed.includes('originalnull') || trimmed.includes('w780null') || trimmed.includes('w1280null') || trimmed.includes('w500null') || trimmed.includes('w342null')) return true;
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

  // Se for caminho relativo do TMDB (ex: "/kchMolHk6l6rPo460y4MQMzF2j9.jpg")
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('data:image')) {
    const tmdbPath = trimmed.startsWith('/') ? trimmed : '/' + trimmed;
    return `https://image.tmdb.org/t/p/w500${tmdbPath}`;
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

  // Se for caminho relativo do TMDB
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('data:image')) {
    const tmdbPath = trimmed.startsWith('/') ? trimmed : '/' + trimmed;
    return `https://image.tmdb.org/t/p/w1280${tmdbPath}`;
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

export const prefetchTmdbImage = (_url: string) => {
  // No-op
};


