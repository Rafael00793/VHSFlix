/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Movie, User, Profile, WatchProgress, AppNotification, MovieRequest, MovieComment, getSubscriptionDaysLeft, renewSubscription } from './types';
import { INITIAL_MOVIES, INITIAL_USERS, DEFAULT_PROFILES, GENRE_CATEGORIES, getMovieDetailsTMDB, getTMDBTrendingMovies, getTMDBTrendingContent } from './data';
import { DEFAULT_POSTER_FALLBACK, DEFAULT_BACKDROP_FALLBACK, handlePosterError, handleBackdropError, isBrokenImageUrl, getCleanPosterUrl, getCleanBackdropUrl } from './lib/imageUtils';
import Navbar from './components/Navbar';
import ProfileSelector from './components/ProfileSelector';
import MovieRow from './components/MovieRow';
import MovieDetailModal from './components/MovieDetailModal';
import RecommendationBadge from './components/RecommendationBadge';
import AdminPanel from './components/AdminPanel';
import RequestsPanel from './components/RequestsPanel';
import SupportPanel from './components/SupportPanel';
import { VhsTapeIcon } from './components/VhsTapeIcon';
import { NeonFreshIcon } from './components/NeonFreshIcon';
import { AnimatedFilmReelIcon } from './components/AnimatedFilmReelIcon';
import { AnimatedTvIcon } from './components/AnimatedTvIcon';
import { AnimatedResumeIcon } from './components/AnimatedResumeIcon';
import { AnimatedNeonFlameIcon } from './components/AnimatedNeonFlameIcon';
import { Play, Info, Sparkles, Star, Plus, Check, Shield, HelpCircle, AlertCircle, Heart, HeartOff, Volume1, Volume2, VolumeX, Bell, X, Flame, LayoutGrid, List, Trash2, ChevronLeft, ChevronRight, Film, Tv, Clock, Award, Bookmark } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, saveUsersToFirestore, deleteUserFromFirestore, saveProfilesToFirestore, saveMoviesToFirestore, saveSingleMovieToFirestore, deleteMovieFromFirestore, saveSettingsToFirestore, saveRequestsToFirestore, saveSingleRequestToFirestore, deleteRequestFromFirestore, handleFirestoreError, OperationType, saveSingleNotificationToFirestore, deleteNotificationFromFirestore, saveSingleCommentToFirestore, deleteCommentFromFirestore } from './lib/firebase';
import { onSnapshot, collection, doc, setDoc, getDoc } from 'firebase/firestore';
import { fetchApi } from './lib/apiClient';

// Helper para categorização detalhada do tipo de produção (Filme, Série de TV, Reality Show, Novela)
function getMovieTypeDetailed(m: Movie): string {
  if (!m) return 'Filme';
  const cat = (m.category || '').toLowerCase();
  const title = (m.title || '').toLowerCase();
  if (cat.includes('reality') || title.includes('reality') || title.includes('bbb') || cat.includes('show')) return 'Reality Show';
  if (cat.includes('novela') || title.includes('novela')) return 'Novela';
  if (m.type === 'series' || cat.includes('série') || cat.includes('serie')) return 'Série de TV';
  return 'Filme';
}



// Auxiliar para peso de adição de mídia (data de criação no admin)
function getMovieAdditionWeight(m: Movie): number {
  if (!m) return 0;
  if (m.id) {
    const customMatch = m.id.match(/^m_(\d{10,})$/);
    if (customMatch) {
      return parseInt(customMatch[1]);
    }
    const digitsMatch = m.id.match(/\d{8,}/);
    if (digitsMatch) {
      return parseInt(digitsMatch[0]);
    }
  }
  const initialMatch = m.id?.match(/^m_2026_(\d+)$/);
  if (initialMatch) {
    return 100000 - parseInt(initialMatch[1]);
  }
  return 50000;
}

// Identifica produções que pertencem à aba Lançamentos (Ano 2026+, estreias de 2025/2026 no Brasil, novas dublagens e novidades do catálogo)
function isReleaseMedia(m: Movie): boolean {
  if (!m) return false;
  const year = Number(m.year) || 0;

  // 1. Títulos de 2026 ou anos posteriores (2027+)
  if (year >= 2026) return true;

  // 2. Data de lançamento registrada pelo TMDB em 2026 ou posterior
  if (m.releaseDate) {
    const relYear = parseInt(m.releaseDate.split('-')[0]) || 0;
    if (relYear >= 2026) return true;
    if (m.releaseDate.includes('2026')) return true;
  }

  // 3. Títulos de 2025 (safra recente em circulação no streaming e cinema)
  if (year === 2025) return true;

  // 4. Filmes de 2024 que tiveram dublagem/estreia nacional recente em 2025 ou 2026
  if (year === 2024 && m.releaseDate && (m.releaseDate.includes('2025') || m.releaseDate.includes('2026'))) {
    return true;
  }

  return false;
}

// Ordenação oficial por Ano de Lançamento / Data de Lançamento (mais recentes primeiro: 2026, 2025, 2024...)
function sortByReleaseYear(a: Movie, b: Movie): number {
  const yearA = Number(a.year) || 1990;
  const yearB = Number(b.year) || 1990;
  if (yearB !== yearA) {
    return yearB - yearA; // Ex: 2026 antes de 2025
  }

  // Mesmo ano: compara data de lançamento se disponível
  if (a.releaseDate && b.releaseDate) {
    const tA = Date.parse(a.releaseDate) || 0;
    const tB = Date.parse(b.releaseDate) || 0;
    if (tB !== tA) return tB - tA;
  }

  // Mesmo ano e data: ordena por adição recente
  const weightA = getMovieAdditionWeight(a);
  const weightB = getMovieAdditionWeight(b);
  if (weightB !== weightA) return weightB - weightA;

  return (b.rating || 0) - (a.rating || 0);
}

