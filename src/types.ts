/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Movie {
  id: string;
  title: string;
  description: string;
  backdropUrl: string;
  posterUrl: string;
  category: string; // e.g., "Ação Retro", "Ficção Científica", "Terror VHS", "Clássicos 80s", "Animes & Desenhos"
  year: number;
  duration: string; // e.g., "1h 56m" ou "3 Temporadas"
  type: 'movie' | 'series';
  rating: number; // e.g., 8.5
  trailerUrl: string; // URL do trailer (Ex: YouTube Embed ou vídeo direto)
  isFeatured?: boolean;
  vhsTapeColor?: string; // Cor estética do cartucho VHS (para o visual retro)
  tmdbId?: number;
}

export interface WatchProgress {
  movieId: string;
  progress: number; // 0 a 100%
  currentTime: number; // segundos atuais
  duration: number; // duração total em segundos
  updatedAt: string; // ISO string
  isFinished: boolean;
}

export interface Profile {
  id: string;
  name: string;
  avatarUrl: string;
  myList: string[]; // IDs de filmes adicionados à lista
  watchHistory: { [movieId: string]: WatchProgress };
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  isAdmin: boolean;
  createdAt: string;
}

export interface TMDBConfig {
  apiKey: string;
  useFallbackSearch: boolean;
}
