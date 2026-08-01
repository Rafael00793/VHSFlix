/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Movie, User, Profile, WatchProgress, AppNotification, MovieRequest, getSubscriptionDaysLeft, renewSubscription } from './types';
import { INITIAL_MOVIES, INITIAL_USERS, DEFAULT_PROFILES, GENRE_CATEGORIES, getMovieDetailsTMDB } from './data';
import Navbar from './components/Navbar';
import ProfileSelector from './components/ProfileSelector';
import MovieRow from './components/MovieRow';
import MovieDetailModal from './components/MovieDetailModal';
import AdminPanel from './components/AdminPanel';
import RequestsPanel from './components/RequestsPanel';
import SupportPanel from './components/SupportPanel';
import { Play, Info, Sparkles, Star, Plus, Check, Shield, HelpCircle, AlertCircle, Heart, HeartOff, Volume1, Volume2, VolumeX, Bell, X, Flame, LayoutGrid, List, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, saveUsersToFirestore, deleteUserFromFirestore, saveProfilesToFirestore, saveMoviesToFirestore, saveSingleMovieToFirestore, deleteMovieFromFirestore, saveSettingsToFirestore, saveRequestsToFirestore, deleteRequestFromFirestore, handleFirestoreError, OperationType, saveSingleNotificationToFirestore, deleteNotificationFromFirestore } from './lib/firebase';
import { onSnapshot, collection, doc, setDoc, getDoc } from 'firebase/firestore';