export default function App() {
  // --- ESTADOS DE SESSÃO E PERSISTÊNCIA GERAL ---
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('vhsflix_users');
    let parsed: User[] = saved ? JSON.parse(saved) : INITIAL_USERS;
    
    // Garantir que o Administrador Master sempre exista com as credenciais corretas solicitadas
    const masterAdminEmail = 'rafaelguaruja09@gmail.com';
    const masterAdmin = parsed.find(u => u.id === 'u1' || u.email.toLowerCase() === masterAdminEmail.toLowerCase());
    if (masterAdmin) {
      masterAdmin.name = 'Rafael Gusmão';
      masterAdmin.email = masterAdminEmail;
      masterAdmin.password = '19112016';
      masterAdmin.isAdmin = true;
    } else {
      parsed.unshift({
        id: 'u1',
        name: 'Rafael Gusmão',
        email: masterAdminEmail,
        password: '19112016',
        isAdmin: true,
        createdAt: '2026-05-10T12:00:00Z'
      });
    }

    // Inicializar assinaturas de 30 dias para usuários normais que não possuem o campo definido
    parsed = parsed.map(u => {
      if (!u.isAdmin && !u.subscriptionExpiresAt) {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        return {
          ...u,
          subscriptionExpiresAt: thirtyDaysFromNow.toISOString()
        };
      }
      return u;
    });

    return parsed;
  });

  const [allProfiles, setAllProfiles] = useState<{ [userId: string]: Profile[] }>(() => {
    const saved = localStorage.getItem('vhsflix_profiles');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const cleaned: { [userId: string]: Profile[] } = {};
        for (const [uid, profs] of Object.entries(parsed as { [uid: string]: Profile[] })) {
          if (Array.isArray(profs) && profs.length > 0) {
            const valid = profs.filter(p => p.name !== 'Crianças VHS' && p.id !== 'p1_2');
            cleaned[uid] = valid.length > 0 ? [valid[0]] : [profs[0]];
          }
        }
        return cleaned;
      } catch (e) {
        return DEFAULT_PROFILES;
      }
    }
    return DEFAULT_PROFILES;
  });

  const [movies, setMovies] = useState<Movie[]>(() => {
    const saved = localStorage.getItem('vhsflix_movies');
    const rawBase = saved ? JSON.parse(saved) : INITIAL_MOVIES;
    
    // Filtrar quaisquer itens inválidos ou mídias indesejadas (como adições automáticas indesejadas)
    const base = Array.isArray(rawBase) ? rawBase.filter((m: any) => {
      if (!m) return false;
      if (m.id && String(m.id).startsWith('tmdb_trend_')) return false;
      const title = (m.title || '').toLowerCase();
      const poster = (m.posterUrl || '').toLowerCase();
      if (title.includes('stranger things') && (title.includes('temporada final') || title.includes('(5)') || poster.includes('1618005182384'))) return false;
      if (title.includes('homem-aranha') && title.includes('novo dia')) return false;
      if (m.tmdbId === 969681) return false;
      return true;
    }) : INITIAL_MOVIES;
    
    // Mapa de filmes iniciais por ID e Título em minúsculas para cura de imagens
    const initialMap = new Map<string, Movie>();
    INITIAL_MOVIES.forEach(im => {
      if (im.id) initialMap.set(im.id, im);
      if (im.title) initialMap.set(im.title.trim().toLowerCase(), im);
    });

    const isBrokenUrl = (url?: string) => {
      if (!url || typeof url !== 'string' || url.trim() === '') return true;
      if (url.startsWith('http:')) return true;
      if (url.includes('photo-1536440136628-849c177e76a1') || url.includes('photo-1489599849927-2ee91cede3ba')) return true;
      return isBrokenImageUrl(url);
    };

    // Remove qualquer duplicata histórica persistida no localStorage
    const uniqueMovies: Movie[] = [];
    const seen = new Set<string>();
    for (const m of base) {
      if (!m) continue;
      const type = m.type || 'movie';
      const yearStr = m.year ? `_${String(m.year).trim()}` : '';
      const key = m.tmdbId 
        ? `tmdb_${m.tmdbId}_${type}` 
        : `title_${(m.title || '').trim().toLowerCase()}${yearStr}_${type}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueMovies.push(m);
      }
    }

    const sanitized = uniqueMovies.map((m: Movie, idx: number) => {
      const seed = (m.title?.length || 10) + idx * 7;
      const rating = m.rating || 7.5;
      const voteCount = m.tmdbVoteCount || (1200 + (seed * 37) % 3500);
      const calculatedLikes = Math.round((rating / 10) * voteCount);
      const calculatedDislikes = Math.round(((10 - rating) / 10) * voteCount * 0.25);

      const matchingInit = initialMap.get(m.id) || initialMap.get((m.title || '').trim().toLowerCase());

      let posterUrl = getCleanPosterUrl(m.posterUrl);
      let backdropUrl = getCleanBackdropUrl(m.backdropUrl, m.posterUrl);

      if (isBrokenUrl(posterUrl) && matchingInit) {
        posterUrl = getCleanPosterUrl(matchingInit.posterUrl);
      }
      if (isBrokenUrl(backdropUrl) && matchingInit) {
        backdropUrl = getCleanBackdropUrl(matchingInit.backdropUrl, matchingInit.posterUrl);
      }

      return {
        ...m,
        posterUrl,
        backdropUrl,
        clicksCount: m.clicksCount !== undefined ? m.clicksCount : (100 + (seed * 19) % 850),
        votesLikes: m.votesLikes !== undefined && m.votesLikes > 0 ? m.votesLikes : calculatedLikes,
        votesDislikes: m.votesDislikes !== undefined && m.votesDislikes > 0 ? m.votesDislikes : calculatedDislikes,
        tmdbVoteCount: m.tmdbVoteCount || voteCount
      };
    });

    // Atualizar localStorage para persistir a correção
    try {
      localStorage.setItem('vhsflix_movies', JSON.stringify(sanitized));
    } catch (e) {
      console.warn('Erro ao atualizar localStorage com filmes corrigidos:', e);
    }

    return sanitized;
  });

  const [tmdbApiKey, setTmdbApiKey] = useState<string>(() => {
    return localStorage.getItem('vhsflix_tmdb_key') || '9ba478ffe785bbc34fa2b10c46296580';
  });

  const [abyssApiKey, setAbyssApiKey] = useState<string>(() => {
    return localStorage.getItem('vhsflix_abyss_key') || '';
  });

  const handleUpdateAbyssApiKey = (key: string) => {
    setAbyssApiKey(key);
    localStorage.setItem('vhsflix_abyss_key', key);
  };

  const [adguardEnabled, setAdguardEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('vhsflix_adguard_enabled');
    return saved ? JSON.parse(saved) : true;
  });

  const [pinnedMostDesiredMovieId, setPinnedMostDesiredMovieId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('vhsflix_pinned_most_desired') || null;
    } catch (e) {
      return null;
    }
  });

  const handleTogglePinMostDesired = async (movieId: string | null) => {
    const newPinnedId = (pinnedMostDesiredMovieId === movieId || !movieId) ? null : movieId;
    setPinnedMostDesiredMovieId(newPinnedId);
    if (newPinnedId) {
      localStorage.setItem('vhsflix_pinned_most_desired', newPinnedId);
    } else {
      localStorage.removeItem('vhsflix_pinned_most_desired');
    }
    await saveSettingsToFirestore(adguardEnabled, newPinnedId);
  };

  // Perfis ativos atuais
  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    const isLoggedIn = localStorage.getItem('vhs_session_logged_in') === 'true';
    return isLoggedIn ? (localStorage.getItem('vhsflix_current_uid') || '') : '';
  });

  const [currentProfileId, setCurrentProfileId] = useState<string | null>(() => {
    const isLoggedIn = localStorage.getItem('vhs_session_logged_in') === 'true';
    return isLoggedIn ? (localStorage.getItem('vhsflix_current_pid') || null) : null;
  });

  // Abas de navegação do usuário na plataforma
  const [activeTab, setActiveTab] = useState<'all' | 'releases' | 'movies' | 'series' | 'mylist' | 'requests' | 'support'>('all');
  const [myListViewMode, setMyListViewMode] = useState<'grid' | 'vertical_list' | 'carousel'>(() => (localStorage.getItem('vhsflix_mylist_view') as any) || 'vertical_list');
  const [myListTypeFilter, setMyListTypeFilter] = useState<'all' | 'movies' | 'series'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isAdminView, setIsAdminView] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [searchVal, setSearchVal] = useState('');

  const [dbNotifications, setDbNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem('vhsflix_db_notifications');
    return saved ? JSON.parse(saved) : [];
  });
  const [readNotifications, setReadNotifications] = useState<string[]>(() => {
    const saved = localStorage.getItem('vhsflix_read_notifications');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('vhsflix_read_notifications', JSON.stringify(readNotifications));
  }, [readNotifications]);

  const notifications = useMemo(() => {
    return dbNotifications.map(notif => ({
      ...notif,
      isRead: readNotifications.includes(notif.id)
    }));
  }, [dbNotifications, readNotifications]);

  // Toast e sistema alertador de novas notificações na tela
  const [toast, setToast] = useState<AppNotification | null>(null);

  // Pedidos de filmes e séries
  const [requests, setRequests] = useState<MovieRequest[]>(() => {
    const saved = localStorage.getItem('vhsflix_movie_requests');
    if (saved) return JSON.parse(saved);
    return [];
  });

  // Comentários nos filmes/séries (Sincronização em nuvem e LocalStorage offline)
  const [comments, setComments] = useState<MovieComment[]>(() => {
    try {
      const saved = localStorage.getItem('vhsflix_movie_comments');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Erro ao restaurar comentários do localStorage:', e);
    }
    return [];
  });

  // Gatilho global para disparar uma nova notificação e mostrá-la no carrossel de popups/toast alertadores
  const triggerNotification = (title: string, message: string, movieId: string, type: 'movie' | 'series' | 'system', posterUrl?: string) => {
    const newNotif: AppNotification = {
      id: 'notif_' + Date.now() + Math.random().toString(36).substring(2, 7),
      title,
      message,
      movieId,
      createdAt: new Date().toISOString(),
      isRead: false,
      type,
      posterUrl
    };
    setDbNotifications(prev => [newNotif, ...prev]);
    setToast(newNotif);
    // Sincroniza a notificação diretamente no Firestore
    saveSingleNotificationToFirestore(newNotif);
  };

  // Forçar atualização e limpar cache em todos os dispositivos
  const handlePublishUpdate = () => {
    const newVersion = Date.now();
    setDoc(doc(db, 'settings', 'global'), { id: 'global', adguardEnabled, systemVersion: newVersion }, { merge: true });
    localStorage.setItem('vhsflix_system_version', String(newVersion));
  };

  // Limpeza global de restrições CSP no DOM para garantir compatibilidade com provedores de streaming externos (ex: myembed.biz)
  useEffect(() => {
    const removeCspMetaTags = () => {
      const cspMetas = document.querySelectorAll('meta[http-equiv="Content-Security-Policy" i], meta[http-equiv="content-security-policy" i]');
      cspMetas.forEach((meta) => {
        try {
          meta.parentNode?.removeChild(meta);
        } catch (e) {
          console.warn('[CSP Cleanup] Erro ao remover meta tag CSP:', e);
        }
      });
    };

    // Executa imediatamente no carregamento
    removeCspMetaTags();

    // Observador para interceptar e remover dinamicamente qualquer meta tag CSP injetada no DOM
    const observer = new MutationObserver(() => {
      removeCspMetaTags();
    });

    if (document.head) {
      observer.observe(document.head, { childList: true, subtree: true });
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  // Timer para sumir com o toast de notificação da tela automaticamente após alguns segundos
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 8500);
    return () => clearTimeout(timer);
  }, [toast]);

  // --- CENTRAL SYNCHRONIZATION WITH CLOUD FIRESTORE & LOCAL FALLBACKS ---
  const isLoadedRef = useRef(false);

  useEffect(() => {
    isLoadedRef.current = true;

    // 1. Escuta em tempo real a coleção de usuários
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const fetchedUsers: User[] = [];
      snapshot.forEach((doc) => {
        fetchedUsers.push(doc.data() as User);
      });
      if (fetchedUsers.length === 0) {
        // Se estiver vazio, popula com os usuários padrão do sistema
        saveUsersToFirestore(INITIAL_USERS);
      } else {
        setUsers(fetchedUsers);
      }
    }, (err) => console.warn('[FIRESTORE] users listener warning:', err));

    // 2. Escuta em tempo real a coleção de perfis com mesclagem segura
    const unsubProfiles = onSnapshot(collection(db, 'profiles'), (snapshot) => {
      const fetchedProfiles: { [userId: string]: Profile[] } = {};
      let hasData = false;
      snapshot.forEach((docSnap) => {
        hasData = true;
        const data = docSnap.data();
        if (data.userId && data.profiles && Array.isArray(data.profiles) && data.profiles.length > 0) {
          const valid = data.profiles.filter((p: Profile) => p.name !== 'Crianças VHS' && p.id !== 'p1_2');
          const cleanProfs = valid.length > 0 ? valid : data.profiles;
          fetchedProfiles[data.userId] = cleanProfs.map((p: any) => ({
            id: String(p.id || 'p_' + Date.now()),
            name: String(p.name || 'Meu Perfil'),
            avatarUrl: p.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
            myList: Array.isArray(p.myList) ? p.myList.map(String) : [],
            watchHistory: p.watchHistory || {}
          }));
        }
      });

      if (!hasData) {
        // Se estiver vazio, popula com os perfis padrão
        saveProfilesToFirestore(DEFAULT_PROFILES);
      } else {
        setAllProfiles(prev => {
          // Mesclagem segura: preserva filmes adicionados à lista localmente se o snapshot for antigo
          const merged: { [userId: string]: Profile[] } = { ...fetchedProfiles };
          (Object.entries(prev) as [string, Profile[]][]).forEach(([uid, localList]) => {
            if (!merged[uid]) {
              merged[uid] = localList;
            } else {
              merged[uid] = merged[uid].map(remP => {
                const locP = localList.find(lp => lp.id === remP.id);
                if (locP) {
                  const remList = Array.isArray(remP.myList) ? remP.myList : [];
                  const locList = Array.isArray(locP.myList) ? locP.myList : [];
                  const combined = Array.from(new Set([...remList, ...locList].map(String)));
                  return {
                    ...remP,
                    myList: combined,
                    watchHistory: { ...(locP.watchHistory || {}), ...(remP.watchHistory || {}) }
                  };
                }
                return remP;
              });
            }
          });
          try {
            localStorage.setItem('vhsflix_profiles', JSON.stringify(merged));
          } catch (e) {
            console.warn('Erro ao atualizar localStorage com perfis:', e);
          }
          return merged;
        });
      }
    }, (err) => console.warn('[FIRESTORE] profiles listener warning:', err));

    // 3. Escuta em tempo real a coleção de filmes/séries (catálogo)
    const unsubMovies = onSnapshot(collection(db, 'movies'), (snapshot) => {
      const fetchedMovies: Movie[] = [];
      snapshot.forEach((docSnap) => {
        const rawMovie = docSnap.data() as Movie;
        // Filtrar qualquer resquício ou adição incorreta de tmdb_trend_ ou títulos indesejados
        if (docSnap.id.startsWith('tmdb_trend_')) return;
        const title = (rawMovie.title || '').toLowerCase();
        const poster = (rawMovie.posterUrl || '').toLowerCase();
        if (title.includes('stranger things') && (title.includes('temporada final') || title.includes('(5)') || poster.includes('1618005182384'))) return;
        if (title.includes('homem-aranha') && title.includes('novo dia')) return;
        if (rawMovie.tmdbId === 969681) return;

        const cleanPoster = getCleanPosterUrl(rawMovie.posterUrl);
        const cleanBackdrop = getCleanBackdropUrl(rawMovie.backdropUrl, rawMovie.posterUrl);

        const sanitizedMovie = {
          ...rawMovie,
          posterUrl: cleanPoster,
          backdropUrl: cleanBackdrop
        };
        fetchedMovies.push(sanitizedMovie);
      });
      if (fetchedMovies.length === 0) {
        // Se o catálogo estiver vazio, verificamos no settings/global se já foi inicializado anteriormente
        getDoc(doc(db, 'settings', 'global')).then((settingsSnap) => {
          const isInit = settingsSnap.exists() && settingsSnap.data()?.catalogInitialized === true;
          if (!isInit) {
            // Se realmente nunca foi inicializado na nuvem, popula com os filmes padrão
            saveMoviesToFirestore(INITIAL_MOVIES);
            setDoc(doc(db, 'settings', 'global'), { catalogInitialized: true }, { merge: true });
          } else {
            // Se já foi inicializado antes e agora está vazio, respeita a exclusão total do admin
            setMovies([]);
          }
        }).catch((err) => {
          console.error('[VHSFLIX] Erro ao consultar inicialização do catálogo:', err);
          setMovies([]);
        });
      } else {
        setMovies(fetchedMovies);
      }
    }, (err) => console.warn('[FIRESTORE] movies listener warning:', err));

    // 4. Escuta em tempo real as configurações gerais (Adguard + Versionamento de Cache)
    const unsubSettings = onSnapshot(collection(db, 'settings'), (snapshot) => {
      let adguard = true;
      let hasData = false;
      snapshot.forEach((doc) => {
        if (doc.id === 'global') {
          hasData = true;
          const data = doc.data();
          if (data.adguardEnabled !== undefined) {
            adguard = data.adguardEnabled;
          }
          if (data.pinnedMostDesiredId !== undefined) {
            setPinnedMostDesiredMovieId(data.pinnedMostDesiredId || null);
          }
          
          // Mecanismo Inteligente de Limpeza de Cache & Versionamento por Sinal de Rádio
          if (data.systemVersion !== undefined) {
            const currentClientVersion = Number(localStorage.getItem('vhsflix_system_version') || '0');
            const serverVersion = Number(data.systemVersion);
            
            if (currentClientVersion > 0 && serverVersion > currentClientVersion) {
              console.log(`[VHSFLIX] SINAL DE ATUALIZAÇÃO RECEBIDO! Sincronizando para a versão ${serverVersion}.`);
              localStorage.setItem('vhsflix_system_version', String(serverVersion));
              
              // Limpar todos os caches de HTTP e Service Workers de forma agressiva
              if (window.caches) {
                caches.keys().then((names) => {
                  for (const name of names) {
                    caches.delete(name);
                  }
                });
              }
              if (navigator.serviceWorker) {
                navigator.serviceWorker.getRegistrations().then((registrations) => {
                  for (const r of registrations) {
                    r.unregister();
                  }
                });
              }
              
              // Recarrega a página de forma limpa
              setTimeout(() => {
                window.location.reload();
              }, 1200);
            } else if (currentClientVersion === 0) {
              localStorage.setItem('vhsflix_system_version', String(serverVersion));
            }
          }
        }
      });
      if (!hasData) {
        setDoc(doc(db, 'settings', 'global'), { id: 'global', adguardEnabled: true, systemVersion: Date.now() }, { merge: true });
      } else {
        setAdguardEnabled(adguard);
      }
    }, (err) => console.warn('[FIRESTORE] settings listener warning:', err));

    // 5. Escuta em tempo real os pedidos dos usuários
    const unsubRequests = onSnapshot(collection(db, 'requests'), (snapshot) => {
      const fetchedRequests: MovieRequest[] = [];
      snapshot.forEach((doc) => {
        fetchedRequests.push(doc.data() as MovieRequest);
      });
      // Ordenar por data de criação de forma decrescente
      fetchedRequests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setRequests(fetchedRequests);
    }, (err) => console.warn('[FIRESTORE] requests listener warning:', err));

    // 6. Escuta em tempo real as notificações
    const unsubNotifications = onSnapshot(collection(db, 'notifications'), (snapshot) => {
      const fetchedNotifs: AppNotification[] = [];
      snapshot.forEach((doc) => {
        fetchedNotifs.push(doc.data() as AppNotification);
      });
      // Ordenar por data de criação de forma decrescente
      fetchedNotifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setDbNotifications(fetchedNotifs);
    }, (err) => console.warn('[FIRESTORE] notifications listener warning:', err));

    // 7. Escuta em tempo real os comentários
    const unsubComments = onSnapshot(collection(db, 'comments'), (snapshot) => {
      const fetchedComments: MovieComment[] = [];
      snapshot.forEach((doc) => {
        fetchedComments.push(doc.data() as MovieComment);
      });
      fetchedComments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setComments(fetchedComments);
    }, (err) => console.warn('[FIRESTORE] comments listener warning:', err));

    return () => {
      unsubUsers();
      unsubProfiles();
      unsubMovies();
      unsubSettings();
      unsubRequests();
      unsubNotifications();
      unsubComments();
    };
  }, []);

  // --- EFEITOS DE SINCRONIZAÇÃO COM LOCALSTORAGE (100% OFFLINE E SEGURO) ---
  const [hasLoadedUsers, setHasLoadedUsers] = useState(true);
  const [hasLoadedProfiles, setHasLoadedProfiles] = useState(true);
  const [hasLoadedMovies, setHasLoadedMovies] = useState(true);
  const [hasLoadedRequests, setHasLoadedRequests] = useState(true);
  const [hasLoadedSettings, setHasLoadedSettings] = useState(true);

  // Synchronize state changes to LocalStorage with debouncing for high performance
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('vhsflix_users', JSON.stringify(users));
    }, 500);
    return () => clearTimeout(timer);
  }, [users]);

  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('vhsflix_profiles', JSON.stringify(allProfiles));
    }, 500);
    return () => clearTimeout(timer);
  }, [allProfiles]);

  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('vhsflix_movies', JSON.stringify(movies));
    }, 1000);
    return () => clearTimeout(timer);
  }, [movies]);

  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('vhsflix_movie_requests', JSON.stringify(requests));
    }, 500);
    return () => clearTimeout(timer);
  }, [requests]);

  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('vhsflix_movie_comments', JSON.stringify(comments));
    }, 500);
    return () => clearTimeout(timer);
  }, [comments]);

  useEffect(() => {
    localStorage.setItem('vhsflix_adguard_enabled', JSON.stringify(adguardEnabled));
  }, [adguardEnabled]);

  useEffect(() => {
    localStorage.setItem('vhsflix_db_notifications', JSON.stringify(dbNotifications));
  }, [dbNotifications]);

  useEffect(() => {
    localStorage.setItem('vhsflix_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('vhsflix_tmdb_key', tmdbApiKey);
  }, [tmdbApiKey]);

  // --- OFFLINE STATE HANDLERS (AUTOMATIC LOCALSTORAGE SAVING) ---

  useEffect(() => {
    localStorage.setItem('vhsflix_mylist_view', myListViewMode);
  }, [myListViewMode]);

  useEffect(() => {
    localStorage.setItem('vhsflix_current_uid', currentUserId);
  }, [currentUserId]);

  useEffect(() => {
    if (currentProfileId) {
      localStorage.setItem('vhsflix_current_pid', currentProfileId);
    } else {
      localStorage.removeItem('vhsflix_current_pid');
    }
  }, [currentProfileId]);

  // Efetuador de Migração automática segura e não destrutiva se houver dados antigos
  useEffect(() => {
    const hasOldGens = movies.some(m => m.category === 'Clássicos 80s' || m.category === 'Ação Retro');
    if (hasOldGens) {
      setMovies(prev => prev.map(m => {
        if (m.category === 'Clássicos 80s') {
          return { ...m, category: 'Drama' };
        }
        if (m.category === 'Ação Retro') {
          return { ...m, category: 'Ação' };
        }
        return m;
      }));
    }
  }, []);

  // --- BUSCADORES AUXILIARES ---
  const activeUser = useMemo(() => {
    if (!currentUserId) return null;
    return users.find(u => u.id === currentUserId) || null;
  }, [users, currentUserId]);

  const isUserExpired = useMemo(() => {
    if (!currentUserId) return false;
    return activeUser && !activeUser.isAdmin && getSubscriptionDaysLeft(activeUser) <= 0;
  }, [activeUser, currentUserId]);

  // Alerta automático quando faltar 5 dias ou menos para o vencimento do sinal
  useEffect(() => {
    if (activeUser && !activeUser.isAdmin) {
      const daysLeft = getSubscriptionDaysLeft(activeUser);
      if (daysLeft > 0 && daysLeft <= 5) {
        const sessionKey = `warned_expiry_${activeUser.id}_${daysLeft}`;
        const alreadyWarned = sessionStorage.getItem(sessionKey);
        
        if (!alreadyWarned) {
          triggerNotification(
            '⚠️ Assinatura Vencendo!',
            `Faltam apenas ${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'} para o vencimento do seu sinal VHSFLIX! Entre em contato com Rafael Gusmão para renovar e não perder o acesso.`,
            '',
            'system'
          );
          sessionStorage.setItem(sessionKey, 'true');
        }
      }
    }
  }, [activeUser]);

  // Efeito para garantir que todo usuário tenha ao menos 1 perfil criado
  useEffect(() => {
    if (!currentUserId) return;

    const userObj = users.find(u => u.id === currentUserId);
    const userProfs = allProfiles[currentUserId] || [];

    if (userProfs.length === 0) {
      // Cria 1 perfil inicial para o usuário com o nome e avatar da conta
      const newProf: Profile = {
        id: 'p_' + Date.now(),
        name: userObj ? userObj.name.split(' ')[0] : 'Meu Perfil',
        avatarUrl: userObj?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
        myList: [],
        watchHistory: {}
      };
      setAllProfiles(prev => {
        const updated = { ...prev, [currentUserId]: [newProf] };
        saveProfilesToFirestore({ [currentUserId]: [newProf] });
        return updated;
      });
    }
  }, [currentUserId, allProfiles, users]);

  const activeProfile = useMemo(() => {
    if (!currentUserId) return null;
    const userProfs = allProfiles[currentUserId] || [];
    if (userProfs.length === 0) return null;
    if (currentProfileId) {
      const found = userProfs.find(p => p.id === currentProfileId);
      if (found) return found;
    }
    return userProfs[0] || null;
  }, [allProfiles, currentUserId, currentProfileId]);

  // Escolhe o filme em grande plano (Hero Banner)
  const [activeHighlightIndex, setActiveHighlightIndex] = useState(0);

  const featuredHighlights = useMemo(() => {
    if (movies.length === 0) return [];
    
    // Semente diária baseada no dia (ano, mês e dia) para alterar a ordem diariamente
    const today = new Date();
    const daySeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    
    // Gerador determinístico de números pseudo-aleatórios com semente diária
    const pseudoRandom = (seed: number) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };

    const currentYear = new Date().getFullYear();

    // 1. Lançamentos do ano atual ou recentes (2026+) tanto de filmes quanto de séries
    const releases = movies.filter(m => m.year >= currentYear);
    
    // 2. Destaques marcados explicitamente no painel admin (isFeatured)
    const explicitFeatured = movies.filter(m => m.isFeatured);
    
    // 3. Fitas mais desejadas / acessadas (ordenadas por cliques/avaliação)
    const mostDesired = [...movies].sort((a, b) => {
      const clicksA = a.clicksCount || 0;
      const clicksB = b.clicksCount || 0;
      if (clicksB !== clicksA) return clicksB - clicksA;
      return (b.rating || 0) - (a.rating || 0);
    }).slice(0, 10);

    // 4. Representante de cada categoria do acervo para garantir diversidade
    const categoryMap = new Map<string, Movie[]>();
    movies.forEach(m => {
      if (!categoryMap.has(m.category)) categoryMap.set(m.category, []);
      categoryMap.get(m.category)!.push(m);
    });
    
    const categorySamples: Movie[] = [];
    categoryMap.forEach(catMovies => {
      if (catMovies.length > 0) categorySamples.push(catMovies[0]);
    });

    // Agrupa todos os candidatos em um mapa único sem duplicatas
    const poolMap = new Map<string, Movie>();
    releases.forEach(m => poolMap.set(m.id, m));
    explicitFeatured.forEach(m => poolMap.set(m.id, m));
    mostDesired.forEach(m => poolMap.set(m.id, m));
    categorySamples.forEach(m => poolMap.set(m.id, m));
    // Inclui todos os outros itens disponíveis no catálogo para permitir rolagem rica e abrangente
    movies.forEach(m => poolMap.set(m.id, m));

    const pool = Array.from(poolMap.values());

    // Separar em filmes e séries para intercalar com equilíbrio
    const poolMovies = pool.filter(m => m.type === 'movie');
    const poolSeries = pool.filter(m => m.type === 'series');

    // Função de embaralhamento com semente diária
    const seededShuffle = <T,>(arr: T[], seed: number): T[] => {
      const result = [...arr];
      let s = seed;
      for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(pseudoRandom(s++) * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
      }
      return result;
    };

    const shuffledMovies = seededShuffle(poolMovies, daySeed);
    const shuffledSeries = seededShuffle(poolSeries, daySeed + 500);

    // Intercalar Filme 1, Série 1, Filme 2, Série 2...
    const interleaved: Movie[] = [];
    const maxLen = Math.max(shuffledMovies.length, shuffledSeries.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < shuffledMovies.length) interleaved.push(shuffledMovies[i]);
      if (i < shuffledSeries.length) interleaved.push(shuffledSeries[i]);
    }

    return interleaved.length > 0 ? interleaved : movies;
  }, [movies]);

  // Escolhe um ponto de partida diferente a cada nova entrada/abertura do site
  useEffect(() => {
    if (featuredHighlights.length > 0) {
      const randomIndex = Math.floor(Math.random() * featuredHighlights.length);
      setActiveHighlightIndex(randomIndex);
    }
  }, [featuredHighlights.length]);

  // Filme atualmente focado no carrossel do Banner
  const featuredMovie = useMemo(() => {
    if (featuredHighlights.length === 0) return null;
    return featuredHighlights[activeHighlightIndex % featuredHighlights.length] || featuredHighlights[0];
  }, [featuredHighlights, activeHighlightIndex]);

  const [tmdbTrendingList, setTmdbTrendingList] = useState<any[]>([]);
  const [tmdbTrendingType, setTmdbTrendingType] = useState<'movie' | 'tv'>('movie');
  const [currentTrendingIndex, setCurrentTrendingIndex] = useState<number>(0);

  // Carrega em segundo plano as tendências reais de hoje do TMDB (Filmes ou Séries)
  useEffect(() => {
    let isMounted = true;
    getTMDBTrendingContent(tmdbApiKey, tmdbTrendingType).then(results => {
      if (isMounted && Array.isArray(results) && results.length > 0) {
        setTmdbTrendingList(results);

        // Atualiza estatísticas reais de curtidas e audiência do TMDB nos títulos do acervo
        setMovies(prev => {
          let updated = false;
          const next = prev.map(m => {
            const isTvTrending = tmdbTrendingType === 'tv';
            const isSameType = isTvTrending ? (m.type === 'series') : (m.type !== 'series');
            if (!isSameType) return m;

            const normM = (m.title || '').toLowerCase().trim();
            const match = results.find(r => {
              const rTitle = (r.title || r.name || '').toLowerCase().trim();
              if (r.id && m.tmdbId === r.id && normM === rTitle) return true;
              return normM && rTitle && normM === rTitle;
            });
            if (match && match.vote_count) {
              const tmdbLikes = Math.round(((match.vote_average || 8) / 10) * match.vote_count);
              const tmdbDislikes = Math.round(((10 - (match.vote_average || 8)) / 10) * match.vote_count * 0.25);
              if (m.votesLikes !== tmdbLikes || m.votesDislikes !== tmdbDislikes || m.tmdbVoteCount !== match.vote_count) {
                updated = true;
                return {
                  ...m,
                  votesLikes: tmdbLikes,
                  votesDislikes: tmdbDislikes,
                  tmdbVoteCount: match.vote_count
                };
              }
            }
            return m;
          });
          return updated ? next : prev;
        });
      }
    }).catch(err => console.warn('[TMDB] Erro ao carregar tendências:', err));
    return () => { isMounted = false; };
  }, [tmdbApiKey, tmdbTrendingType]);

  // Lista dos Top 10 Filmes ou Séries em Tendência no TMDB convertidos para objetos Movie
  const tmdbTrendingContentList = useMemo<Movie[]>(() => {
    if (!tmdbTrendingList || tmdbTrendingList.length === 0) return [];

    const normalizeText = (t?: string) => {
      if (!t) return '';
      return t.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "")
        .trim();
    };

    return tmdbTrendingList
      .slice(0, 10)
      .map((item, idx) => {
        const isTv = tmdbTrendingType === 'tv' || item.media_type === 'tv' || Boolean(item.name);
        const title = item.title || item.name || `Tendência #${idx + 1}`;
        const releaseDate = item.release_date || item.first_air_date || '2026';
        const year = parseInt(releaseDate.substring(0, 4)) || new Date().getFullYear();
        const normTitle = normalizeText(title);

        // Se o título do TMDB já existir no acervo cadastrado, vincula a fita existente garantindo que seja do mesmo tipo (filme ou série) e com título condizente
        const catalogMatch = movies.find(m => {
          const isSameType = isTv ? (m.type === 'series') : (m.type !== 'series');
          if (!isSameType) return false;
          const normM = normalizeText(m.title);
          if (item.id && m.tmdbId === item.id && normM && normTitle && normM === normTitle) return true;
          return Boolean(normM && normTitle && normM === normTitle);
        });

        if (catalogMatch) {
          return {
            ...catalogMatch,
            trendingRank: idx + 1
          } as Movie & { trendingRank?: number };
        }

        const isRecommended = movies.some(m => Boolean(m.isRecommended) && (
          (isTv ? m.type === 'series' : m.type !== 'series') && (
            (item.id && (m.tmdbId === item.id || m.id === `tmdb_${item.id}`) && normalizeText(m.title) === normTitle) ||
            (normalizeText(m.title) && normTitle && (normalizeText(m.title) === normTitle))
          )
        ));

        return {
          id: `tmdb_trend_${item.id || idx}`,
          tmdbId: item.id,
          title: title,
          type: isTv ? 'series' : 'movie',
          category: isTv ? 'Séries' : 'Ação',
          year: year,
          rating: Number((item.vote_average || 8.2).toFixed(1)),
          duration: isTv ? 'Série TMDB' : 'Filme TMDB',
          posterUrl: getCleanPosterUrl(item.poster_path),
          backdropUrl: getCleanBackdropUrl(item.backdrop_path, item.poster_path),
          description: item.overview || 'Título em alta global no TMDB com grande audiência hoje.',
          trailerUrl: 'https://www.youtube.com/embed/CRRlbK5w8AE',
          isFeatured: idx === 0,
          isRecommended: isRecommended,
          clicksCount: item.vote_count || (2500 - idx * 100),
          votesLikes: Math.round((item.vote_average || 8) * 140),
          votesDislikes: 12,
          vhsTapeColor: isTv ? '#10b981' : '#00ff88',
          trendingRank: idx + 1
        } as Movie & { trendingRank?: number };
      });
  }, [tmdbTrendingList, tmdbTrendingType, movies]);

  // Fita em destaque atual (Navegação de 1 a 10 no TMDB)
  const currentTrendingMovie = useMemo(() => {
    // 1. MODO MANUAL: Prioridade se o Admin fixou uma fita específica e estamos no índice 0
    if (pinnedMostDesiredMovieId && currentTrendingIndex === 0) {
      const pinned = movies.find(m => m.id === pinnedMostDesiredMovieId);
      if (pinned) return pinned;
    }

    // 2. Título em alta do TMDB correspondente à posição atual (1 a 10)
    if (tmdbTrendingContentList && tmdbTrendingContentList.length > 0) {
      const safeIndex = Math.min(Math.max(0, currentTrendingIndex), tmdbTrendingContentList.length - 1);
      return tmdbTrendingContentList[safeIndex];
    }

    // 3. Fallback inicial seguro
    return movies.length > 0 ? movies[0] : null;
  }, [currentTrendingIndex, tmdbTrendingContentList, pinnedMostDesiredMovieId, movies]);

  // Alias para compatibilidade
  const mostDesejadaMovie = currentTrendingMovie;

  const isMostDesiredPinnedByAdmin = useMemo(() => {
    return Boolean(pinnedMostDesiredMovieId && movies.some(m => m.id === pinnedMostDesiredMovieId));
  }, [pinnedMostDesiredMovieId, movies]);

  // Filmes Lançamentos (Até 30 filmes ordenados por ano/data de lançamento mais recente)
  const moviesReleasesTop30 = useMemo(() => {
    return movies.filter(m => m.type === 'movie').sort(sortByReleaseYear).slice(0, 30);
  }, [movies]);

  // Séries Lançamentos (Até 30 séries ordenadas por ano/data de lançamento mais recente)
  const seriesReleasesTop30 = useMemo(() => {
    return movies.filter(m => m.type === 'series').sort(sortByReleaseYear).slice(0, 30);
  }, [movies]);

  // 10 VHS Recém Adicionados (Ordenado estritamente por ordem de adição no admin)
  const recentlyAddedMoviesTop10 = useMemo(() => {
    return [...movies].sort((a, b) => getMovieAdditionWeight(b) - getMovieAdditionWeight(a)).slice(0, 10);
  }, [movies]);

  // Títulos com Selo Oficial de Recomendação concedido pelo Administrador Rafael
  const recommendedMovies = useMemo(() => {
    return movies.filter(m => Boolean(m.isRecommended)).sort(sortByReleaseYear);
  }, [movies]);

  // Transição automática das fitas de destaque rotativas a cada 10 segundos
  useEffect(() => {
    if (featuredHighlights.length <= 1) return;
    const interval = setInterval(() => {
      setActiveHighlightIndex(prev => (prev + 1) % featuredHighlights.length);
    }, 10000);
    return () => clearInterval(interval);
  }, [featuredHighlights]);

  // --- BUSCADOR AUTOMÁTICO DE TENDÊNCIAS TMDB (LANÇAMENTOS DO ANO CORRENTE) ---
  // DESATIVADO: Apenas filmes e séries adicionados manualmente pelo administrador entram no acervo
  useEffect(() => {
    // Sincronização automática desativada para manter o controle exclusivo do acervo com você
  }, [tmdbApiKey]);

  // Filtra catálogo com base em busca, abas e categorias, sempre ordenado por ano de lançamento
  const filteredMovies = useMemo(() => {
    let list = [...movies];
    
    // Filtro por termo de busca
    if (searchVal.trim()) {
      const q = searchVal.toLowerCase();
      list = list.filter(m => 
        m.title.toLowerCase().includes(q) || 
        m.description.toLowerCase().includes(q) || 
        m.category.toLowerCase().includes(q)
      );
    }

    // Filtros por abas
    if (activeTab === 'releases') {
      list = list.filter(isReleaseMedia);
    } else if (activeTab === 'movies') {
      list = list.filter(m => m.type === 'movie');
    } else if (activeTab === 'series') {
      list = list.filter(m => m.type === 'series');
    } else if (activeTab === 'mylist' && activeProfile) {
      const savedList = Array.isArray(activeProfile.myList) ? activeProfile.myList : [];
      list = list.filter(m => savedList.some(id => String(id) === String(m.id) || (m.tmdbId && String(id) === `tmdb_${m.tmdbId}`)));
    }

    // Filtro por categoria selecionada
    if (selectedCategory) {
      if (selectedCategory === 'Séries') {
        list = list.filter(m => m.type === 'series');
      } else if (selectedCategory === 'Animes' || selectedCategory === 'Anime') {
        list = list.filter(m => 
          m.category === 'Animes' || 
          m.category === 'Anime' || 
          m.category?.toLowerCase().includes('anime') || 
          (m.genres && m.genres.some(g => g.toLowerCase().includes('anime'))) ||
          m.title.toLowerCase().includes('anime') ||
          m.title.toLowerCase().includes('dragon ball') ||
          m.title.toLowerCase().includes('naruto') ||
          m.title.toLowerCase().includes('one piece') ||
          m.title.toLowerCase().includes('solo leveling') ||
          m.title.toLowerCase().includes('attack on titan') ||
          m.title.toLowerCase().includes('demon slayer')
        );
      } else if (selectedCategory !== 'Todos') {
        list = list.filter(m => m.category === selectedCategory);
      }
    }

    // Ordenação estrita por Ano de Lançamento (mais recentes primeiro)
    list.sort(sortByReleaseYear);

    return list;
  }, [movies, activeTab, activeProfile, searchVal, selectedCategory]);

  // Paginação moderna de 50 em 50 títulos (Lançamentos, Filmes, Séries, Início, Busca e Categorias)
  const ITEMS_PER_CATALOG_PAGE = 50;
  const [catalogPage, setCatalogPage] = useState(1);
  const catalogGridTopRef = useRef<HTMLDivElement>(null);

  // Sincronização automática: reseta para a página 1 ao trocar de aba, realizar buscas ou selecionar categorias
  useEffect(() => {
    setCatalogPage(1);
  }, [activeTab, searchVal, selectedCategory]);

  const totalCatalogPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredMovies.length / ITEMS_PER_CATALOG_PAGE));
  }, [filteredMovies.length]);

  // Garante integridade se a página atual ultrapassar o total de páginas existentes
  useEffect(() => {
    if (catalogPage > totalCatalogPages && totalCatalogPages > 0) {
      setCatalogPage(1);
    }
  }, [catalogPage, totalCatalogPages]);

  // Fatiamento dos filmes para renderizar de 50 em 50 itens
  const paginatedCatalogMovies = useMemo(() => {
    const start = (catalogPage - 1) * ITEMS_PER_CATALOG_PAGE;
    return filteredMovies.slice(start, start + ITEMS_PER_CATALOG_PAGE);
  }, [filteredMovies, catalogPage]);

  // Navegação suave com transição ao topo do catálogo
  const handleCatalogPageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalCatalogPages) return;
    setCatalogPage(newPage);
    if (catalogGridTopRef.current) {
      const yOffset = -90;
      const y = catalogGridTopRef.current.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    }
  };

  const handleSelectCategory = (category: string | null) => {
    setSelectedCategory(category);
    setActiveTab('all');
    setIsAdminView(false);
  };

  // --- TRATADORES DE CALLBACKS DO PERFIL ---
  const handleSelectUser = (userId: string) => {
    setCurrentUserId(userId);
    setCurrentProfileId(null); // Reseta perfil para escolher
    setIsAdminView(false);
    if (userId) {
      localStorage.setItem('vhsflix_current_uid', userId);
      localStorage.setItem('vhs_session_logged_in', 'true');
    } else {
      localStorage.removeItem('vhsflix_current_uid');
      localStorage.removeItem('vhsflix_current_pid');
      localStorage.removeItem('vhs_session_logged_in');
    }
  };

  const handleAddUser = (name: string, email: string, password: string, isAdmin: boolean, avatarUrl?: string): string | null => {
    const emailLower = email.trim().toLowerCase();
    
    // Verifica duplicidade
    if (users.some(u => u.email.toLowerCase() === emailLower)) {
      return 'Este e-mail já está sendo utilizado por outra conta.';
    }

    const defaultAvatar = avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80';

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const newUser: User = {
      id: 'u_' + Date.now(),
      name,
      email: emailLower,
      password: password,
      isAdmin,
      avatarUrl: defaultAvatar,
      createdAt: new Date().toISOString(),
      subscriptionExpiresAt: isAdmin ? undefined : thirtyDaysFromNow.toISOString()
    };
    setUsers(prev => [...prev, newUser]);
    
    // Inicializa perfil padrão para o novo usuário
    const defaultProfile: Profile = {
      id: 'p_' + Date.now(),
      name: name.split(' ')[0],
      avatarUrl: defaultAvatar,
      myList: [],
      watchHistory: {}
    };
    
    setAllProfiles(prev => ({
      ...prev,
      [newUser.id]: [defaultProfile]
    }));

    // Sincroniza diretamente para o Firestore
    saveUsersToFirestore([newUser]);
    saveProfilesToFirestore({ [newUser.id]: [defaultProfile] });

    return null; // Sucesso
  };

  const handleEditUser = (userId: string, name: string, email: string, password?: string, isAdmin?: boolean, avatarUrl?: string, subscriptionExpiresAt?: string): string | null => {
    const emailLower = email.trim().toLowerCase();
    
    // Se o e-mail mudou, verifica duplicidade
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return 'Usuário não localizado.';

    if (targetUser.email.toLowerCase() !== emailLower && users.some(u => u.email.toLowerCase() === emailLower && u.id !== userId)) {
      return 'Este e-mail já está em uso por outro usuário.';
    }

    const updatedUser: User = {
      ...targetUser,
      name,
      email: emailLower,
      password: (password !== undefined && password.trim() !== '') ? password : targetUser.password,
      isAdmin: isAdmin !== undefined ? isAdmin : targetUser.isAdmin,
      avatarUrl: avatarUrl !== undefined ? avatarUrl : targetUser.avatarUrl,
      subscriptionExpiresAt: subscriptionExpiresAt !== undefined ? subscriptionExpiresAt : targetUser.subscriptionExpiresAt
    };

    setUsers(prev => prev.map(u => u.id === userId ? updatedUser : u));

    // Se o avatarUrl foi atualizado, também atualiza o perfil principal
    let updatedProfiles = allProfiles[userId] || [];
    if (avatarUrl) {
      updatedProfiles = updatedProfiles.map((p, idx) => idx === 0 ? { ...p, avatarUrl } : p);
      setAllProfiles(prev => ({
        ...prev,
        [userId]: updatedProfiles
      }));
    }

    // Sincroniza diretamente para o Firestore
    saveUsersToFirestore([updatedUser]);
    if (avatarUrl) {
      saveProfilesToFirestore({ [userId]: updatedProfiles });
    }

    return null; // Sucesso
  };

  const handleDeleteUser = (userId: string) => {
    // Rafael Gusmão (Master Admin) nunca pode ser apagado por segurança
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser || targetUser.email === 'rafaelguaruja09@gmail.com' || targetUser.id === 'u1') return;

    setUsers(prev => prev.filter(u => u.id !== userId));
    
    // Remove os perfis dele do estado
    setAllProfiles(prev => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });

    // Remove do Firestore de forma assíncrona
    deleteUserFromFirestore(userId);

    // Se o usuário excluído era o usuário atual logado, desloga
    if (currentUserId === userId) {
      setCurrentUserId(users[0]?.id || '');
      setCurrentProfileId(null);
    }
  };

  const handleSelectProfile = (profileId: string) => {
    setCurrentProfileId(profileId);
    setSearchVal('');
    setActiveTab('all');
  };

  const handleAddProfile = (name: string, avatarUrl: string) => {
    const newProf: Profile = {
      id: 'p_' + Date.now(),
      name,
      avatarUrl,
      myList: [],
      watchHistory: {}
    };
    setAllProfiles(prev => {
      const userList = prev[currentUserId] || [];
      return {
        ...prev,
        [currentUserId]: [...userList, newProf]
      };
    });
  };

  const handleDeleteProfile = (profileId: string) => {
    setAllProfiles(prev => {
      const userList = prev[currentUserId] || [];
      return {
        ...prev,
        [currentUserId]: userList.filter(p => p.id !== profileId)
      };
    });
  };

  const handleEditProfile = (profileId: string, name: string, avatarUrl: string) => {
    setAllProfiles(prev => {
      const userList = prev[currentUserId] || [];
      const updatedList = userList.map(p => p.id === profileId ? { ...p, name, avatarUrl } : p);
      saveProfilesToFirestore({ [currentUserId]: updatedList });
      return {
        ...prev,
        [currentUserId]: updatedList
      };
    });

    // Sincroniza foto e nome do perfil com a conta de usuário
    setUsers(prev => {
      const updatedUsers = prev.map(u => u.id === currentUserId ? { ...u, avatarUrl, name: name || u.name } : u);
      saveUsersToFirestore(updatedUsers);
      return updatedUsers;
    });
  };

  const handleLogoutProfile = () => {
    setCurrentProfileId(null);
    setCurrentUserId('');
    setIsAdminView(false);
    localStorage.removeItem('vhsflix_current_pid');
    localStorage.removeItem('vhsflix_current_uid');
    localStorage.removeItem('vhs_session_logged_in');
  };

  // --- TRATADORES DE LISTA E WATCH HISTORY (LOCALSTORAGE ENGINE & CLOUD FIRESTORE) ---
  const handleToggleMyList = (movieId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation(); // Evita abrir o modal se clicar no card
    const strMovieId = String(movieId).trim();
    if (!strMovieId) return;

    const targetUserId = currentUserId || users[0]?.id || 'u1';
    const userProfs = allProfiles[targetUserId] || [];
    const targetProfile = (currentProfileId ? userProfs.find(p => p.id === currentProfileId) : null) || userProfs[0];

    if (!targetProfile) {
      console.warn('[MyList] Nenhum perfil encontrado para alternar fita:', strMovieId);
      return;
    }

    const targetPid = targetProfile.id;

    setAllProfiles(prev => {
      const currentList = prev[targetUserId] || (targetProfile ? [targetProfile] : []);
      let targetFound = false;
      const updatedUserProfs = currentList.map(p => {
        if (p.id === targetPid) {
          targetFound = true;
          const currentMyList = Array.isArray(p.myList) ? p.myList.map(String) : [];
          const exists = currentMyList.some(id => String(id) === strMovieId);
          const nextMyList = exists 
            ? currentMyList.filter(id => String(id) !== strMovieId) 
            : [...currentMyList, strMovieId];
          return { ...p, myList: nextMyList };
        }
        return p;
      });

      if (!targetFound && currentList.length > 0) {
        const p = currentList[0];
        const currentMyList = Array.isArray(p.myList) ? p.myList.map(String) : [];
        const exists = currentMyList.some(id => String(id) === strMovieId);
        const nextMyList = exists 
          ? currentMyList.filter(id => String(id) !== strMovieId) 
          : [...currentMyList, strMovieId];
        updatedUserProfs[0] = { ...p, myList: nextMyList };
      }

      const nextAllProfiles = { ...prev, [targetUserId]: updatedUserProfs };

      // 1. Imediatamente salva de forma síncrona no LocalStorage
      try {
        localStorage.setItem('vhsflix_profiles', JSON.stringify(nextAllProfiles));
      } catch (err) {
        console.warn('Erro ao salvar perfis no LocalStorage:', err);
      }

      // 2. Imediatamente envia para a nuvem no Firestore
      saveProfilesToFirestore({ [targetUserId]: updatedUserProfs });

      return nextAllProfiles;
    });
  };

  const handleUpdateWatchProgress = (
    movieId: string, 
    progress: number, 
    currentTime: number, 
    duration: number, 
    isFinished: boolean,
    lastSeason?: number,
    lastEpisode?: number
  ) => {
    const targetUserId = currentUserId || users[0]?.id || 'u1';
    const userProfs = allProfiles[targetUserId] || [];
    const targetProfile = (currentProfileId ? userProfs.find(p => p.id === currentProfileId) : null) || userProfs[0];
    if (!targetProfile) return;
    const targetPid = targetProfile.id;

    setAllProfiles(prev => {
      const userList = prev[targetUserId] || [];
      const updatedList = userList.map(p => {
        if (p.id === targetPid) {
          const prevEntry = p.watchHistory?.[String(movieId)];
          const currentProgress: WatchProgress = {
            movieId: String(movieId),
            progress,
            currentTime,
            duration,
            updatedAt: new Date().toISOString(),
            isFinished,
            lastSeason: lastSeason !== undefined ? lastSeason : prevEntry?.lastSeason,
            lastEpisode: lastEpisode !== undefined ? lastEpisode : prevEntry?.lastEpisode
          };

          const nextHistory = { ...p.watchHistory };
          if (isFinished) {
            // Se concluiu a fita, marcamos como finalizado
            nextHistory[String(movieId)] = { ...currentProgress, progress: 100, isFinished: true };
          } else {
            nextHistory[String(movieId)] = currentProgress;
          }

          return { ...p, watchHistory: nextHistory };
        }
        return p;
      });

      const nextAll = { ...prev, [targetUserId]: updatedList };
      try {
        localStorage.setItem('vhsflix_profiles', JSON.stringify(nextAll));
      } catch (err) {
        console.warn('Erro ao salvar progresso no LocalStorage:', err);
      }

      if (isFinished) {
        saveProfilesToFirestore({ [targetUserId]: updatedList });
      }

      return nextAll;
    });
  };

  // --- TRATADORES DO PAINEL ADMIN CORADOS GERAIS ---
  const handleAddMovie = (newMovieData: Omit<Movie, 'id'>) => {
    // Permite adicionar qualquer título livremente ao acervo
    const newMovieId = 'm_' + Date.now();
    const newMovie: Movie = {
      ...newMovieData,
      id: newMovieId,
      abyssStatus: 'processing'
    };
    setMovies(prev => [newMovie, ...prev]);
    saveSingleMovieToFirestore(newMovie);

    // Gerar notificação automática toda vez que é adicionado um novo filme ou série no site
    const isSeries = newMovie.type === 'series';
    triggerNotification(
      isSeries ? '📺 Nova Série Adicionada!' : '📼 Novo Filme Adicionado!',
      `"${newMovie.title}" acaba de ser adicionado ao acervo retrô de ${newMovie.category}!`,
      newMovieId,
      isSeries ? 'series' : 'movie',
      newMovie.posterUrl
    );

    // Registrar fita automaticamente no Abyss via Netlify Function
    fetchApi('/.netlify/functions/abyss', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tmdbId: newMovie.tmdbId,
        type: newMovie.type,
        title: newMovie.title,
        apiKey: abyssApiKey || localStorage.getItem('vhsflix_abyss_key') || ''
      })
    })
    .then(res => {
      if (res.ok && res.data && res.data.success) {
        const data = res.data;
        setMovies(prev => prev.map(m => {
          if (m.id === newMovieId) {
            const updated = {
              ...m,
              abyssId: data.abyssId,
              abyssEmbedUrl: data.embedUrl,
              abyssStatus: data.status
            };
            saveSingleMovieToFirestore(updated);
            return updated;
          }
          return m;
        }));
        triggerNotification(
          '🛰️ Sinal Sintonizado!',
          `O player Abyss para "${newMovie.title}" está pronto e sintonizado no canal!`,
          newMovieId,
          'system',
          newMovie.posterUrl
        );
      }
    })
    .catch(err => {
      console.error('[Abyss App] Erro ao sintonizar fita no catálogo:', err);
    });

    return true; // Sucesso ao adicionar
  };

  const handleEditMovie = (editedMovie: Movie) => {
    setMovies(prev => prev.map(m => m.id === editedMovie.id ? editedMovie : m));
    saveSingleMovieToFirestore(editedMovie);

    // Re-registrar no Abyss em caso de edição (como alteração de TMDB ID ou título)
    fetchApi('/.netlify/functions/abyss', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tmdbId: editedMovie.tmdbId,
        type: editedMovie.type,
        title: editedMovie.title,
        apiKey: abyssApiKey || localStorage.getItem('vhsflix_abyss_key') || ''
      })
    })
    .then(res => {
      if (res.ok && res.data && res.data.success) {
        const data = res.data;
        setMovies(prev => prev.map(m => {
          if (m.id === editedMovie.id) {
            const updated = {
              ...m,
              abyssId: data.abyssId || m.abyssId,
              abyssEmbedUrl: editedMovie.type === 'movie' ? (data.embedUrl || m.abyssEmbedUrl) : m.abyssEmbedUrl,
              abyssStatus: data.status || m.abyssStatus
            };
            saveSingleMovieToFirestore(updated);
            return updated;
          }
          return m;
        }));
      }
    })
    .catch(err => {
      console.error('[Abyss App] Erro ao sintonizar fita editada:', err);
    });
  };

  const handleToggleRecommendation = (movieId: string) => {
    const isMasterAdmin = Boolean(activeUser?.isAdmin || (activeUser?.email || '').toLowerCase().trim() === 'rafaelguaruja09@gmail.com' || activeUser?.id === 'u1');
    if (!isMasterAdmin) return;

    setMovies(prev => prev.map(m => {
      if (m.id === movieId) {
        const nextRecommended = !m.isRecommended;
        const updated = { ...m, isRecommended: nextRecommended };
        saveSingleMovieToFirestore(updated);
        return updated;
      }
      return m;
    }));

    // Se o filme atualmente selecionado for o alterado, atualiza também a referência
    setSelectedMovie(prev => {
      if (prev && prev.id === movieId) {
        return { ...prev, isRecommended: !prev.isRecommended };
      }
      return prev;
    });
  };

  const handleDeleteMovie = (movieId: string) => {
    // Permissão de administrador master (Rafael Gusmão ou usuário admin ativo)
    const userEmail = (activeUser?.email || '').toLowerCase().trim();
    const isMasterAdmin = Boolean(activeUser?.isAdmin || userEmail === 'rafaelguaruja09@gmail.com');
    if (!isMasterAdmin) {
      triggerNotification(
        '⚠️ Acesso Negado!',
        'Apenas o administrador master (Rafael Gusmão) tem permissão para excluir filmes ou séries.',
        '',
        'system'
      );
      return;
    }
    setMovies(prev => prev.filter(m => m.id !== movieId));
    deleteMovieFromFirestore(movieId);
    try {
      const saved = localStorage.getItem('vhsflix_movies');
      if (saved) {
        const parsed: Movie[] = JSON.parse(saved);
        localStorage.setItem('vhsflix_movies', JSON.stringify(parsed.filter(m => m.id !== movieId)));
      }
    } catch (e) {
      console.warn('Erro ao sincronizar localStorage na exclusão:', e);
    }
    triggerNotification(
      '📼 Item Excluído',
      'O item foi removido com sucesso do catálogo sob o seu comando.',
      '',
      'system'
    );
  };

  const handleBulkDeleteMovies = (movieIds: string[]) => {
    // Permissão de administrador master (Rafael Gusmão ou usuário admin ativo)
    const userEmail = (activeUser?.email || '').toLowerCase().trim();
    const isMasterAdmin = Boolean(activeUser?.isAdmin || userEmail === 'rafaelguaruja09@gmail.com');
    if (!isMasterAdmin) {
      triggerNotification(
        '⚠️ Acesso Negado!',
        'Apenas o administrador master (Rafael Gusmão) tem permissão para excluir filmes ou séries.',
        '',
        'system'
      );
      return;
    }
    setMovies(prev => prev.filter(m => !movieIds.includes(m.id)));
    movieIds.forEach(id => deleteMovieFromFirestore(id));
    try {
      const saved = localStorage.getItem('vhsflix_movies');
      if (saved) {
        const parsed: Movie[] = JSON.parse(saved);
        localStorage.setItem('vhsflix_movies', JSON.stringify(parsed.filter(m => !movieIds.includes(m.id))));
      }
    } catch (e) {
      console.warn('Erro ao sincronizar localStorage na exclusão em lote:', e);
    }
    triggerNotification(
      '📼 Itens Excluídos em Lote',
      `${movieIds.length} itens foram removidos com sucesso do catálogo sob o seu comando.`,
      '',
      'system'
    );
  };

  const handleResetCatalog = () => {
    // Permissão de administrador master (Rafael Gusmão ou usuário admin ativo)
    const userEmail = (activeUser?.email || '').toLowerCase().trim();
    const isMasterAdmin = Boolean(activeUser?.isAdmin || userEmail === 'rafaelguaruja09@gmail.com');
    if (!isMasterAdmin) {
      triggerNotification(
        '⚠️ Acesso Negado!',
        'Apenas o administrador master (Rafael Gusmão) tem permissão para redefinir o catálogo.',
        '',
        'system'
      );
      return;
    }
    setMovies(INITIAL_MOVIES);
    saveMoviesToFirestore(INITIAL_MOVIES);
    triggerNotification(
      '📼 Catálogo Redefinido',
      'O catálogo do acervo original foi totalmente restaurada!',
      '',
      'system'
    );
  };

  const handleNotificationClick = (movieId: string, notificationId: string) => {
    if (!readNotifications.includes(notificationId)) {
      setReadNotifications(prev => [...prev, notificationId]);
    }
    const found = movies.find(m => m.id === movieId);
    if (found) {
      setSelectedMovie(found);
    }
  };

  const handleMarkAllNotificationsAsRead = () => {
    const allIds = dbNotifications.map(n => n.id);
    setReadNotifications(allIds);
  };

  // Jogar Rápido a fita VHS
  const handleFeaturedPlay = (movie: Movie, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    handleSelectMovie(movie);
  };

  // Abre detalhes do filme sintonizando cliques de audiência
  const handleSelectMovie = (movie: Movie) => {
    const updatedMovie = {
      ...movie,
      clicksCount: (movie.clicksCount || 0) + 1
    };
    setMovies(prev => prev.map(m => m.id === movie.id ? updatedMovie : m));
    setSelectedMovie(updatedMovie);
    // Só persiste no Firestore itens que fazem parte do catálogo real (não grava previews temporários de tendências TMDB)
    if (movie.id && !movie.id.startsWith('tmdb_trend_') && !movie.id.startsWith('virtual_')) {
      saveSingleMovieToFirestore(updatedMovie);
    }
  };

  // Contabilidade real de gostei/não-gostei profissional e preciso
  const handleVoteMovie = (movieId: string, voteType: 'like' | 'dislike') => {
    if (!activeProfile) return;
    const storageKey = `vote_${activeProfile.id}_${movieId}`;
    const previousVote = localStorage.getItem(storageKey);

    const m = movies.find(movie => movie.id === movieId);
    if (!m) return;

    let likesDelta = 0;
    let dislikesDelta = 0;

    if (previousVote === voteType) {
      // Desfaz voto anterior de mesma opção
      if (voteType === 'like') likesDelta = -1;
      if (voteType === 'dislike') dislikesDelta = -1;
      localStorage.removeItem(storageKey);
    } else {
      // Se mudou de ideia ou votou novo, desfaz o voto oposto velho, se houver
      if (previousVote === 'like') likesDelta = -1;
      if (previousVote === 'dislike') dislikesDelta = -1;

      // E adiciona o novo voto
      if (voteType === 'like') likesDelta += 1;
      if (voteType === 'dislike') dislikesDelta += 1;
      localStorage.setItem(storageKey, voteType);
    }

    const newLikes = Math.max(0, (m.votesLikes || 0) + likesDelta);
    const newDislikes = Math.max(0, (m.votesDislikes || 0) + dislikesDelta);

    const updatedMovie = {
      ...m,
      votesLikes: newLikes,
      votesDislikes: newDislikes
    };

    setMovies(prev => prev.map(item => item.id === movieId ? updatedMovie : item));

    if (selectedMovie && selectedMovie.id === movieId) {
      setSelectedMovie(curr => curr ? { ...curr, votesLikes: newLikes, votesDislikes: newDislikes } : null);
    }

    // Save immediately to Firestore only for real catalog movies
    if (movieId && !movieId.startsWith('tmdb_trend_') && !movieId.startsWith('virtual_')) {
      saveSingleMovieToFirestore(updatedMovie);
    }
  };

  const handleAddComment = async (movieId: string, text: string) => {
    if (!activeUser || !activeProfile || !text.trim()) return;
    const newComment: MovieComment = {
      id: `comment_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      movieId,
      userId: activeUser.id,
      userName: activeUser.name,
      profileName: activeProfile.name,
      avatarUrl: activeProfile.avatarUrl,
      text: text.trim(),
      createdAt: new Date().toISOString()
    };
    setComments(prev => [newComment, ...prev]);
    await saveSingleCommentToFirestore(newComment);
  };

  const handleDeleteComment = async (commentId: string) => {
    setComments(prev => prev.filter(c => c.id !== commentId));
    await deleteCommentFromFirestore(commentId);
  };

  const handleAddRequest = (title: string, type: 'movie' | 'series', richData?: Partial<MovieRequest>) => {
    if (!activeUser || !activeProfile) return;
    const newRequest: MovieRequest = {
      id: 'req_' + Date.now() + Math.random().toString(36).substring(2, 6),
      title,
      type,
      userId: activeUser.id,
      userName: activeUser.name,
      profileName: activeProfile.name,
      createdAt: new Date().toISOString(),
      status: 'pending',
      ...richData
    };
    setRequests(prev => [newRequest, ...prev]);

    // Salva o pedido diretamente no Firestore em tempo real
    saveSingleRequestToFirestore(newRequest);

    // Notificar todos os usuários sobre o novo pedido realizado em tempo real
    triggerNotification(
      '🆕 Novo Pedido Solicitado!',
      `O perfil "${activeProfile.name}" acabou de pedir a fita de "${title}"! Apoie o pedido no painel de pedidos.`,
      '',
      'system',
      richData?.posterUrl
    );
  };

  const handleFulfillRequest = (requestId: string) => {
    const request = requests.find(r => r.id === requestId);
    if (!request) return;

    // Create a real notification
    triggerNotification(
      'Pedido Atendido! 🎉',
      `O pedido de "${request.title}" foi adicionado com sucesso e agora está disponível no acervo retrô!`,
      '',
      request.type === 'movie' ? 'movie' : 'series',
      request.posterUrl
    );

    // Remove request from the list
    setRequests(prev => prev.filter(r => r.id !== requestId));
    deleteRequestFromFirestore(requestId);
  };

  const handleDeleteRequest = (requestId: string) => {
    setRequests(prev => prev.filter(r => r.id !== requestId));
    deleteRequestFromFirestore(requestId);
  };

  return (
    <div className="bg-zinc-950 min-h-screen relative text-zinc-100 flex flex-col justify-between overflow-x-hidden">
      
      {/* --- SEÇÃO 1: LOGIN E SELEÇÃO DE PERFIL --- */}
      {!activeProfile ? (
        <ProfileSelector
          users={users}
          currentUserId={currentUserId}
          onSelectUser={handleSelectUser}
          profiles={allProfiles[currentUserId] || []}
          onSelectProfile={handleSelectProfile}
          onAddProfile={handleAddProfile}
          onDeleteProfile={handleDeleteProfile}
          onEditProfile={handleEditProfile}
        />
      ) : isUserExpired ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none min-h-screen relative z-20">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="max-w-md w-full bg-zinc-950/90 border-2 border-rose-600 rounded-2xl p-8 shadow-[0_0_50px_rgba(229,9,20,0.15)] flex flex-col items-center gap-6"
          >
            <div className="w-16 h-16 rounded-full bg-rose-950/40 border border-rose-500/30 flex items-center justify-center animate-pulse">
              <span className="text-rose-500 text-3xl font-bold font-mono">✕</span>
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-black font-display tracking-widest text-[#E50914] uppercase">
                Sinal Bloqueado
              </h2>
              <p className="text-xs font-mono text-zinc-500 mt-1 uppercase tracking-widest">
                Acesso Suspenso • VHSFLIX
              </p>
            </div>
            <p className="text-sm text-zinc-300 font-sans leading-relaxed">
              A assinatura desta conta de 30 dias chegou ao fim. Para continuar assistindo aos seus filmes e séries retrô favoritos, entre em contato com o administrador Rafael Gusmão para renovar o seu sinal por mais 30 dias.
            </p>
            <div className="w-full bg-zinc-900 rounded-lg p-3 border border-zinc-800 text-left font-mono text-xs text-zinc-400 flex flex-col gap-1">
              <div className="flex justify-between">
                <span>Conta:</span>
                <span className="text-white font-bold">{activeUser.name}</span>
              </div>
              <div className="flex justify-between">
                <span>E-mail:</span>
                <span className="text-white">{activeUser.email}</span>
              </div>
              <div className="flex justify-between">
                <span>Dias Disponíveis:</span>
                <span className="text-rose-500 font-extrabold">0 dias (Expirado)</span>
              </div>
            </div>
            
            <div className="flex flex-col gap-3 w-full">
              <a 
                href="https://wa.me/5513997148555" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold py-3 px-4 rounded-lg text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-600/10 text-center"
              >
                💬 Falar com Rafael Gusmão
              </a>
              <button
                onClick={() => {
                  handleLogoutProfile();
                }}
                className="w-full bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white py-3 px-4 rounded-lg text-sm font-semibold transition-all cursor-pointer border border-zinc-800"
              >
                Sair da Conta / Mudar Usuário
              </button>
            </div>
          </motion.div>
        </div>
      ) : (
        /* --- SECÇÃO 2: PLATAFORMA STREAMING PRINCIPAL --- */
        <div className="flex flex-col min-h-screen justify-between">
          
          <Navbar
            user={activeUser}
            activeProfile={activeProfile}
            profiles={allProfiles[currentUserId] || []}
            onSelectProfile={handleSelectProfile}
            onLogoutProfile={handleLogoutProfile}
            onSwitchUser={handleLogoutProfile}
            searchVal={searchVal}
            onSearchChange={setSearchVal}
            activeTab={activeTab}
            onTabChange={(tab) => { setActiveTab(tab); setSelectedCategory(null); setIsAdminView(false); }}
            isAdminView={isAdminView}
            onToggleAdminView={setIsAdminView}
            notifications={notifications}
            onNotificationClick={handleNotificationClick}
            onMarkAllAsRead={handleMarkAllNotificationsAsRead}
            selectedCategory={selectedCategory}
            onSelectCategory={handleSelectCategory}
            movies={movies}
          />

          {/* --- TELA 2.A: INTERFACE ADMINISTRATIVA --- */}
          {isAdminView && activeUser.isAdmin ? (
            <AdminPanel
              movies={movies}
              users={users}
              allProfiles={allProfiles}
              tmdbApiKey={tmdbApiKey}
              onUpdateTmdbApiKey={setTmdbApiKey}
              abyssApiKey={abyssApiKey}
              onUpdateAbyssApiKey={handleUpdateAbyssApiKey}
              onAddMovie={handleAddMovie}
              onEditMovie={handleEditMovie}
              onDeleteMovie={handleDeleteMovie}
              onBulkDeleteMovies={handleBulkDeleteMovies}
              onResetCatalog={handleResetCatalog}
              onAddUser={handleAddUser}
              onEditUser={handleEditUser}
              onDeleteUser={handleDeleteUser}
              currentUserId={currentUserId}
              currentProfileId={currentProfileId || undefined}
              onEditProfile={handleEditProfile}
              adguardEnabled={adguardEnabled}
              onToggleAdguardEnabled={setAdguardEnabled}
              onPublishUpdate={handlePublishUpdate}
              pinnedMostDesiredId={pinnedMostDesiredMovieId}
              onTogglePinMostDesired={handleTogglePinMostDesired}
            />
          ) : activeTab === 'requests' ? (
            <RequestsPanel
              movies={movies}
              requests={requests}
              activeProfile={activeProfile}
              isAdmin={activeUser.isAdmin}
              onAddRequest={handleAddRequest}
              onFulfillRequest={handleFulfillRequest}
              onDeleteRequest={handleDeleteRequest}
              tmdbApiKey={tmdbApiKey}
            />
          ) : activeTab === 'support' ? (
            <SupportPanel onClose={() => setActiveTab('all')} />
          ) : (
            /* --- TELA 2.B: PAINEL PRINCIPAL DO USUÁRIO ESTILO NETFLIX --- */
            <div className="flex-1 pb-16 font-sans">
              
              {/* SEÇÃO HERO SPOTLIGHT (CARROSSEL DINÂMICO EM GRANDE PLANO) */}
              {!searchVal && activeTab === 'all' && featuredMovie && (
                <div className="relative min-h-[480px] sm:min-h-[560px] h-[66vh] sm:h-[84vh] w-full bg-zinc-950 flex flex-col justify-end select-none border-b border-zinc-900/40 overflow-hidden group pt-20 sm:pt-0">
                  
                  {/* Container de transição de imagens con AnimatePresence */}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={featuredMovie.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.85, ease: "easeInOut" }}
                      className="absolute inset-0 z-0"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-rose-950/20 to-zinc-950 z-0" />
                      <img
                        src={getCleanBackdropUrl(featuredMovie.backdropUrl, featuredMovie.posterUrl)}
                        alt={featuredMovie.title}
                        className="w-full h-full object-cover select-none brightness-[0.88] scale-102 hover:scale-105 transition-transform duration-10000 relative z-10"
                        referrerPolicy="no-referrer"
                        onError={handleBackdropError}
                      />
                      {/* Sombras pretas de ambientação suaves */}
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent pointer-events-none z-20" />
                      <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/80 via-transparent to-transparent pointer-events-none z-20 hidden md:block" />
                    </motion.div>
                  </AnimatePresence>

                  {/* Detalhes e botões informativos */}
                  <div className="relative z-20 max-w-[1400px] w-full mx-auto px-4 sm:px-8 pb-8 sm:pb-24 pt-8 sm:pt-0 flex flex-col items-start text-left">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={`meta-${featuredMovie.id}`}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.45 }}
                        className="flex flex-col items-start"
                      >
                        {/* 1. Gênero • 2. Nota (sem estrela, /10) • 3. Ano • 4. Tipo de Produção (Filme, Série de TV, Reality Show, Novela) */}
                        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 mb-3 sm:mb-4">
                          {/* Selo Oficial de Indicação do Administrador Rafael */}
                          {featuredMovie.isRecommended && (
                            <RecommendationBadge variant="banner" />
                          )}

                          {/* 1. Gênero */}
                          <span className="bg-zinc-900/90 border border-zinc-700/70 text-zinc-100 font-sans text-[11px] sm:text-xs font-black px-3.5 py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1.5">
                            <span>{featuredMovie.category}</span>
                          </span>

                          {/* 2. Nota (sem estrelinha, formato X.X/10) */}
                          <span className="bg-zinc-900/90 border border-zinc-700/70 text-zinc-100 font-sans text-[11px] sm:text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                            <span className="font-mono font-black">{featuredMovie.rating}/10</span>
                          </span>

                          {/* 3. Ano */}
                          <span className="bg-zinc-900/90 border border-zinc-700/70 text-zinc-300 font-sans text-[11px] sm:text-xs font-semibold px-3 py-1 rounded-full shadow-sm font-mono">
                            {featuredMovie.year}
                          </span>

                          {/* 4. Tipo de Produção */}
                          <span className="bg-red-600/15 border border-red-500/40 text-red-400 font-sans text-[11px] sm:text-xs font-black px-3.5 py-1 rounded-full uppercase tracking-wider shadow-[0_0_12px_rgba(239,68,68,0.25)] flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                            <span>{getMovieTypeDetailed(featuredMovie)}</span>
                          </span>
                        </div>
                        
                        {/* Título com Display Typography e espaçamento generoso */}
                        <h1 className="text-2xl xs:text-3xl sm:text-6xl font-black font-display tracking-wide text-white leading-tight uppercase max-w-2xl text-shadow whitespace-pre-line">
                          {featuredMovie.title}
                        </h1>

                        {/* Descrição Sinopse curta com efeito line-clamp responsivo */}
                        <p className="text-xs sm:text-base text-zinc-300 max-w-xl sm:max-w-2xl mt-2.5 sm:mt-4 line-clamp-2 sm:line-clamp-3 leading-relaxed drop-shadow-sm font-light tracking-wide">
                          {featuredMovie.description}
                        </p>
                      </motion.div>
                    </AnimatePresence>

                    {/* Botões do destaque com animação moderna e destaque em Vermelho Vibrante */}
                    <motion.div
                      key={`hero-btns-${featuredMovie.id}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.15 }}
                      className="flex flex-wrap items-center gap-3 sm:gap-4 mt-5 sm:mt-9"
                    >
                      {/* Botão de Assistir */}
                      <motion.button
                        whileHover={{ scale: 1.05, boxShadow: "0 0 35px rgba(239,68,68,0.75)" }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleFeaturedPlay(featuredMovie)}
                        className="relative overflow-hidden bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:from-red-500 hover:via-rose-500 hover:to-red-500 text-white font-black text-xs sm:text-sm px-6 py-3.5 sm:px-8 sm:py-4 rounded-xl flex items-center gap-2.5 shadow-[0_0_25px_rgba(239,68,68,0.55)] transition-all cursor-pointer tracking-wider border border-red-500/80 group"
                        id="btn-hero-play"
                      >
                        {/* Efeito de brilho animado (sheen) */}
                        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
                        
                        <div className="relative z-10 flex items-center justify-center p-1.5 rounded-full bg-white/20 text-white shadow-inner group-hover:scale-110 group-hover:bg-white group-hover:text-red-600 transition-all duration-300">
                          <Play className="w-4 h-4 sm:w-4.5 sm:h-4.5 fill-current ml-0.5" />
                        </div>
                        <span className="relative z-10 font-extrabold uppercase tracking-wider text-shadow">
                          {featuredMovie.type === 'series' ? 'Assistir Série' : 'Assistir Filme'}
                        </span>
                      </motion.button>

                      {/* Botão Salvar na Minha Lista (Substitui Ficha Técnica e descarta o circular) */}
                      {(() => {
                        const isHeroSaved = (activeProfile?.myList || []).some(
                          id => String(id) === String(featuredMovie.id) || (featuredMovie.tmdbId && String(id) === `tmdb_${featuredMovie.tmdbId}`)
                        );

                        return (
                          <motion.button
                            whileHover={{ scale: 1.04, boxShadow: isHeroSaved ? "0 0 25px rgba(239,68,68,0.4)" : "0 0 20px rgba(255,255,255,0.08)" }}
                            whileTap={{ scale: 0.94 }}
                            onClick={() => handleToggleMyList(featuredMovie.id)}
                            className={`font-black text-xs sm:text-sm px-5 py-3.5 sm:px-7 sm:py-4 rounded-xl flex items-center gap-2.5 transition-all cursor-pointer tracking-wider border backdrop-blur-md ${
                              isHeroSaved
                                ? 'bg-red-600/20 border-red-500 text-red-300 shadow-[0_0_20px_rgba(239,68,68,0.3)]'
                                : 'bg-zinc-900/85 hover:bg-zinc-800 border-zinc-700/80 hover:border-red-500/50 text-zinc-200 hover:text-white'
                            }`}
                            id="btn-hero-save-list"
                          >
                            {isHeroSaved ? (
                              <>
                                <Check className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 stroke-[3]" />
                                <span className="font-black uppercase tracking-wider">Salvo na Minha Lista</span>
                              </>
                            ) : (
                              <>
                                <Bookmark className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-300 fill-zinc-300/20" />
                                <span className="font-black uppercase tracking-wider">Salvar na Minha Lista</span>
                              </>
                            )}
                          </motion.button>
                        );
                      })()}
                    </motion.div>
                  </div>

                </div>
              )}

              {/* GRIDS / CATEGORIAS (ESTRELA DO DESIGN) */}
              <div className={`max-w-[1400px] mx-auto px-1 sm:px-4 ${(!searchVal && activeTab === 'all') ? '-mt-2 sm:-mt-8 relative z-30' : 'pt-32'}`}>
                
                {/* Visualizador de Categoria Ativa se selecionada */}
                {selectedCategory && (
                  <div className="px-4 sm:px-8 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 select-none animate-fade-in">
                    <div>
                      <span className="text-zinc-550 font-mono text-[9px] sm:text-[10px] uppercase font-bold tracking-widest block mb-1">Gênero Retro Filtrado</span>
                      <h2 className="text-xl sm:text-2xl font-black font-display text-white uppercase tracking-tight">
                        Catálogo de <span className="text-rose-500 font-extrabold">{selectedCategory}</span>
                      </h2>
                    </div>
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className="text-[10px] sm:text-xs font-mono font-black text-rose-500 hover:text-white bg-rose-500/10 hover:bg-rose-600 px-3.5 py-2 rounded-lg border border-rose-500/30 cursor-pointer transition-all hover:scale-105 active:scale-95"
                      id="btn-clear-category-filter-main"
                    >
                      Limpar Filtro ✕
                    </button>
                  </div>
                )}
                
                {/* Visualizador de Busca Ativo */}
                {searchVal && (
                  <div className="px-4 sm:px-8 mb-6">
                    <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
                      Resultados para busca de: <span className="text-rose-500 italic">"{searchVal}"</span>
                    </h2>
                    <p className="text-xs text-zinc-500 font-mono mt-1 pr-1">{filteredMovies.length} correspondências encontradas no catálogo.</p>
                  </div>
                )}

                {/* Visualizador de Categoria Ativa */}
                {selectedCategory && !searchVal && (
                  <div className="px-4 sm:px-8 mb-6 mt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
                        Explorando Categoria: <span className="text-rose-500 italic">"{selectedCategory}"</span>
                      </h2>
                      <p className="text-xs text-zinc-500 font-mono mt-1 pr-1">Exibindo {filteredMovies.length} fitas de vídeo vintage filtradas para você em alta fidelidade.</p>
                    </div>
                  </div>
                )}

                {/* --- 2.B.I: ROW DE CONTINUAR ASSISTINDO (ATÉ 10 ITENS COM ROLAMENTO E ANIMAÇÃO) --- */}
                {!searchVal && !selectedCategory && activeTab === 'all' && (
                  (() => {
                    // Seleciona filmes com histórico de progresso ativo e inacabado - até 10 itens com rolamento
                    const progressHistory = (Object.values(activeProfile.watchHistory) as WatchProgress[])
                      .filter(p => p.progress > 0 && !p.isFinished)
                      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
                    
                    const listToResume = progressHistory
                      .map(p => movies.find(m => m.id === p.movieId))
                      .filter((m): m is Movie => !!m)
                      .slice(0, 10);

                    if (listToResume.length === 0) return null;

                    return (
                      <MovieRow
                        title={
                          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                            <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 bg-clip-text text-transparent font-black">
                              Continuar Assistindo
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.3)] select-none">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                              </span>
                              <span>EM ANDAMENTO</span>
                            </span>
                          </div>
                        }
                        icon={
                          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-950/70 border border-amber-500/50 flex items-center justify-center text-amber-400 shadow-[0_0_18px_rgba(245,158,11,0.45)] shrink-0 group-hover/row:scale-105 group-hover/row:border-amber-400 transition-all duration-300">
                            <AnimatedResumeIcon size={22} />
                          </div>
                        }
                        accentColor="amber"
                        showCount={true}
                        movies={listToResume}
                        watchHistory={activeProfile.watchHistory}
                        myList={activeProfile.myList}
                        onMovieClick={handleSelectMovie}
                        onToggleMyList={handleToggleMyList}
                        onPlayClick={handleFeaturedPlay}
                      />
                    );
                  })()
                )}

                {/* --- 2.B.I.B: SPOTLIGHT / RADAR DE TENDÊNCIAS TMDB • TOP 10 EM ALTA (VERDE NEON ELEGANTE) --- */}
                {!searchVal && !selectedCategory && activeTab === 'all' && currentTrendingMovie && (
                  <div className="px-4 sm:px-8 mb-8 select-none animate-fade-in" id="tmdb-trending-spotlight-section">
                    {/* Header do Radar com Estética Verde Neon e Filtros Filmes/Séries */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center p-2 rounded-xl bg-emerald-500/20 border border-emerald-400/50 shadow-[0_0_20px_rgba(16,185,129,0.5)]">
                          <AnimatedNeonFlameIcon size={24} />
                        </div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base sm:text-xl font-black tracking-tight text-white font-display flex items-center gap-2 uppercase">
                            Tendências do TMDB <span className="text-emerald-300 font-mono text-xs sm:text-sm font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 shadow-[0_0_10px_rgba(16,185,129,0.3)]">TOP 10 EM ALTA</span>
                          </h2>
                        </div>
                      </div>

                      {/* Seletor Rápido: Somente Filmes ou Séries (Verde Neon) */}
                      <div className="flex items-center gap-1.5 bg-zinc-950/90 p-1 rounded-xl border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.2)] self-start sm:self-auto">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            setTmdbTrendingType('movie');
                            setCurrentTrendingIndex(0);
                          }}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-sans font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                            tmdbTrendingType === 'movie'
                              ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.7)] font-black border border-emerald-400'
                              : 'text-zinc-400 hover:text-emerald-400 hover:bg-zinc-900'
                          }`}
                          id="btn-tmdb-trend-movie"
                        >
                          <Film className="w-3.5 h-3.5" />
                          <span>Filmes</span>
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            setTmdbTrendingType('tv');
                            setCurrentTrendingIndex(0);
                          }}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-sans font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                            tmdbTrendingType === 'tv'
                              ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.7)] font-black border border-emerald-400'
                              : 'text-zinc-400 hover:text-emerald-400 hover:bg-zinc-900'
                          }`}
                          id="btn-tmdb-trend-tv"
                        >
                          <Tv className="w-3.5 h-3.5" />
                          <span>Séries</span>
                        </motion.button>
                      </div>
                    </div>

                    {/* Cartão de Destaque / Spotlight em Verde Neon com Navegação 1 ao 10 */}
                    <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-500/50 bg-gradient-to-r from-zinc-950 via-zinc-950 to-emerald-950/40 p-5 sm:p-7 flex flex-col md:flex-row items-center gap-6 shadow-[0_0_35px_rgba(16,185,129,0.25)] hover:border-emerald-400 hover:shadow-[0_0_45px_rgba(16,185,129,0.45)] transition-all duration-300 group/spotlight">
                      {/* Efeitos glow e grade retro verde neon */}
                      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/15 rounded-full blur-[120px] pointer-events-none"></div>
                      <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-600/10 rounded-full blur-[100px] pointer-events-none"></div>
                      <div className="absolute inset-0 bg-[linear-gradient(to_right,#10b98108_1px,transparent_1px),linear-gradient(to_bottom,#10b98108_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

                      {/* Capa VHS Interativa com borda verde neon */}
                      <div 
                        onClick={() => handleSelectMovie(currentTrendingMovie)}
                        className="relative shrink-0 w-36 sm:w-44 aspect-[2/3] rounded-xl overflow-hidden border-2 border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.5)] scale-100 group-hover/spotlight:scale-105 transition-all duration-300 cursor-pointer group z-10"
                        title={currentTrendingMovie.title}
                        id="spotlight-poster-cover"
                      >
                        <img 
                          key={`poster-${currentTrendingMovie.id}-${currentTrendingIndex}`}
                          src={getCleanPosterUrl(currentTrendingMovie.posterUrl)} 
                          alt={currentTrendingMovie.title}
                          className="w-full h-full object-cover group-hover:opacity-90 transition-opacity animate-fade-in"
                          referrerPolicy="no-referrer"
                          onError={handlePosterError}
                        />

                        {/* Selo Oficial de Indicação na Capa */}
                        {currentTrendingMovie.isRecommended && (
                          <div className="absolute top-2 right-2 z-20">
                            <RecommendationBadge variant="card" />
                          </div>
                        )}

                        {/* Hover Overlay Verde Neon para Sintonizar */}
                        <div className="absolute inset-0 bg-emerald-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="bg-emerald-500 text-black p-3 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.9)] transform scale-90 group-hover:scale-100 transition-transform flex items-center gap-1 font-mono text-xs font-bold uppercase">
                            <Play className="w-5 h-5 fill-current ml-0.5 text-black" />
                          </div>
                        </div>
                      </div>

                      {/* Conteúdo Detalhado e Métricas */}
                      <div className="flex-1 text-center md:text-left flex flex-col items-center md:items-start z-10 w-full">
                        {/* Badges do Spotlight + Navegação 1 ao 10 */}
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 sm:gap-2.5 w-full">
                          {/* Selo de Indicação Oficial se o título em destaque foi indicado */}
                          {currentTrendingMovie.isRecommended && (
                            <RecommendationBadge variant="banner" />
                          )}

                          {isMostDesiredPinnedByAdmin && currentTrendingIndex === 0 ? (
                            <span className="text-[11px] sm:text-xs font-mono font-black text-emerald-300 uppercase tracking-widest bg-emerald-950/70 border-2 border-emerald-400 px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                              <Sparkles className="w-4 h-4 text-emerald-400" />
                              📌 DESTAQUE ESPECIAL • FITA MAIS DESEJADA
                            </span>
                          ) : (
                            <span className="text-[11px] sm:text-xs font-mono font-black text-black uppercase tracking-widest bg-emerald-500 border border-emerald-400 px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.6)]">
                              <Flame className="w-4 h-4 fill-current text-black" />
                              🔥 Nº {currentTrendingIndex + 1} EM ALTA NO TMDB
                            </span>
                          )}

                          <span className="text-[10px] sm:text-xs font-mono text-emerald-300 bg-emerald-500/15 px-3 py-1 rounded-full border border-emerald-400/40 font-bold flex items-center gap-1">
                            ⚡ {currentTrendingMovie.type === 'series' ? 'SÉRIE' : 'FILME'}
                          </span>

                          <span className="text-[10px] sm:text-xs font-mono text-zinc-300 bg-zinc-900/80 px-3 py-1 rounded-full border border-zinc-700 font-medium flex items-center gap-1">
                            🔥 {currentTrendingMovie.clicksCount || 1850} acessos
                          </span>
                        </div>

                        {/* Barra de Seleção Numérica 1 ao 10 com Setas */}
                        <div className="flex items-center gap-1 mt-3 py-1 px-1.5 rounded-xl bg-zinc-950/90 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.2)] max-w-full overflow-x-auto no-scrollbar select-none">
                          <motion.button
                            whileHover={{ scale: 1.15 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setCurrentTrendingIndex(prev => (prev > 0 ? prev - 1 : (tmdbTrendingContentList.length > 0 ? tmdbTrendingContentList.length - 1 : 0)))}
                            className="p-1 sm:p-1.5 rounded-lg bg-zinc-900 hover:bg-emerald-500 hover:text-black text-emerald-400 border border-emerald-500/30 transition-all cursor-pointer shadow-sm shrink-0"
                            title="Anterior (Nº anterior em alta)"
                            id="btn-trending-prev"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </motion.button>

                          <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(10, tmdbTrendingContentList.length || 10) }).map((_, idx) => {
                              const isActive = currentTrendingIndex === idx;
                              return (
                                <motion.button
                                  key={idx}
                                  whileHover={{ scale: isActive ? 1.05 : 1.15 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => setCurrentTrendingIndex(idx)}
                                  className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg text-[11px] sm:text-xs font-mono font-black transition-all flex items-center justify-center cursor-pointer ${
                                    isActive
                                      ? 'bg-emerald-500 text-black shadow-[0_0_12px_rgba(16,185,129,0.7)] border border-emerald-300 scale-105'
                                      : 'bg-zinc-900/90 text-zinc-400 hover:text-emerald-300 hover:border-emerald-500/50 border border-zinc-800/80'
                                  }`}
                                  title={`Ver Nº ${idx + 1} em alta no TMDB`}
                                  id={`btn-trending-rank-${idx + 1}`}
                                >
                                  {idx + 1}
                                </motion.button>
                              );
                            })}
                          </div>

                          <motion.button
                            whileHover={{ scale: 1.15 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setCurrentTrendingIndex(prev => (prev < (tmdbTrendingContentList.length - 1) ? prev + 1 : 0))}
                            className="p-1 sm:p-1.5 rounded-lg bg-zinc-900 hover:bg-emerald-500 hover:text-black text-emerald-400 border border-emerald-500/30 transition-all cursor-pointer shadow-sm shrink-0"
                            title="Próximo (Próximo número em alta)"
                            id="btn-trending-next"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </motion.button>
                        </div>

                        <h3 
                          key={`title-${currentTrendingMovie.id}-${currentTrendingIndex}`}
                          className="text-2xl sm:text-3xl font-black text-white font-sans mt-3 tracking-tight uppercase leading-tight text-shadow animate-fade-in"
                        >
                          {currentTrendingMovie.title}
                        </h3>

                        {/* Bloco da Sinopse com Botão Animado de Avanço Lateral */}
                        <div className="mt-2.5 flex flex-col sm:flex-row items-stretch sm:items-start gap-3 w-full max-w-3xl">
                          <p 
                            key={`desc-${currentTrendingMovie.id}-${currentTrendingIndex}`}
                            className="text-xs sm:text-sm text-zinc-300 leading-relaxed text-justify md:text-left line-clamp-3 flex-1 animate-fade-in"
                          >
                            {currentTrendingMovie.description}
                          </p>

                          {/* Botão Bonito e Animado ao Lado da Sinopse para Avançar os Números 1 a 10 */}
                          <motion.button
                            whileHover={{ scale: 1.06, x: 2 }}
                            whileTap={{ scale: 0.94 }}
                            onClick={() => setCurrentTrendingIndex(prev => (prev < (tmdbTrendingContentList.length - 1) ? prev + 1 : 0))}
                            className="shrink-0 flex items-center justify-center gap-2 px-3.5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-emerald-950 via-zinc-900 to-emerald-900/50 border border-emerald-400/60 hover:border-emerald-300 text-emerald-300 hover:text-white shadow-[0_0_18px_rgba(16,185,129,0.35)] hover:shadow-[0_0_25px_rgba(16,185,129,0.6)] transition-all cursor-pointer group/next"
                            title={`Avançar para o Nº ${((currentTrendingIndex + 1) % (tmdbTrendingContentList.length || 10)) + 1} em alta no TMDB`}
                            id="btn-synopsis-next-trend"
                          >
                            <div className="flex flex-col text-left">
                              <span className="text-[9px] font-mono uppercase tracking-wider text-emerald-400 font-bold leading-none">
                                Próximo
                              </span>
                              <span className="text-xs font-mono font-black text-white leading-tight mt-0.5">
                                Nº {((currentTrendingIndex + 1) % (tmdbTrendingContentList.length || 10)) + 1}
                              </span>
                            </div>
                            <div className="p-1 rounded-lg bg-emerald-500 text-black group-hover/next:scale-110 transition-transform">
                              <ChevronRight className="w-4 h-4 stroke-[3]" />
                            </div>
                          </motion.button>
                        </div>

                        {/* Metadados Estilizados */}
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 sm:gap-3.5 text-xs font-mono text-zinc-400 mt-4">
                          <span className="flex items-center gap-1 bg-zinc-900/90 border border-emerald-400/40 px-2.5 py-1 rounded text-white font-bold shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                            <Star className="w-3.5 h-3.5 text-yellow-400 fill-current" />
                            <span className="text-white font-black">{currentTrendingMovie.rating}</span>
                            <span className="text-zinc-500 text-[10px]">/10 TMDB</span>
                          </span>
                          <span className="bg-zinc-900/80 border border-zinc-800 px-2.5 py-1 rounded text-zinc-300">
                            {currentTrendingMovie.year}
                          </span>
                          <span className="bg-zinc-900/80 border border-emerald-400/30 px-2.5 py-1 rounded text-emerald-400 font-semibold uppercase">
                            {currentTrendingMovie.category}
                          </span>
                          <span className="bg-zinc-900/80 border border-zinc-800 px-2.5 py-1 rounded text-zinc-300">
                            {currentTrendingMovie.duration}
                          </span>
                        </div>

                        {/* Botões Interativos de Ação em Verde Neon */}
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-5">
                          <motion.button
                            whileHover={{ scale: 1.05, boxShadow: "0 0 35px rgba(16,185,129,0.8)" }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleSelectMovie(currentTrendingMovie)}
                            className="relative overflow-hidden bg-emerald-500 hover:bg-emerald-400 text-black font-sans text-xs font-black uppercase tracking-wider px-6 py-3 rounded-xl flex items-center gap-2.5 transition-all cursor-pointer shadow-[0_0_25px_rgba(16,185,129,0.6)] border border-emerald-400 group"
                            id="btn-play-most-desired"
                          >
                            {/* Efeito de brilho animado (sheen) */}
                            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />
                            
                            <div className="relative z-10 flex items-center justify-center p-1 rounded-full bg-black/15 text-black group-hover:scale-110 group-hover:bg-black group-hover:text-emerald-400 transition-all duration-300">
                              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                            </div>
                            <span className="relative z-10 font-black tracking-wider">
                              {currentTrendingMovie.type === 'series' ? 'Assistir Série' : 'Assistir Filme'}
                            </span>
                          </motion.button>
                          
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              if (!activeProfile) return;
                              handleToggleMyList(currentTrendingMovie.id);
                            }}
                            className={`border font-sans text-xs font-bold uppercase tracking-wider px-5 py-3 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                              activeProfile?.myList?.includes(currentTrendingMovie.id)
                                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                                : 'border-zinc-700 hover:border-emerald-400/60 text-zinc-300 hover:text-white bg-zinc-900/60'
                            }`}
                            id="btn-toggle-mylist-most-desired"
                          >
                            {activeProfile?.myList?.includes(currentTrendingMovie.id) ? (
                              <>
                                <Check className="w-4 h-4 text-emerald-400" />
                                <span>Na Minha Lista</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-4 h-4" />
                                <span>Minha Lista</span>
                              </>
                            )}
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* --- 2.B.II: ROWS DE LANÇAMENTOS, AVALIAÇÕES E RECÉM ADICIONADOS --- */}
                {(!searchVal && !selectedCategory && (activeTab === 'all' || activeTab === 'mylist')) && (
                  (() => {
                    if (activeTab === 'all') {
                      return (
                        <div className="space-y-4">
                          {/* 1. Filmes Lançamentos (Até 30) */}
                          <MovieRow
                            title="Filmes Lançamentos"
                            icon={
                              <div className="w-8 h-8 rounded-xl bg-rose-950/60 border border-rose-500/40 flex items-center justify-center text-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.4)] shrink-0">
                                <AnimatedFilmReelIcon size={20} />
                              </div>
                            }
                            movies={moviesReleasesTop30}
                            watchHistory={activeProfile.watchHistory}
                            myList={activeProfile.myList}
                            onMovieClick={handleSelectMovie}
                            onToggleMyList={handleToggleMyList}
                            onPlayClick={handleFeaturedPlay}
                          />

                          {/* 4. Séries Lançamentos (Até 30) */}
                          <MovieRow
                            title="Séries Lançamentos"
                            icon={
                              <div className="w-8 h-8 rounded-xl bg-emerald-950/60 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)] shrink-0">
                                <AnimatedTvIcon size={20} />
                              </div>
                            }
                            movies={seriesReleasesTop30}
                            watchHistory={activeProfile.watchHistory}
                            myList={activeProfile.myList}
                            onMovieClick={handleSelectMovie}
                            onToggleMyList={handleToggleMyList}
                            onPlayClick={handleFeaturedPlay}
                          />

                          {/* 5. Recém Adicionados (Top 10) */}
                          <MovieRow
                            title="Recém Adicionados"
                            icon={
                              <div className="w-8 h-8 rounded-xl bg-emerald-950/60 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(34,197,94,0.4)] shrink-0">
                                <NeonFreshIcon size={20} />
                              </div>
                            }
                            movies={recentlyAddedMoviesTop10}
                            watchHistory={activeProfile.watchHistory}
                            myList={activeProfile.myList}
                            onMovieClick={handleSelectMovie}
                            onToggleMyList={handleToggleMyList}
                            onPlayClick={handleFeaturedPlay}
                          />
                        </div>
                      );
                    } else {
                      // activeTab === 'mylist'
                      const savedMyList = Array.isArray(activeProfile?.myList) ? activeProfile.myList : [];
                      const listMovies = movies.filter(m => savedMyList.some(id => String(id) === String(m.id) || (m.tmdbId && String(id) === `tmdb_${m.tmdbId}`)));
                      const mySavedMovies = listMovies.filter(m => m.type === 'movie');
                      const mySavedSeries = listMovies.filter(m => m.type === 'series');

                      if (listMovies.length === 0) {
                        return (
                          <div className="text-center py-24 px-4 font-sans max-w-md mx-auto flex flex-col items-center">
                            <HelpCircle className="w-12 h-12 text-zinc-700 mb-4" />
                            <h3 className="font-bold text-lg text-zinc-300 font-display">Sua Lista está vazia</h3>
                            <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
                              Crie sua estante de fitas VHS personalizadas! Navegue na página inicial e selecione "+" em qualquer filme ou série para salvá-los aqui neste prateleira de acesso rápido.
                            </p>
                            <button
                              onClick={() => setActiveTab('all')}
                              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2 mt-6 rounded cursor-pointer"
                            >
                              Explorar Filmes & Séries
                            </button>
                          </div>
                        );
                      }

                      // Componentes de Renderização para cada item da lista (Vertical e Grade)
                      const renderVerticalItem = (movie: Movie) => {
                        const progress = activeProfile.watchHistory[movie.id];
                        const hasProgress = progress && progress.progress > 0 && !progress.isFinished;
                        const isSeries = movie.type === 'series';

                        return (
                          <div
                            key={movie.id}
                            className="group relative bg-zinc-950/40 hover:bg-[#08080c] border border-zinc-900 hover:border-rose-500/40 rounded-xl p-3 sm:p-4.5 transition-all duration-300 flex flex-col sm:flex-row gap-5 items-start sm:items-center overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-rose-950/15"
                            id={`mylist-vertical-${movie.id}`}
                          >
                            <div className="absolute top-0 left-0 w-[3px] h-full bg-gradient-to-b from-rose-500 to-amber-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            
                            {/* Capa/Poster da Fita com Selo e Tipo */}
                            <div 
                              onClick={() => handleSelectMovie(movie)}
                              className="relative w-20 sm:w-26 aspect-[2/3] shrink-0 rounded-lg overflow-hidden border border-zinc-850 group-hover:border-rose-500/60 shadow-md cursor-pointer transform group-hover:scale-[1.02] transition-all duration-300 bg-zinc-950"
                            >
                              <img 
                                src={getCleanPosterUrl(movie.posterUrl)} 
                                alt={movie.title} 
                                className="w-full h-full object-cover"
                                loading="lazy"
                                decoding="async"
                                referrerPolicy="no-referrer"
                                onError={handlePosterError}
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 pointer-events-none" />
                              
                              {/* Badge de tipo de mídia */}
                              <div className={`absolute top-1.5 left-1.5 border text-[8px] font-mono font-black px-1.5 py-0.5 rounded leading-none uppercase z-20 ${
                                isSeries 
                                  ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300' 
                                  : 'bg-rose-950/90 border-rose-500/50 text-rose-300'
                              }`}>
                                {isSeries ? 'Série' : 'Filme'}
                              </div>

                              {/* Selo Oficial de Recomendação se indicado */}
                              {movie.isRecommended && (
                                <div className="absolute top-1.5 right-1.5 z-20">
                                  <RecommendationBadge variant="card" showText={false} />
                                </div>
                              )}
                            </div>
                            
                            {/* Miolo Informativo */}
                            <div className="flex-1 w-full min-w-0 flex flex-col justify-between">
                              <div>
                                <div className="flex flex-wrap items-center gap-2 mb-2 text-[10px] font-mono text-zinc-500">
                                  <span className={`font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider text-[9px] border ${
                                    isSeries 
                                      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' 
                                      : 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                                  }`}>
                                    {movie.category}
                                  </span>
                                  <span>•</span>
                                  <span className="bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded text-zinc-300 font-bold">
                                    {movie.year}
                                  </span>
                                  <span>•</span>
                                  <span className="text-zinc-400">
                                    Duração: <strong className="text-zinc-300">{movie.duration}</strong>
                                  </span>

                                  {movie.isRecommended && (
                                    <div className="ml-auto hidden sm:inline-block">
                                      <RecommendationBadge variant="compact" />
                                    </div>
                                  )}
                                </div>
                                
                                <h3 
                                  onClick={() => handleSelectMovie(movie)}
                                  className="text-base sm:text-lg font-black text-white hover:text-rose-500 transition-colors uppercase tracking-tight truncate cursor-pointer font-sans flex items-center gap-2"
                                >
                                  <span>{movie.title}</span>
                                </h3>
                                
                                <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed line-clamp-2 pr-2 font-sans text-justify sm:text-left">
                                  {movie.description}
                                </p>
                              </div>
                              
                              <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t border-zinc-900/60 text-[10px] font-mono text-zinc-500">
                                <span className="flex items-center gap-1 text-yellow-500 font-bold">
                                  <Star className="w-3.5 h-3.5 fill-current text-yellow-500" />
                                  <strong className="text-zinc-300 text-xs">{movie.rating}</strong>/10
                                </span>
                                
                                {hasProgress && (
                                  <div className="flex items-center gap-3 max-w-sm flex-1">
                                    <span className="text-rose-400 shrink-0 font-bold uppercase text-[9px]">Ponto: {Math.floor((progress?.currentTime || 0) / 60)} min</span>
                                    <div className="h-1.5 bg-zinc-900 border border-zinc-800 rounded-full flex-1 overflow-hidden relative">
                                      <div className="h-full bg-rose-500" style={{ width: `${progress.progress}%` }} />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Ações na lateral */}
                            <div className="flex sm:flex-col items-center gap-2 w-full sm:w-auto shrink-0 mt-4 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-zinc-900/60">
                              <button
                                onClick={() => handleFeaturedPlay(movie)}
                                className="flex-1 sm:flex-none w-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-mono text-[10px] font-black uppercase tracking-wider py-2.5 px-4.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md active:bg-rose-800"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" />
                                <span>Assistir</span>
                              </button>
                              
                              <button
                                onClick={() => handleToggleMyList(movie.id)}
                                className="bg-zinc-950 hover:bg-rose-600/10 border border-zinc-850 hover:border-rose-600/30 text-zinc-400 hover:text-rose-400 p-2.5 rounded-lg transition-all cursor-pointer active:scale-95 flex items-center justify-center"
                                title="Remover da minha lista"
                              >
                                <Trash2 className="w-4 h-4 text-zinc-500 hover:text-rose-400 transition-colors" />
                              </button>
                            </div>
                          </div>
                        );
                      };

                      const renderGridItem = (movie: Movie) => {
                        const isSeries = movie.type === 'series';

                        return (
                          <div
                            key={movie.id}
                            className="group relative bg-[#09090b]/40 border border-zinc-900 hover:border-rose-500 rounded-xl overflow-hidden hover:shadow-xl hover:shadow-rose-600/10 transition-all cursor-pointer flex flex-col h-full"
                            id={`mylist-grid-${movie.id}`}
                          >
                            <div 
                              onClick={() => handleSelectMovie(movie)}
                              className="aspect-[2/3] overflow-hidden bg-zinc-900 relative shrink-0"
                            >
                              <img 
                                src={getCleanPosterUrl(movie.posterUrl)} 
                                alt={movie.title} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                loading="lazy"
                                decoding="async"
                                referrerPolicy="no-referrer"
                                onError={handlePosterError}
                              />

                              {/* Badge de tipo de mídia */}
                              <div className={`absolute top-2 left-2 border text-[8px] font-mono font-black px-1.5 py-0.5 rounded leading-none uppercase z-20 ${
                                isSeries 
                                  ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300' 
                                  : 'bg-rose-950/90 border-rose-500/50 text-rose-300'
                              }`}>
                                {isSeries ? 'Série' : 'Filme'}
                              </div>

                              {/* Selo Oficial de Recomendação se indicado */}
                              {movie.isRecommended && (
                                <div className="absolute top-2 right-9 z-20">
                                  <RecommendationBadge variant="card" showText={false} />
                                </div>
                              )}

                              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2.5 z-20">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleFeaturedPlay(movie);
                                  }}
                                  className="w-full bg-rose-600 hover:bg-rose-700 text-white py-1.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1 shadow-md cursor-pointer"
                                >
                                  <Play className="w-2.5 h-2.5 fill-current" />
                                  <span>Assistir</span>
                                </button>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleMyList(movie.id);
                                }}
                                className="absolute top-2 right-2 bg-zinc-950/90 hover:bg-rose-950/90 border border-zinc-800 text-zinc-400 hover:text-rose-400 p-1.5 rounded-full transition-all cursor-pointer z-20"
                                title="Remover da lista"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div 
                              onClick={() => handleSelectMovie(movie)}
                              className="p-2 sm:p-3 bg-[#09090b]/40 border-t border-zinc-900 flex-1 flex flex-col justify-between"
                            >
                              <span className="font-semibold text-xs text-zinc-200 truncate group-hover:text-rose-500 block uppercase font-mono tracking-tight">{movie.title}</span>
                              <div className="flex justify-between items-center text-[9px] text-zinc-500 font-mono leading-none mt-1">
                                <span className="text-yellow-400 font-bold flex items-center gap-0.5">
                                  <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" /> {movie.rating}
                                </span>
                                <span>{movie.year}</span>
                              </div>
                            </div>
                          </div>
                        );
                      };

                      return (
                        <div className="animate-fade-in space-y-8">
                          {/* Cabeçalho Refinado com Seleção de Galeria e Layout */}
                          <div className="px-4 sm:px-8 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-900/80">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-zinc-500 font-mono text-[9px] sm:text-[10px] uppercase font-bold tracking-widest block">Estante de Títulos Salvos</span>
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                <span className="text-rose-400 font-mono text-[9px] uppercase font-bold">Classificação Separada</span>
                              </div>
                              <h2 className="text-xl sm:text-2xl font-black font-display text-white uppercase tracking-tight flex items-center gap-3">
                                <span>Minha Lista</span>
                                <span className="text-xs sm:text-sm font-mono px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold">
                                  {listMovies.length} {listMovies.length === 1 ? 'título' : 'títulos'}
                                </span>
                              </h2>
                            </div>

                            {/* Controles: Filtro de Galeria (Filmes vs Séries) + Seletor de Modo de Visualização */}
                            <div className="flex flex-wrap items-center gap-3">
                              {/* Seletor de Galeria: Filmes / Séries / Todos */}
                              <div className="flex items-center gap-1 bg-zinc-950/60 p-1 rounded-xl border border-zinc-900/80 shadow-inner">
                                <button
                                  onClick={() => setMyListTypeFilter('all')}
                                  className={`px-3 py-1.5 rounded-lg font-mono text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                                    myListTypeFilter === 'all'
                                      ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                                      : 'text-zinc-400 hover:text-zinc-200'
                                  }`}
                                >
                                  <span>Todos</span>
                                  <span className="text-[9px] opacity-80">({listMovies.length})</span>
                                </button>

                                <button
                                  onClick={() => setMyListTypeFilter('movies')}
                                  className={`px-3 py-1.5 rounded-lg font-mono text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                                    myListTypeFilter === 'movies'
                                      ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                                      : 'text-zinc-400 hover:text-zinc-200'
                                  }`}
                                >
                                  <Film className="w-3 h-3 text-rose-400" />
                                  <span>Filmes</span>
                                  <span className="text-[9px] opacity-80">({mySavedMovies.length})</span>
                                </button>

                                <button
                                  onClick={() => setMyListTypeFilter('series')}
                                  className={`px-3 py-1.5 rounded-lg font-mono text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                                    myListTypeFilter === 'series'
                                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                                      : 'text-zinc-400 hover:text-zinc-200'
                                  }`}
                                >
                                  <Tv className="w-3 h-3 text-emerald-400" />
                                  <span>Séries</span>
                                  <span className="text-[9px] opacity-80">({mySavedSeries.length})</span>
                                </button>
                              </div>

                              {/* Seletor de Sintonia/Visualização */}
                              <div className="flex items-center gap-1 bg-zinc-950/60 p-1 rounded-xl border border-zinc-900/80 shadow-inner">
                                <button
                                  onClick={() => setMyListViewMode('vertical_list')}
                                  className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg font-mono text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
                                    myListViewMode === 'vertical_list'
                                      ? 'bg-zinc-800 text-white border border-zinc-700'
                                      : 'text-zinc-500 hover:text-zinc-300'
                                  }`}
                                  title="Visualização Vertical Detalhada"
                                >
                                  <List className="w-3.5 h-3.5" />
                                  <span className="hidden md:inline">Vertical</span>
                                </button>

                                <button
                                  onClick={() => setMyListViewMode('grid')}
                                  className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg font-mono text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
                                    myListViewMode === 'grid'
                                      ? 'bg-zinc-800 text-white border border-zinc-700'
                                      : 'text-zinc-500 hover:text-zinc-300'
                                  }`}
                                  title="Visualização em Grade"
                                >
                                  <LayoutGrid className="w-3.5 h-3.5" />
                                  <span className="hidden md:inline">Grade</span>
                                </button>

                                <button
                                  onClick={() => setMyListViewMode('carousel')}
                                  className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg font-mono text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
                                    myListViewMode === 'carousel'
                                      ? 'bg-zinc-800 text-white border border-zinc-700'
                                      : 'text-zinc-500 hover:text-zinc-300'
                                  }`}
                                  title="Carrossel Horizontal"
                                >
                                  <ChevronRight className="w-3.5 h-3.5" />
                                  <span className="hidden md:inline">Carrossel</span>
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* --- MODO CARROSSEL --- */}
                          {myListViewMode === 'carousel' && (
                            <div className="space-y-6">
                              {(myListTypeFilter === 'all' || myListTypeFilter === 'movies') && (
                                <MovieRow
                                  title="Galeria de Filmes Salvos"
                                  subtitle="Seus longas-metragens salvos na estante"
                                  icon={
                                    <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.35)]">
                                      <Film className="w-4 h-4" />
                                    </div>
                                  }
                                  movies={mySavedMovies}
                                  watchHistory={activeProfile.watchHistory}
                                  myList={activeProfile.myList}
                                  onMovieClick={handleSelectMovie}
                                  onToggleMyList={handleToggleMyList}
                                  onPlayClick={handleFeaturedPlay}
                                />
                              )}

                              {(myListTypeFilter === 'all' || myListTypeFilter === 'series') && (
                                <MovieRow
                                  title="Galeria de Séries Salvas"
                                  subtitle="Suas temporadas e seriados salvos na estante"
                                  icon={
                                    <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.35)]">
                                      <Tv className="w-4 h-4" />
                                    </div>
                                  }
                                  movies={mySavedSeries}
                                  watchHistory={activeProfile.watchHistory}
                                  myList={activeProfile.myList}
                                  onMovieClick={handleSelectMovie}
                                  onToggleMyList={handleToggleMyList}
                                  onPlayClick={handleFeaturedPlay}
                                />
                              )}
                            </div>
                          )}

                          {/* --- MODO VERTICAL OU GRADE --- */}
                          {myListViewMode !== 'carousel' && (
                            <div className="space-y-10">
                              {/* 1. GALERIA DE FILMES */}
                              {(myListTypeFilter === 'all' || myListTypeFilter === 'movies') && (
                                <div className="space-y-4">
                                  <div className="px-4 sm:px-8 flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                      <div className="w-7 h-7 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                                        <Film className="w-3.5 h-3.5" />
                                      </div>
                                      <div>
                                        <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-tight font-display">
                                          Galeria de Filmes
                                        </h3>
                                        <span className="text-[10px] font-mono text-zinc-400">
                                          {mySavedMovies.length} {mySavedMovies.length === 1 ? 'filme guardado' : 'filmes guardados'}
                                        </span>
                                      </div>
                                    </div>

                                    {mySavedMovies.length > 0 && (
                                      <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
                                        Acervo de Longas
                                      </span>
                                    )}
                                  </div>

                                  {mySavedMovies.length === 0 ? (
                                    <div className="mx-4 sm:mx-8 p-6 rounded-xl border border-dashed border-zinc-900 bg-zinc-950/30 text-center flex flex-col items-center">
                                      <Film className="w-8 h-8 text-zinc-700 mb-2" />
                                      <p className="text-xs text-zinc-400 font-sans">Nenhum filme salvo na sua estante ainda.</p>
                                      <p className="text-[10px] font-mono text-zinc-600 mt-1">Navegue pelas prateleiras e clique no botão "+" dos filmes que mais gosta.</p>
                                    </div>
                                  ) : myListViewMode === 'vertical_list' ? (
                                    <div className="px-4 sm:px-8 space-y-4 max-w-5xl">
                                      {mySavedMovies.map(renderVerticalItem)}
                                    </div>
                                  ) : (
                                    <div className="px-4 sm:px-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-y-6 gap-x-4 sm:gap-x-5">
                                      {mySavedMovies.map(renderGridItem)}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Divisor sutil quando ambas as galerias estão visíveis */}
                              {myListTypeFilter === 'all' && mySavedMovies.length > 0 && mySavedSeries.length > 0 && (
                                <div className="px-4 sm:px-8 py-2">
                                  <div className="relative flex items-center justify-center">
                                    <div className="w-full border-t border-zinc-900" />
                                    <span className="absolute bg-[#050507] px-3 font-mono text-[9px] font-bold uppercase tracking-widest text-zinc-600">
                                      Divisão de Mídias Salvas
                                    </span>
                                  </div>
                                </div>
                              )}

                              {/* 2. GALERIA DE SÉRIES */}
                              {(myListTypeFilter === 'all' || myListTypeFilter === 'series') && (
                                <div className="space-y-4">
                                  <div className="px-4 sm:px-8 flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                      <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                                        <Tv className="w-3.5 h-3.5" />
                                      </div>
                                      <div>
                                        <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-tight font-display">
                                          Galeria de Séries
                                        </h3>
                                        <span className="text-[10px] font-mono text-zinc-400">
                                          {mySavedSeries.length} {mySavedSeries.length === 1 ? 'série guardada' : 'séries guardadas'}
                                        </span>
                                      </div>
                                    </div>

                                    {mySavedSeries.length > 0 && (
                                      <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                        Acervo de Temporadas
                                      </span>
                                    )}
                                  </div>

                                  {mySavedSeries.length === 0 ? (
                                    <div className="mx-4 sm:mx-8 p-6 rounded-xl border border-dashed border-zinc-900 bg-zinc-950/30 text-center flex flex-col items-center">
                                      <Tv className="w-8 h-8 text-zinc-700 mb-2" />
                                      <p className="text-xs text-zinc-400 font-sans">Nenhuma série salva na sua estante ainda.</p>
                                      <p className="text-[10px] font-mono text-zinc-600 mt-1">Marque séries para acompanhar seus episódios e temporadas aqui.</p>
                                    </div>
                                  ) : myListViewMode === 'vertical_list' ? (
                                    <div className="px-4 sm:px-8 space-y-4 max-w-5xl">
                                      {mySavedSeries.map(renderVerticalItem)}
                                    </div>
                                  ) : (
                                    <div className="px-4 sm:px-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-y-6 gap-x-4 sm:gap-x-5">
                                      {mySavedSeries.map(renderGridItem)}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    }
                  })()
                )}

                {/* --- 2.B.III: GRID DE FILMES/SÉRIES/LANÇAMENTOS, BUSCA OU CATEGORIAS SELECIONADAS --- */}
                {activeTab !== 'mylist' && (Boolean(searchVal) || activeTab === 'releases' || activeTab === 'movies' || activeTab === 'series' || Boolean(selectedCategory)) && (
                  (() => {
                    if (filteredMovies.length === 0) {
                      return (
                        <div className="text-center py-28 px-4 flex flex-col items-center max-w-sm mx-auto">
                          <AlertCircle className="w-10 h-10 text-rose-500 mb-3" />
                          <h3 className="font-bold text-sm text-zinc-200">Nenhum título localizado</h3>
                          <p className="text-[11px] text-zinc-400 mt-1 lines-clamp-3">Infelizmente não encontramos nenhum filme ou série correspondente nas prateleiras locais 🤔</p>
                        </div>
                      );
                    }

                    const getGridTitle = () => {
                      if (searchVal) return `Resultados para "${searchVal}"`;
                      if (selectedCategory) return selectedCategory;
                      if (activeTab === 'releases') return 'Lançamentos Filmes e Séries';
                      if (activeTab === 'movies') return 'Filmes';
                      if (activeTab === 'series') return 'Séries';
                      return 'Catálogo Completo';
                    };

                    const getGridIcon = () => {
                      if (activeTab === 'releases') {
                        return (
                          <div className="w-10 h-8 sm:w-11 sm:h-9 rounded-xl bg-zinc-950 border border-zinc-800/90 flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.25)] shrink-0 px-1 py-0.5">
                            <VhsTapeIcon size={34} animated={true} />
                          </div>
                        );
                      }
                      if (activeTab === 'movies') {
                        return (
                          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500 shadow-[0_0_14px_rgba(244,63,94,0.35)] shrink-0">
                            <Film className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                          </div>
                        );
                      }
                      if (activeTab === 'series') {
                        return (
                          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_14px_rgba(16,185,129,0.35)] shrink-0">
                            <Tv className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                          </div>
                        );
                      }
                      if (selectedCategory) {
                        return (
                          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_14px_rgba(245,158,11,0.35)] shrink-0">
                            <Sparkles className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                          </div>
                        );
                      }
                      return (
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-500 shadow-[0_0_14px_rgba(239,68,68,0.35)] shrink-0">
                          <Film className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                        </div>
                      );
                    };

                    return (
                      <div ref={catalogGridTopRef} id="catalog-grid-top" className="px-4 sm:px-8 py-4 scroll-mt-24">
                        {/* Cabeçalho do Filtro / Categoria com Estilo Neon e Layout Limpo */}
                        <div className="mb-6 flex items-center justify-between gap-3 border-b border-zinc-900/80 pb-4">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-3">
                              {getGridIcon()}
                              <h2 className="text-xl sm:text-2xl font-black font-display text-white uppercase tracking-tight">
                                {getGridTitle()}
                              </h2>
                            </div>
                          </div>

                          {/* Indicador de Páginas Rápido no Topo */}
                          {totalCatalogPages > 1 && (
                            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                              <span className="text-[11px] sm:text-xs font-mono font-bold text-zinc-400 hidden sm:inline">
                                Pág. <strong className="text-white font-black">{catalogPage}</strong>/{totalCatalogPages}
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleCatalogPageChange(catalogPage - 1)}
                                  disabled={catalogPage === 1}
                                  className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                                  title="Página anterior"
                                >
                                  <ChevronLeft className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleCatalogPageChange(catalogPage + 1)}
                                  disabled={catalogPage === totalCatalogPages}
                                  className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                                  title="Próxima página"
                                >
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Grade de Cards Paginada em 50 por 50 Itens */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-y-6 gap-x-4 sm:gap-x-5">
                          {paginatedCatalogMovies.map(movie => (
                            <div
                              key={movie.id}
                              onClick={() => handleSelectMovie(movie)}
                              className={`relative bg-zinc-950 border rounded-lg overflow-hidden transition-all cursor-pointer group ${
                                movie.isRecommended
                                  ? 'border-amber-500/50 hover:border-amber-400 hover:shadow-xl hover:shadow-amber-500/20'
                                  : 'border-zinc-900 hover:border-rose-500 hover:shadow-xl hover:shadow-rose-600/10'
                              }`}
                              id={`search-grid-card-${movie.id}`}
                            >
                              <div className="aspect-[2/3] overflow-hidden bg-zinc-900 relative">
                                <img 
                                  src={getCleanPosterUrl(movie.posterUrl)} 
                                  alt={movie.title} 
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  loading="lazy"
                                  decoding="async"
                                  referrerPolicy="no-referrer"
                                  onError={handlePosterError}
                                />
                                <div className="absolute top-2 left-2 bg-black/85 border border-zinc-800/80 text-[9px] font-mono font-bold text-zinc-200 px-1.5 py-0.5 rounded shadow z-20">
                                  {movie.year}
                                </div>

                                {/* Selo Oficial de Recomendação do Administrador Rafael na Capa */}
                                {movie.isRecommended && (
                                  <div className="absolute top-2 right-2 z-20">
                                    <RecommendationBadge variant="card" />
                                  </div>
                                )}
                              </div>
                              <div className="p-2 sm:p-3 bg-zinc-950 border-t border-zinc-900 h-14 sm:h-16 flex flex-col justify-between">
                                <span className="font-semibold text-xs sm:text-sm text-zinc-200 truncate group-hover:text-rose-500 block">{movie.title}</span>
                                <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono leading-none">
                                  <span className="text-yellow-400 font-bold flex items-center gap-0.5"><Star className="w-2.5 h-2.5 fill-yellow-400" /> {movie.rating}</span>
                                  <span className="text-zinc-400 font-bold truncate max-w-[80px]">{movie.category}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Paginação Completa de 50 em 50 Itens ao Final da Grade */}
                        {totalCatalogPages > 1 && (
                          <div className="mt-10 pt-6 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="text-xs text-zinc-400 font-sans text-center sm:text-left">
                              Exibindo <strong className="text-zinc-200 font-mono">{(catalogPage - 1) * ITEMS_PER_CATALOG_PAGE + 1}–{Math.min(catalogPage * ITEMS_PER_CATALOG_PAGE, filteredMovies.length)}</strong> de <strong className="text-zinc-200 font-mono">{filteredMovies.length}</strong> títulos • Página <strong className="text-white font-mono font-bold">{catalogPage}</strong> de <strong className="text-zinc-200 font-mono">{totalCatalogPages}</strong> <span className="text-zinc-500 text-[11px] font-mono">(50 títulos por página)</span>
                            </div>

                            <div className="flex items-center gap-1.5 flex-wrap justify-center">
                              {/* Botão Anterior */}
                              <button
                                onClick={() => handleCatalogPageChange(catalogPage - 1)}
                                disabled={catalogPage === 1}
                                className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 hover:border-zinc-700 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <ChevronLeft className="w-4 h-4" />
                                <span className="hidden xs:inline">Anterior</span>
                              </button>

                              {/* Números das páginas */}
                              {(() => {
                                const pages: (number | string)[] = [];
                                const maxButtons = 7;
                                if (totalCatalogPages <= maxButtons) {
                                  for (let i = 1; i <= totalCatalogPages; i++) pages.push(i);
                                } else {
                                  pages.push(1);
                                  if (catalogPage > 3) pages.push('ellipsis-prev');
                                  
                                  const start = Math.max(2, catalogPage - 1);
                                  const end = Math.min(totalCatalogPages - 1, catalogPage + 1);
                                  for (let i = start; i <= end; i++) {
                                    if (!pages.includes(i)) pages.push(i);
                                  }
                                  
                                  if (catalogPage < totalCatalogPages - 2) pages.push('ellipsis-next');
                                  if (!pages.includes(totalCatalogPages)) pages.push(totalCatalogPages);
                                }

                                return pages.map((p, idx) => {
                                  if (typeof p === 'string') {
                                    return (
                                      <span key={`ellipsis-${idx}`} className="px-2 text-zinc-600 font-mono text-xs select-none">
                                        •••
                                      </span>
                                    );
                                  }
                                  const isActive = p === catalogPage;
                                  return (
                                    <button
                                      key={p}
                                      onClick={() => handleCatalogPageChange(p)}
                                      className={`min-w-[34px] h-[34px] px-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center ${
                                        isActive
                                          ? 'bg-red-600 text-white border border-red-500 shadow-md shadow-red-600/40 font-black'
                                          : 'bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-850 hover:border-zinc-700'
                                      }`}
                                    >
                                      {p}
                                    </button>
                                  );
                                });
                              })()}

                              {/* Botão Próxima */}
                              <button
                                onClick={() => handleCatalogPageChange(catalogPage + 1)}
                                disabled={catalogPage === totalCatalogPages}
                                className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 hover:border-zinc-700 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <span className="hidden xs:inline">Próxima</span>
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()
                )}

              </div>
            </div>
          )}

          {/* RODAPÉ LIMPO E MODERNO */}
          <footer className="border-t border-zinc-900/60 bg-zinc-950/95 py-8 px-6 sm:px-12 text-zinc-500 font-sans mt-auto">
            <div className="max-w-4xl mx-auto text-center space-y-3">
              <p className="text-xs sm:text-sm text-zinc-400 font-medium leading-relaxed">
                Esse site não hospeda nenhum vídeo em seu servidor. Todo o conteúdo é disponibilizado por terceiros.
              </p>
              <div className="flex items-center justify-center gap-2 text-[11px] sm:text-xs text-zinc-500 font-mono">
                <span className="text-zinc-300 font-bold tracking-wider">VHSFLIX</span>
                <span>© 2026</span>
                <span>•</span>
                <span>Todos os direitos reservados.</span>
              </div>
            </div>
          </footer>

          {/* --- MODAL DE DETALHE COMPACTO --- */}
          <MovieDetailModal
            movie={selectedMovie ? (movies.find(m => m.id === selectedMovie.id) || selectedMovie) : null}
            isOpen={selectedMovie !== null}
            onClose={() => setSelectedMovie(null)}
            myList={activeProfile ? activeProfile.myList : []}
            onToggleMyList={(id) => handleToggleMyList(id)}
            watchHistory={activeProfile ? activeProfile.watchHistory : {}}
            onUpdateProgress={handleUpdateWatchProgress}
            adguardEnabled={adguardEnabled}
            onVoteMovie={handleVoteMovie}
            activeProfileId={activeProfile ? activeProfile.id : ''}
            tmdbApiKey={tmdbApiKey}
            abyssApiKey={abyssApiKey}
            movies={movies}
            onSelectMovie={handleSelectMovie}
            comments={comments}
            onAddComment={handleAddComment}
            onDeleteComment={handleDeleteComment}
            currentUser={activeUser}
            activeProfile={activeProfile}
            onToggleRecommendation={handleToggleRecommendation}
          />

          {/* --- SISTEMA DE TOAST DE NOTIFICAÇÃO AO VIVO RETRÔ --- */}
          <AnimatePresence>
            {toast && (() => {
              const toastMovie = movies.find(m => m.id === toast.movieId);
              const poster = toastMovie?.posterUrl || toast.posterUrl;
              const hasPoster = !!poster;
              const titleToShow = toastMovie?.title || toast.title;
              const descToShow = toastMovie?.description || toast.message;
              const categoryToShow = toastMovie?.category || (toast.type === 'series' ? 'Série Retrô' : toast.type === 'movie' ? 'Filme' : 'VHSFLIX');
              
              return (
                <motion.div
                  initial={{ opacity: 0, y: 70, scale: 0.9, rotateX: 10 }}
                  animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
                  exit={{ opacity: 0, y: 30, scale: 0.92, transition: { duration: 0.22, ease: 'easeIn' } }}
                  style={{ perspective: 1000 }}
                  className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-[9999] max-w-none sm:max-w-[390px] w-auto sm:w-full bg-black/90 border border-rose-500/40 rounded-2xl p-4 shadow-[0_10px_40px_rgba(244,63,94,0.18)] backdrop-blur-xl flex gap-3.5 select-none overflow-hidden"
                  id={`live-toast-${toast.id}`}
                >
                  {/* Linha de Progresso/Duração que some aos poucos na base */}
                  <motion.div 
                    initial={{ width: '100%' }}
                    animate={{ width: '0%' }}
                    transition={{ duration: 8.5, ease: 'linear' }}
                    className="absolute bottom-0 left-0 h-[3.5px] bg-gradient-to-r from-red-500 via-rose-500 to-amber-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" 
                  />

                  {/* Capa Clássica de Fita VHS */}
                  {hasPoster ? (
                    <div className="relative w-18 sm:w-22 aspect-[2/3] rounded-lg overflow-hidden shrink-0 border border-zinc-800 shadow-[0_4px_16px_rgba(0,0,0,0.6)] group">
                      <img
                        src={getCleanPosterUrl(poster)}
                        alt={titleToShow}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                        onError={handlePosterError}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-40" />
                    </div>
                  ) : (
                    <div className="w-18 h-18 rounded-xl bg-zinc-950 border border-zinc-850 flex items-center justify-center shrink-0 text-rose-500 shadow-inner">
                      <Bell className="w-6 h-6 text-rose-500 animate-pulse" />
                    </div>
                  )}

                  {/* Conteúdo Técnico e Sinopse */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                    <div>
                      {/* Categoria / Tipo e Botão Fechar */}
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[9px] uppercase font-mono font-black tracking-widest text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 leading-none">
                          <Sparkles className="w-2.5 h-2.5 text-rose-400 fill-current animate-pulse" />
                          {categoryToShow}
                        </span>
                        
                        <button
                          onClick={() => setToast(null)}
                          className="text-zinc-500 hover:text-rose-400 p-1 hover:bg-zinc-900 rounded-lg transition-all cursor-pointer"
                          title="Descartar aviso"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Nome do Conteúdo */}
                      <h4 className="text-xs sm:text-sm font-black font-sans text-white uppercase tracking-tight line-clamp-1">
                        {titleToShow}
                      </h4>

                      {/* Descrição em Prosa */}
                      <p className="text-[10px] text-zinc-400 font-sans mt-1 leading-relaxed line-clamp-2 text-justify">
                        {descToShow}
                      </p>
                    </div>

                    {/* Rodapé Dinâmico com Play */}
                    {toastMovie ? (
                      <button
                        onClick={() => {
                          setSelectedMovie(toastMovie);
                          setToast(null);
                        }}
                        className="mt-3 w-full bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 active:scale-[0.97] transition-all text-white font-mono text-[9px] font-black uppercase tracking-widest py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 shadow-[0_2px_10px_rgba(244,63,94,0.3)] cursor-pointer"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Sintonizar Fita Agora</span>
                      </button>
                    ) : (
                      <div className="mt-2.5 text-[8px] font-mono text-zinc-500 text-right uppercase tracking-wider">
                        Atualizado • VHSFLIX BRASIL
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })()}
          </AnimatePresence>

        </div>
      )}
    </div>
  );
}
