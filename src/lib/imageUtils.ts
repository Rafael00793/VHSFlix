import React from 'react';

export const DEFAULT_POSTER_FALLBACK = 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=780&q=80';
export const DEFAULT_BACKDROP_FALLBACK = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80';

export const handlePosterError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
  const target = e.currentTarget;
  if (target.src !== DEFAULT_POSTER_FALLBACK) {
    target.src = DEFAULT_POSTER_FALLBACK;
  }
};

export const handleBackdropError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
  const target = e.currentTarget;
  if (target.src !== DEFAULT_BACKDROP_FALLBACK) {
    target.src = DEFAULT_BACKDROP_FALLBACK;
  }
};
