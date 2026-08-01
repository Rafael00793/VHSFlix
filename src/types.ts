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
  youtubeVideoId?: string; // ID do vídeo do YouTube armazenado para o trailer inteligente
  clicksCount?: number;
  votesLikes?: number;
  votesDislikes?: number;
  abyssId?: string; // ID gerado/obtido no Abyss
  abyssEmbedUrl?: string; // URL de reprodução incorporada gerada pelo Abyss
  abyssStatus?: string; // Status de processamento no Abyss (ex: "active", "processing")
  embedUrl?: string; // URL de Player / Embed manual do filme
  episodeEmbeds?: { [key: string]: string }; // Dicionário de URLs de embed para episódios de séries: {"1_1": "url", "1_2": "url"}
  seasonsConfig?: { [season: number]: number }; // Mapeamento de temporada para quantidade de episódios: {1: 8, 2: 10}
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
  password?: string;
  avatarUrl?: string;
  isAdmin: boolean;
  createdAt: string;
  deleted?: boolean;
  subscriptionExpiresAt?: string; // ISO string
}

export function getSubscriptionDaysLeft(user: User): number {
  if (user.isAdmin || user.email === 'rafaelguaruja09@gmail.com' || user.id === 'u1') {
    return 9999; // Sem limite para Admin Master
  }
  if (!user.subscriptionExpiresAt) return 30; // Padrão se não preenchido
  const expiry = new Date(user.subscriptionExpiresAt).getTime();
  const now = new Date().getTime();
  const diffMs = expiry - now;
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return daysLeft < 0 ? 0 : daysLeft;
}

export function renewSubscription(user: User): string {
  const daysLeft = getSubscriptionDaysLeft(user);
  const baseDate = daysLeft > 0 ? new Date(user.subscriptionExpiresAt!) : new Date();
  
  const newExpiry = new Date(baseDate);
  newExpiry.setDate(newExpiry.getDate() + 30);
  return newExpiry.toISOString();
}

export interface TMDBConfig {
  apiKey: string;
  useFallbackSearch: boolean;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  movieId: string;
  createdAt: string;
  isRead: boolean;
  type: 'movie' | 'series' | 'system';
  posterUrl?: string;
}

export interface MovieRequest {
  id: string;
  title: string;
  type: 'movie' | 'series';
  userId: string;
  userName: string;
  profileName: string;
  createdAt: string;
  status: 'pending' | 'fulfilled';
  posterUrl?: string;
  backdropUrl?: string;
  overview?: string;
  rating?: number;
  tmdbId?: number;
  year?: number;
  genres?: string[];
  seasonsCount?: number;
}

