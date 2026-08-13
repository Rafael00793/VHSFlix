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
  return BROKEN_IMAGE_HASHES.some(h => url.includes(h));
};

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