// Auxiliar para obter peso de ordenação: fitas recém-adicionadas (customizadas pelo admin) ficam no topo.
// As fitas originais (id como m_2026_x) ficam logo abaixo, mantendo sua ordem de índice original intacta.
function getMovieSortingWeight(m: Movie): number {
  if (!m.id) return 0;
  const customMatch = m.id.match(/^m_(\d{10,})$/);
  if (customMatch) {
    return parseInt(customMatch[1]); // ex: timestamp Date.now() ~ 1.7e12
  }
  const digitsMatch = m.id.match(/\d{8,}/);
  if (digitsMatch) {
    return parseInt(digitsMatch[0]);
  }
  if (m.abyssEmbedUrl || m.embedUrl) {
    return 200000000;
  }
  const initialMatch = m.id.match(/^m_2026_(\d+)$/);
  if (initialMatch) {
    return 100000 - parseInt(initialMatch[1]);
  }
  return 50000;
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
    return saved ? JSON.parse(saved) : DEFAULT_PROFILES;
  });

  const [movies, setMovies] = useState<Movie[]>(() => {
    const saved = localStorage.getItem('vhsflix_movies');
    const base = saved ? JSON.parse(saved) : INITIAL_MOVIES;
    
    // Remove qualquer duplicata histórica persistida no localStorage por Title+Type ou TMDBID+Type
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

    return uniqueMovies.map((m: Movie, idx: number) => {
      const seed = (m.title?.length || 10) + idx * 7;
      return {
        ...m,
        clicksCount: m.clicksCount !== undefined ? m.clicksCount : (100 + (seed * 19) % 850),
        votesLikes: m.votesLikes !== undefined ? m.votesLikes : (45 + (seed * 13) % 400),
        votesDislikes: m.votesDislikes !== undefined ? m.votesDislikes : (2 + (seed * 3) % 25),
      };
    });
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

  const [vhsMode, setVhsMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('vhsflix_vhs_mode');
    return saved ? JSON.parse(saved) : true; // Ativo por padrão pois dá o charme do VHSFLIX
  });

  // Perfis ativos atuais
  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    return localStorage.getItem('vhsflix_current_uid') || INITIAL_USERS[0].id;
  });

  const [currentProfileId, setCurrentProfileId] = useState<string | null>(() => {
    return localStorage.getItem('vhsflix_current_pid') || null;
  });

  // Abas de navegação do usuário na plataforma
  const [activeTab, setActiveTab] = useState<'all' | 'movies' | 'series' | 'mylist' | 'requests' | 'support'>('all');
  const [myListViewMode, setMyListViewMode] = useState<'grid' | 'vertical_list' | 'carousel'>(() => (localStorage.getItem('vhsflix_mylist_view') as any) || 'vertical_list');
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
    });

    // 2. Escuta em tempo real a coleção de perfis
    const unsubProfiles = onSnapshot(collection(db, 'profiles'), (snapshot) => {
      const fetchedProfiles: { [userId: string]: Profile[] } = {};
      let hasData = false;
      snapshot.forEach((doc) => {
        hasData = true;
        const data = doc.data();
        if (data.userId && data.profiles) {
          fetchedProfiles[data.userId] = data.profiles;
        }
      });
      if (!hasData) {
        // Se estiver vazio, popula com os perfis padrão
        saveProfilesToFirestore(DEFAULT_PROFILES);
      } else {
        setAllProfiles(fetchedProfiles);
      }
    });

    // 3. Escuta em tempo real a coleção de filmes/séries (catálogo)
    const unsubMovies = onSnapshot(collection(db, 'movies'), (snapshot) => {
      const fetchedMovies: Movie[] = [];
      snapshot.forEach((doc) => {
        fetchedMovies.push(doc.data() as Movie);
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
    });

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
    });

    // 5. Escuta em tempo real os pedidos dos usuários
    const unsubRequests = onSnapshot(collection(db, 'requests'), (snapshot) => {
      const fetchedRequests: MovieRequest[] = [];
      snapshot.forEach((doc) => {
        fetchedRequests.push(doc.data() as MovieRequest);
      });
      // Ordenar por data de criação de forma decrescente
      fetchedRequests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setRequests(fetchedRequests);
    });

    // 6. Escuta em tempo real as notificações
    const unsubNotifications = onSnapshot(collection(db, 'notifications'), (snapshot) => {
      const fetchedNotifs: AppNotification[] = [];
      snapshot.forEach((doc) => {
        fetchedNotifs.push(doc.data() as AppNotification);
      });
      // Ordenar por data de criação de forma decrescente
      fetchedNotifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setDbNotifications(fetchedNotifs);
    });

    return () => {
      unsubUsers();
      unsubProfiles();
      unsubMovies();
      unsubSettings();
      unsubRequests();
      unsubNotifications();
    };
  }, []);

  // --- EFEITOS DE SINCRONIZAÇÃO COM LOCALSTORAGE (100% OFFLINE E SEGURO) ---
  const [hasLoadedUsers, setHasLoadedUsers] = useState(true);
  const [hasLoadedProfiles, setHasLoadedProfiles] = useState(true);
  const [hasLoadedMovies, setHasLoadedMovies] = useState(true);
  const [hasLoadedRequests, setHasLoadedRequests] = useState(true);
  const [hasLoadedSettings, setHasLoadedSettings] = useState(true);

  // Synchronize state changes to LocalStorage instantly (Professional Offline System)
  useEffect(() => {
    localStorage.setItem('vhsflix_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('vhsflix_profiles', JSON.stringify(allProfiles));
  }, [allProfiles]);

  useEffect(() => {
    localStorage.setItem('vhsflix_movies', JSON.stringify(movies));
  }, [movies]);

  useEffect(() => {
    localStorage.setItem('vhsflix_movie_requests', JSON.stringify(requests));
  }, [requests]);

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
    localStorage.setItem('vhsflix_vhs_mode', JSON.stringify(vhsMode));
  }, [vhsMode]);

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
    return users.find(u => u.id === currentUserId) || users[0];
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

  const activeProfile = useMemo(() => {
    const userProfs = allProfiles[currentUserId] || [];
    return userProfs.find(p => p.id === currentProfileId) || null;
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

  // Fita VHS Mais Desejada (Baseado no sistema de mais assistidos / mais clicados)
  const mostDesejadaMovie = useMemo(() => {
    if (movies.length === 0) return null;
    const sorted = [...movies].sort((a, b) => {
      const clicksA = a.clicksCount || 0;
      const clicksB = b.clicksCount || 0;
      if (clicksB !== clicksA) {
        return clicksB - clicksA;
      }
      return (b.rating || 0) - (a.rating || 0);
    });
    return sorted[0];
  }, [movies]);

  // Mais Votados da Audiência (Ordenado por Likes)
  const moviesSortedByLikes = useMemo(() => {
    return [...movies].sort((a, b) => (b.votesLikes || 0) - (a.votesLikes || 0));
  }, [movies]);

  // Lançamentos VHS (Ordenado dinamicamente por recém-adicionados, ano de lançamento mais recente e data de criação)
  const moviesSortedByYear = useMemo(() => {
    return [...movies].sort((a, b) => {
      const yearA = a.year || 1990;
      const yearB = b.year || 1990;
      if (yearB !== yearA) return yearB - yearA;

      const weightA = getMovieSortingWeight(a);
      const weightB = getMovieSortingWeight(b);
      if (weightB !== weightA) return weightB - weightA;

      return (b.rating || 0) - (a.rating || 0);
    });
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

  // Filtra catálogo com base em busca e na aba ativa
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

    // Filtros por abas do Estilo Netflix
    if (activeTab === 'movies') {
      list = list.filter(m => m.type === 'movie');
      list.sort((a, b) => getMovieSortingWeight(b) - getMovieSortingWeight(a));
    } else if (activeTab === 'series') {
      list = list.filter(m => m.type === 'series');
      list.sort((a, b) => getMovieSortingWeight(b) - getMovieSortingWeight(a));
    } else if (activeTab === 'mylist' && activeProfile) {
      list = list.filter(m => activeProfile.myList.includes(m.id));
    }

    // Filtro por categoria selecionada (Estática Netflix)
    if (selectedCategory) {
      if (selectedCategory === 'Melhores Avaliações') {
        list = list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      } else if (selectedCategory === 'Séries') {
        list = list.filter(m => m.type === 'series');
        list.sort((a, b) => getMovieSortingWeight(b) - getMovieSortingWeight(a));
      } else {
        list = list.filter(m => m.category === selectedCategory);
        list.sort((a, b) => getMovieSortingWeight(b) - getMovieSortingWeight(a));
      }
    }

    return list;
  }, [movies, activeTab, activeProfile, searchVal, selectedCategory]);

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
      return {
        ...prev,
        [currentUserId]: userList.map(p => p.id === profileId ? { ...p, name, avatarUrl } : p)
      };
    });
  };

  const handleLogoutProfile = () => {
    setCurrentProfileId(null);
    setIsAdminView(false);
  };

  // --- TRATADORES DE LISTA E WATCH HISTORY (LOCALSTORAGE ENGINE) ---
  const handleToggleMyList = (movieId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation(); // Evita abrir o modal se clicar no card
    if (!currentProfileId) return;

    setAllProfiles(prev => {
      const userList = prev[currentUserId] || [];
      const updatedList = userList.map(p => {
        if (p.id === currentProfileId) {
          const exists = p.myList.includes(movieId);
          const nextMyList = exists 
            ? p.myList.filter(id => id !== movieId) 
            : [...p.myList, movieId];
          return { ...p, myList: nextMyList };
        }
        return p;
      });
      return { ...prev, [currentUserId]: updatedList };
    });
  };

  const handleUpdateWatchProgress = (
    movieId: string, 
    progress: number, 
    currentTime: number, 
    duration: number, 
    isFinished: boolean
  ) => {
    if (!currentProfileId) return;

    setAllProfiles(prev => {
      const userList = prev[currentUserId] || [];
      const updatedList = userList.map(p => {
        if (p.id === currentProfileId) {
          const currentProgress: WatchProgress = {
            movieId,
            progress,
            currentTime,
            duration,
            updatedAt: new Date().toISOString(),
            isFinished
          };

          const nextHistory = { ...p.watchHistory };
          if (isFinished) {
            // Se concluiu a fita, marcamos como finalizado
            nextHistory[movieId] = { ...currentProgress, progress: 100, isFinished: true };
          } else {
            nextHistory[movieId] = currentProgress;
          }

          return { ...p, watchHistory: nextHistory };
        }
        return p;
      });
      return { ...prev, [currentUserId]: updatedList };
    });
  };

  // --- TRATADORES DO PAINEL ADMIN CORADOS GERAIS ---
  const handleAddMovie = (newMovieData: Omit<Movie, 'id'>) => {
    // Verificar se já existe um filme ou série com o mesmo título ou mesmo tmdbId e mesmo tipo
    const isDuplicate = movies.some(m => {
      // Se forem de tipos diferentes (filme vs série), não é duplicado
      if (m.type !== newMovieData.type) {
        return false;
      }
      // Se ambos tiverem tmdbId e forem IDs diferentes, não é duplicado
      if (newMovieData.tmdbId && m.tmdbId && newMovieData.tmdbId !== m.tmdbId) {
        return false;
      }
      
      const existingTitle = (m.title || '').trim().toLowerCase();
      const incomingTitle = (newMovieData.title || '').trim().toLowerCase();
      
      if (existingTitle === incomingTitle) {
        // Mesmo título e tipo. Verificar se o ano de lançamento é diferente!
        const y1 = m.year ? String(m.year).trim() : '';
        const y2 = newMovieData.year ? String(newMovieData.year).trim() : '';
        if (y1 && y2 && y1 !== y2) {
          return false; // Anos diferentes! Permitir duplicata saudável (ex: A Múmia de 1999 e 2017)
        }
        return true; // Sem distinção de ano ou mesmo ano, é duplicado!
      }
      
      // Se tem exatamente o mesmo tmdbId
      if (newMovieData.tmdbId && m.tmdbId && m.tmdbId === newMovieData.tmdbId) {
        return true;
      }
      
      return false;
    });

    const existingMovie = movies.find(m => {
      if (m.type !== newMovieData.type) return false;
      if (newMovieData.tmdbId && m.tmdbId && m.tmdbId === newMovieData.tmdbId) return true;
      const existingTitle = (m.title || '').trim().toLowerCase();
      const incomingTitle = (newMovieData.title || '').trim().toLowerCase();
      if (existingTitle === incomingTitle) {
        const y1 = m.year ? String(m.year).trim() : '';
        const y2 = newMovieData.year ? String(newMovieData.year).trim() : '';
        if (y1 && y2 && y1 !== y2) return false;
        return true;
      }
      return false;
    });

    if (existingMovie) {
      // Atualizar o título existente no acervo mesclando as novas informações de temporadas/episódios
      const updatedMovie: Movie = {
        ...existingMovie,
        ...newMovieData,
        id: existingMovie.id,
        episodeEmbeds: {
          ...(existingMovie.episodeEmbeds || {}),
          ...(newMovieData.episodeEmbeds || {})
        },
        seasonsConfig: {
          ...(existingMovie.seasonsConfig || {}),
          ...(newMovieData.seasonsConfig || {})
        }
      };

      setMovies(prev => prev.map(m => m.id === existingMovie.id ? updatedMovie : m));
      saveSingleMovieToFirestore(updatedMovie);

      const tipo = updatedMovie.type === 'series' ? 'Série' : 'Filme';
      triggerNotification(
        '🔄 Item Atualizado!',
        `${tipo} "${updatedMovie.title}" foi atualizado(a) com sucesso com as novas temporadas e episódios!`,
        updatedMovie.id,
        updatedMovie.type === 'series' ? 'series' : 'movie',
        updatedMovie.posterUrl
      );

      return true; // Sucesso ao atualizar
    }

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

    // Registrar fita automaticamente no Abyss
    fetch('/api/abyss/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tmdbId: newMovie.tmdbId,
        type: newMovie.type,
        title: newMovie.title
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
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
    fetch('/api/abyss/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tmdbId: editedMovie.tmdbId,
        type: editedMovie.type,
        title: editedMovie.title
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
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

  const handleDeleteMovie = (movieId: string) => {
    // Apenas o Administrador Rafael (rafaelguaruja09@gmail.com) tem permissão de excluir
    const userEmail = activeUser?.email || '';
    if (userEmail !== 'rafaelguaruja09@gmail.com') {
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
    triggerNotification(
      '📼 Item Excluído',
      'O item foi removido com sucesso do catálogo sob o seu comando.',
      '',
      'system'
    );
  };

  const handleBulkDeleteMovies = (movieIds: string[]) => {
    // Apenas o Administrador Rafael (rafaelguaruja09@gmail.com) tem permissão de excluir
    const userEmail = activeUser?.email || '';
    if (userEmail !== 'rafaelguaruja09@gmail.com') {
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
    triggerNotification(
      '📼 Itens Excluídos em Lote',
      `${movieIds.length} itens foram removidos com sucesso do catálogo sob o seu comando.`,
      '',
      'system'
    );
  };

  const handleResetCatalog = () => {
    // Apenas o Administrador Rafael (rafaelguaruja09@gmail.com) tem permissão de restaurar
    const userEmail = activeUser?.email || '';
    if (userEmail !== 'rafaelguaruja09@gmail.com') {
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
    saveSingleMovieToFirestore(updatedMovie);
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

    // Save immediately to Firestore
    saveSingleMovieToFirestore(updatedMovie);
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

    // Salva o pedido diretamente no Firestore
    saveRequestsToFirestore([newRequest]);

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
      
      {/* EFEITO FILTRO CRT DE TUBO VHS (RETRO AESTHETIC) */}
      {vhsMode && <div className="vhs-crt-overlay vhs-crt-flicker pointer-events-none" />}

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
                  setCurrentUserId('');
                  sessionStorage.removeItem('vhs_session_logged_in');
                  window.location.reload();
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
            onSwitchUser={() => setCurrentProfileId(null)}
            searchVal={searchVal}
            onSearchChange={setSearchVal}
            activeTab={activeTab}
            onTabChange={(tab) => { setActiveTab(tab); setSelectedCategory(null); setIsAdminView(false); }}
            isAdminView={isAdminView}
            onToggleAdminView={setIsAdminView}
            vhsMode={vhsMode}
            onToggleVhsMode={() => setVhsMode(!vhsMode)}
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
                <div className="relative h-[62vh] sm:h-[84vh] w-full bg-zinc-950 flex flex-col justify-end select-none border-b border-zinc-900/40 overflow-hidden group">
                  
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
                      <img
                        src={featuredMovie.backdropUrl}
                        alt={featuredMovie.title}
                        className="w-full h-full object-cover select-none brightness-[0.70] scale-102 hover:scale-105 transition-transform duration-10000"
                        referrerPolicy="no-referrer"
                      />
                      {/* Sombras pretas de ambientação */}
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/25 to-black/20" />
                      <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/90 via-transparent to-transparent hidden md:block" />
                    </motion.div>
                  </AnimatePresence>

                  {/* Detalhes e botões informativos */}
                  <div className="relative z-20 max-w-[1400px] w-full mx-auto px-4 sm:px-8 pb-12 sm:pb-24 flex flex-col items-start text-left">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={`meta-${featuredMovie.id}`}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.45 }}
                        className="flex flex-col items-start"
                      >
                        {/* Batches com estilo Premium rotativos e dinâmicos */}
                        <div className="flex flex-wrap items-center gap-2 mb-3.5 sm:mb-5">
                          {featuredMovie.year >= new Date().getFullYear() ? (
                            <span className="bg-rose-600 text-white font-mono text-[9px] sm:text-[10px] font-black px-2.5 py-1 rounded uppercase tracking-wider animate-pulse flex items-center gap-1 border border-rose-500/30 shadow-md">
                              <Sparkles className="w-3 h-3 text-white fill-current" />
                              <span>Lançamento {featuredMovie.year}</span>
                            </span>
                          ) : null}
                          
                          <span className="bg-zinc-900/90 border border-zinc-700/60 text-zinc-350 font-mono text-[9px] sm:text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest shadow">
                            🎬 {featuredMovie.category} • Destaque Retro
                          </span>
                          
                          <span className="bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-[9px] sm:text-[10px] font-semibold px-2 py-1 rounded shadow-sm">
                            ⭐ {featuredMovie.rating}
                          </span>
                        </div>
                        
                        {/* Título com Display Typography e espaçamento generoso */}
                        <h1 className="text-3xl sm:text-6xl font-black font-display tracking-widest text-white leading-tight uppercase max-w-2xl text-shadow whitespace-pre-line">
                          {featuredMovie.title}
                        </h1>

                        {/* Descrição Sinopse curta com efeito line-clamp responsivo */}
                        <p className="text-xs sm:text-base text-zinc-300 max-w-xl sm:max-w-2xl mt-4 line-clamp-3 leading-relaxed drop-shadow-sm font-light tracking-wide">
                          {featuredMovie.description}
                        </p>
                      </motion.div>
                    </AnimatePresence>

                    {/* Botões do destaque com animação de entrada e interatividade motion/react estilo Netflix/Amazon */}
                    <motion.div
                      key={`hero-btns-${featuredMovie.id}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.15 }}
                      className="flex items-center gap-3 sm:gap-4 mt-6 sm:mt-10"
                    >
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleFeaturedPlay(featuredMovie)}
                        className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm px-5 py-3 sm:px-7 sm:py-4 rounded-lg flex items-center gap-2.5 shadow-lg shadow-rose-600/30 transition-all cursor-pointer tracking-widest"
                        id="btn-hero-play"
                      >
                        <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-white" />
                        <span>PLAY</span>
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => handleSelectMovie(featuredMovie)}
                        className="bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white font-semibold text-xs sm:text-sm px-5 py-3 sm:px-6 sm:py-4 rounded-lg flex items-center gap-2 transition-colors cursor-pointer tracking-wider"
                        id="btn-hero-details"
                      >
                        <Info className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span>Ficha Técnica</span>
                      </motion.button>

                      {/* Botão rápido lista */}
                      <motion.button
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.90 }}
                        onClick={() => handleToggleMyList(featuredMovie.id)}
                        className={`p-3 sm:p-4 border rounded-full transition-all flex items-center justify-center cursor-pointer ${
                          activeProfile.myList.includes(featuredMovie.id)
                            ? 'bg-rose-500/10 border-rose-500 text-rose-400'
                            : 'border-zinc-750 text-zinc-400 hover:text-white hover:border-zinc-500 bg-zinc-900/60'
                        }`}
                        title="Adicionar à lista"
                        id="btn-hero-add-list"
                      >
                        {activeProfile.myList.includes(featuredMovie.id) ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      </motion.button>
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

                {/* --- 2.B.I: ROW DE CONTINUAR ASSISTINDO --- */}
                {!searchVal && !selectedCategory && activeTab === 'all' && (
                  (() => {
                    // Seleciona filmes com histórico de progresso ativo e inacabado
                    const progressHistory = (Object.values(activeProfile.watchHistory) as WatchProgress[])
                      .filter(p => p.progress > 0 && !p.isFinished)
                      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
                    
                    const listToResume = progressHistory
                      .map(p => movies.find(m => m.id === p.movieId))
                      .filter((m): m is Movie => !!m);

                    if (listToResume.length === 0) return null;

                    return (
                      <MovieRow
                        title="Continuar Assistindo"
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

                {/* --- 2.B.I.B: SPOTHLIGHT / HIGHLIGHT DA FITA VHS MAIS DESEJADA (SISTEMA REAL DE CLIQUES) --- */}
                {!searchVal && !selectedCategory && activeTab === 'all' && mostDesejadaMovie && (
                  <div className="px-4 sm:px-8 mb-10 select-none animate-fade-in">
                    <div className="relative overflow-hidden rounded-2xl border border-rose-500/30 bg-gradient-to-br from-zinc-950 via-zinc-900/90 to-zinc-950 p-5 sm:p-7 flex flex-col md:flex-row items-center gap-6 shadow-2xl shadow-rose-950/20">
                      {/* Efeitos neon glow de fundo */}
                      <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/10 rounded-full blur-[100px] pointer-events-none"></div>
                      <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none"></div>

                      {/* Poster */}
                      <div 
                        onClick={() => handleSelectMovie(mostDesejadaMovie)}
                        className="relative shrink-0 w-32 sm:w-40 aspect-[2/3] rounded-lg overflow-hidden border-2 border-rose-500/80 shadow-lg shadow-rose-500/20 scale-100 hover:scale-[1.03] transition-all duration-300 cursor-pointer"
                      >
                        <img 
                          src={mostDesejadaMovie.posterUrl} 
                          alt={mostDesejadaMovie.title}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        {/* Etiqueta VHS Clássica */}
                        <div className="absolute top-2 left-2 bg-rose-600 text-white font-mono text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded shadow">
                          MAIS DESEJADO
                        </div>
                      </div>

                      {/* Informações detalhadas da fita mais assistida */}
                      <div className="flex-1 text-center md:text-left flex flex-col items-center md:items-start">
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
                          <span className="text-[10px] sm:text-xs font-mono font-black text-rose-500 uppercase tracking-widest bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20 flex items-center gap-1">
                            <Flame className="w-3 sm:w-3.5 h-3 sm:h-3.5 fill-current animate-pulse text-rose-500" />
                            📼 Fita VHS Mais Desejada
                          </span>
                          <span className="text-[9px] sm:text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1 font-bold">
                            🔥 {mostDesejadaMovie.clicksCount || 0} acessos à fita
                          </span>
                        </div>

                        <h3 className="text-xl sm:text-2xl font-black text-white font-sans mt-3 tracking-tight uppercase leading-tight text-shadow">
                          {mostDesejadaMovie.title}
                        </h3>

                        <p className="text-xs text-zinc-400 mt-2 max-w-xl leading-relaxed text-justify md:text-left line-clamp-2">
                          {mostDesejadaMovie.description}
                        </p>

                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs font-mono text-zinc-400 mt-4">
                          <span className="flex items-center gap-1"><Star className="w-4 h-4 text-yellow-400 fill-current" /> <strong className="text-white">{mostDesejadaMovie.rating}</strong>/10</span>
                          <span>•</span>
                          <span>Categoria: <strong className="text-white">{mostDesejadaMovie.category}</strong></span>
                          <span>•</span>
                          <span>Temporada/Duração: <strong className="text-white">{mostDesejadaMovie.duration}</strong></span>
                        </div>

                        {/* Botões rápidos de ação */}
                        <div className="flex flex-wrap items-center gap-3 mt-5">
                          <button
                            onClick={() => handleSelectMovie(mostDesejadaMovie)}
                            className="bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-mono text-[10px] sm:text-xs font-black uppercase tracking-wider px-5 py-2.5 rounded-lg flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-rose-950/40 animate-pulse"
                          >
                            <Play className="w-4 h-4 fill-current" />
                            <span>Sintonizar Fita</span>
                          </button>
                          
                          <button
                            onClick={() => {
                              if (!activeProfile) return;
                              handleToggleMyList(mostDesejadaMovie.id);
                            }}
                            className={`border font-mono text-[10px] sm:text-xs font-black uppercase tracking-wider px-5 py-2.5 rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
                              activeProfile.myList.includes(mostDesejadaMovie.id)
                                ? 'bg-rose-500/10 border-rose-500 text-rose-400'
                                : 'border-zinc-750 hover:border-zinc-500 text-zinc-300 hover:text-white bg-zinc-900/50'
                            }`}
                          >
                            {activeProfile.myList.includes(mostDesejadaMovie.id) ? (
                              <>
                                <Check className="w-4 h-4" />
                                <span>Na Minha Estante</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-4 h-4" />
                                <span>Salvar Estante</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* --- 2.B.II: ROWS MAIS VOTADOS, LANÇAMENTOS E MELHORES AVALIAÇÕES NA HOME PAGE OU MINHA LISTA NA ABA MYLIST --- */}
                {(!searchVal && !selectedCategory && (activeTab === 'all' || activeTab === 'mylist')) && (
                  (() => {
                    if (activeTab === 'all') {
                      return (
                        <div className="space-y-2">
                          <MovieRow
                            title="🏆 Mais Votados (Prêmio da Audiência)"
                            movies={moviesSortedByLikes}
                            watchHistory={activeProfile.watchHistory}
                            myList={activeProfile.myList}
                            onMovieClick={handleSelectMovie}
                            onToggleMyList={handleToggleMyList}
                            onPlayClick={handleFeaturedPlay}
                          />

                          <MovieRow
                            title="✨ Lançamentos VHS"
                            movies={moviesSortedByYear}
                            watchHistory={activeProfile.watchHistory}
                            myList={activeProfile.myList}
                            onMovieClick={handleSelectMovie}
                            onToggleMyList={handleToggleMyList}
                            onPlayClick={handleFeaturedPlay}
                          />

                          <MovieRow
                            title="⭐ Melhores Avaliações"
                            movies={moviesSortedByLikes.filter(m => (m.rating || 0) >= 8.0)} // or sortedByRating
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
                      const listMovies = movies.filter(m => activeProfile.myList.includes(m.id));
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
                              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2 mt-6 rounded"
                            >
                              Explorar Filmes & Séries
                            </button>
                          </div>
                        );
                      }
                      
                      return (
                        <div className="animate-fade-in">
                          {/* Cabeçalho Refinado com Seleção de Layout */}
                          <div className="px-4 sm:px-8 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                              <span className="text-zinc-500 font-mono text-[9px] sm:text-[10px] uppercase font-bold tracking-widest block mb-1">Coleção de Fitas Clássicas</span>
                              <h2 className="text-xl sm:text-2xl font-black font-display text-white uppercase tracking-tight">
                                Minha Lista <span className="text-rose-500 font-extrabold">({listMovies.length} {listMovies.length === 1 ? 'item' : 'itens'})</span>
                              </h2>
                            </div>
                            
                            {/* Seletor de visualização moderna */}
                            <div className="flex items-center gap-1.5 self-end sm:self-auto bg-zinc-950/40 p-1 rounded-xl border border-zinc-900/80">
                              <span className="text-zinc-500 font-mono font-bold mx-2 uppercase tracking-wider text-[8px] sm:text-[9px]">Sintonia:</span>
                              
                              {/* Modo Vertical */}
                              <button
                                onClick={() => setMyListViewMode('vertical_list')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono font-black uppercase tracking-widest transition-all cursor-pointer text-[9px] ${
                                  myListViewMode === 'vertical_list'
                                    ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                                }`}
                                title="Visualização Vertical Detalhada"
                              >
                                <List className="w-3.5 h-3.5" />
                                <span className="hidden xs:inline">Vertical</span>
                              </button>

                              {/* Modo Grade */}
                              <button
                                onClick={() => setMyListViewMode('grid')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono font-black uppercase tracking-widest transition-all cursor-pointer text-[9px] ${
                                  myListViewMode === 'grid'
                                    ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                                }`}
                                title="Visualização em Grade Compacta"
                              >
                                <LayoutGrid className="w-3.5 h-3.5" />
                                <span className="hidden xs:inline">Grade</span>
                              </button>

                              {/* Modo Carousel */}
                              <button
                                onClick={() => setMyListViewMode('carousel')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono font-black uppercase tracking-widest transition-all cursor-pointer text-[9px] ${
                                  myListViewMode === 'carousel'
                                    ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                                }`}
                                title="Carrossel clássico horizontal"
                              >
                                <svg className="w-3.5 h-3.5 text-current" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                                <span className="hidden xs:inline">Carrossel</span>
                              </button>
                            </div>
                          </div>

                          {/* 1. MODO LISTA DETALHADA VERTICAL (PROFISSIONAL & MODERNO) */}
                          {myListViewMode === 'vertical_list' && (
                            <div className="px-4 sm:px-8 space-y-4 max-w-5xl">
                              {listMovies.map((movie) => {
                                const progress = activeProfile.watchHistory[movie.id];
                                const hasProgress = progress && progress.progress > 0 && !progress.isFinished;
                                
                                return (
                                  <div
                                    key={movie.id}
                                    className="group relative bg-zinc-950/30 hover:bg-[#070709]/80 border border-zinc-900 hover:border-rose-500/30 rounded-xl p-3 sm:p-4.5 transition-all duration-300 flex flex-col sm:flex-row gap-5 items-start sm:items-center overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-rose-950/10"
                                    id={`mylist-vertical-${movie.id}`}
                                  >
                                    {/* Enfeite neon de borda lateral no hover */}
                                    <div className="absolute top-0 left-0 w-[3px] h-full bg-rose-500/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    
                                    {/* Capa/Poster da Fita */}
                                    <div 
                                      onClick={() => handleSelectMovie(movie)}
                                      className="relative w-20 sm:w-26 aspect-[2/3] shrink-0 rounded-lg overflow-hidden border border-zinc-850 group-hover:border-rose-500/60 shadow-md cursor-pointer transform group-hover:scale-[1.02] transition-all duration-300"
                                    >
                                      <img 
                                        src={movie.posterUrl} 
                                        alt={movie.title} 
                                        className="w-full h-full object-cover"
                                        referrerPolicy="no-referrer"
                                      />
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                                      
                                      {/* Badge superior na imagem */}
                                      <div className="absolute top-1.5 left-1.5 bg-zinc-950/80 border border-zinc-800/80 text-[8px] font-mono font-bold text-zinc-300 px-1.5 py-0.5 rounded leading-none uppercase">
                                        {movie.type === 'series' ? 'Série' : 'Movie'}
                                      </div>
                                    </div>
                                    
                                    {/* Miolo Informativo */}
                                    <div className="flex-1 w-full min-w-0 flex flex-col justify-between">
                                      <div>
                                        <div className="flex flex-wrap items-center gap-2 mb-2 text-[10px] font-mono text-zinc-500">
                                          <span className="text-rose-500 font-extrabold bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider text-[9px]">
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
                                        </div>
                                        
                                        <h3 
                                          onClick={() => handleSelectMovie(movie)}
                                          className="text-base sm:text-lg font-black text-white hover:text-rose-500 transition-colors uppercase tracking-tight truncate cursor-pointer font-sans"
                                        >
                                          {movie.title}
                                        </h3>
                                        
                                        <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed line-clamp-2 pr-2 font-sans text-justify sm:text-left">
                                          {movie.description}
                                        </p>
                                      </div>
                                      
                                      {/* Rodapé Interno com Estrelas & Progresso se houver */}
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
                                        title="Remover da lista de favoritos"
                                      >
                                        <Trash2 className="w-4 h-4 text-zinc-500 hover:text-rose-400 transition-colors" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* 2. MODO GRADE ESPAÇOSA MODERNA (GRID) */}
                          {myListViewMode === 'grid' && (
                            <div className="px-4 sm:px-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-y-6 gap-x-4 sm:gap-x-5">
                              {listMovies.map((movie) => (
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
                                      src={movie.posterUrl} 
                                      alt={movie.title} 
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                      referrerPolicy="no-referrer"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2.5">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleFeaturedPlay(movie);
                                        }}
                                        className="w-full bg-rose-600 hover:bg-rose-700 text-white py-1.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1 shadow-md cursor-pointer"
                                      >
                                        <Play className="w-2.5 h-2.5 fill-current" />
                                        <span>Tocar</span>
                                      </button>
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleMyList(movie.id);
                                      }}
                                      className="absolute top-2 right-2 bg-zinc-950/90 hover:bg-rose-950/90 border border-zinc-800 text-zinc-400 hover:text-rose-400 p-1.5 rounded-full transition-all cursor-pointer z-10"
                                      title="Remover"
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
                              ))}
                            </div>
                          )}

                          {/* 3. MODO CARROSSEL CLÁSSICO */}
                          {myListViewMode === 'carousel' && (
                            <MovieRow
                              title="Prateleira Particular"
                              movies={listMovies}
                              watchHistory={activeProfile.watchHistory}
                              myList={activeProfile.myList}
                              onMovieClick={handleSelectMovie}
                              onToggleMyList={handleToggleMyList}
                              onPlayClick={handleFeaturedPlay}
                            />
                          )}
                        </div>
                      );
                    }
                  })()
                )}

                {/* --- 2.B.III: ROWS TRADICIONAIS DE GÊNEROS --- */}
                {activeTab !== 'mylist' && (
                  (() => {
                    // Se for busca ativa, categoria selecionada ou qualquer aba restrita, renderizamos Grid corrido, senão rows separadas
                    if (searchVal || activeTab === 'movies' || activeTab === 'series' || selectedCategory) {
                      if (filteredMovies.length === 0) {
                        return (
                          <div className="text-center py-28 px-4 flex flex-col items-center max-w-sm mx-auto">
                            <AlertCircle className="w-10 h-10 text-rose-500 mb-3" />
                            <h3 className="font-bold text-sm text-zinc-200">Nenhum título localizado</h3>
                            <p className="text-[11px] text-zinc-400 mt-1 lines-clamp-3">Infelizmente não encontramos nenhum filme compatível nas prateleiras locais com esse termo pesquisado 🤔</p>
                          </div>
                        );
                      }

                      return (
                        <div className="px-4 sm:px-8">
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-y-6 gap-x-4 sm:gap-x-5">
                            {filteredMovies.map(movie => (
                              <div
                                key={movie.id}
                                onClick={() => handleSelectMovie(movie)}
                                className="relative bg-zinc-950 border border-zinc-900 rounded-lg overflow-hidden hover:border-rose-500 hover:shadow-xl hover:shadow-rose-600/10 transition-all cursor-pointer group"
                                id={`search-grid-card-${movie.id}`}
                              >
                                <div className="aspect-[2/3] overflow-hidden bg-zinc-900">
                                  <img 
                                    src={movie.posterUrl} 
                                    alt={movie.title} 
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                                <div className="p-2 sm:p-3 bg-zinc-950 border-t border-zinc-900 h-14 sm:h-16 flex flex-col justify-between">
                                  <span className="font-semibold text-xs sm:text-sm text-zinc-200 truncate group-hover:text-rose-500 block">{movie.title}</span>
                                  <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono leading-none">
                                    <span className="text-yellow-400 font-bold flex items-center gap-0.5"><Star className="w-2.5 h-2.5 fill-yellow-400" /> {movie.rating}</span>
                                    <span>{movie.year}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }

                    // Mapeia todas as outras categorias para rows horizontais elegantes
                    const categoriesToRender = GENRE_CATEGORIES.filter(c => c !== 'Todos');

                    return (
                      <div className="flex flex-col">
                        {categoriesToRender.map(category => {
                          const categoryMovies = (category === 'Séries'
                            ? movies.filter(m => m.type === 'series')
                            : movies.filter(m => m.category === category)
                          ).sort((a, b) => getMovieSortingWeight(b) - getMovieSortingWeight(a));

                          if (categoryMovies.length === 0) return null;

                          return (
                            <MovieRow
                              key={category}
                              title={category}
                              movies={categoryMovies}
                              watchHistory={activeProfile.watchHistory}
                              myList={activeProfile.myList}
                              onMovieClick={handleSelectMovie}
                              onToggleMyList={handleToggleMyList}
                              onPlayClick={handleFeaturedPlay}
                            />
                          );
                        })}
                      </div>
                    );
                  })()
                )}

              </div>
            </div>
          )}

          {/* RODAPÉ DO FOOTER - ESTILO PROFISSIONAL NETFLIX */}
          <footer className="border-t border-zinc-900/40 bg-zinc-950 py-12 px-6 sm:px-12 text-zinc-500 font-sans mt-auto">
            <div className="max-w-6xl mx-auto space-y-8">
              {/* Grid de Links Netflix Style */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-[11px] sm:text-xs">
                <div className="flex flex-col gap-2.5">
                  <a href="#help-center" className="hover:underline transition-colors text-zinc-400">Central de Ajuda</a>
                  <a href="#vouchers" className="hover:underline transition-colors">Resgatar Fitas</a>
                  <a href="#privacy" className="hover:underline transition-colors">Privacidade</a>
                  <a href="#cookies" className="hover:underline transition-colors">Termos de Uso</a>
                </div>
                <div className="flex flex-col gap-2.5">
                  <a href="#media-center" className="hover:underline transition-colors">Imprensa</a>
                  <a href="#jobs" className="hover:underline transition-colors">Carreiras</a>
                  <a href="#corporate" className="hover:underline transition-colors">Informações Corporativas</a>
                  <a href="#contact" className="hover:underline transition-colors">Fale Conosco</a>
                </div>
                <div className="flex flex-col gap-2.5">
                  <a href="#account" className="hover:underline transition-colors">Conta de Colecionador</a>
                  <a href="#vhs-specs" className="hover:underline transition-colors font-mono">Especificações CRT</a>
                  <a href="#terms" className="hover:underline transition-colors">Preferências de Cookies</a>
                  <a href="#legal" className="hover:underline transition-colors">Avisos Legais</a>
                </div>
                <div className="flex flex-col gap-2.5 text-zinc-400">
                  <p className="font-black tracking-widest text-rose-600 text-xs uppercase text-left">VHSFLIX ENTERACTIVE</p>
                  <p className="text-[10px] leading-relaxed text-zinc-600 mt-1 text-left">
                    O maior acervo retrodigital da internet. Assista a clássicos cinematográficos e raridades com codificação analógica em alta fidelidade retrô.
                  </p>
                </div>
              </div>

              {/* Linha Inferior com os Direitos Autorais e Estilo Profissional */}
              <div className="pt-6 border-t border-zinc-910 flex flex-col sm:flex-row items-center justify-between text-[11px] text-zinc-650 gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-zinc-400 font-bold tracking-wider">VHSFLIX Brasil</span>
                  <span>© 2026</span>
                  <span className="hidden sm:inline">•</span>
                  <span>Todos os direitos reservados.</span>
                </div>
                <div className="font-mono text-[9px] tracking-wider uppercase text-zinc-600 text-center sm:text-right">
                  PLATAFORMA RETRÔ DIGITAL v2.0
                </div>
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
            movies={movies}
            onSelectMovie={handleSelectMovie}
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
                        src={poster}
                        alt={titleToShow}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        referrerPolicy="no-referrer"
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
