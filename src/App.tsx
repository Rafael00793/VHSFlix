/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Movie, User, Profile, WatchProgress, AppNotification } from './types';
import { INITIAL_MOVIES, INITIAL_USERS, DEFAULT_PROFILES, GENRE_CATEGORIES, getMovieDetailsTMDB } from './data';
import Navbar from './components/Navbar';
import ProfileSelector from './components/ProfileSelector';
import MovieRow from './components/MovieRow';
import MovieDetailModal from './components/MovieDetailModal';
import AdminPanel from './components/AdminPanel';
import { Play, Info, Sparkles, Star, Plus, Check, Shield, HelpCircle, AlertCircle, Heart, HeartOff, Volume1, Volume2, VolumeX, Bell, X, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';



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
      const key = m.tmdbId 
        ? `tmdb_${m.tmdbId}_${type}` 
        : `title_${(m.title || '').trim().toLowerCase()}_${type}`;
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
  const [activeTab, setActiveTab] = useState<'all' | 'movies' | 'series' | 'mylist'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isAdminView, setIsAdminView] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [searchVal, setSearchVal] = useState('');

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem('vhsflix_notifications');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 'n1',
        title: '📺 Série de Sucesso',
        message: 'A fita de Stranger Things foi totalmente rebobinada e está pronta para assistir!',
        movieId: 'm5',
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        isRead: false,
        type: 'series'
      },
      {
        id: 'n2',
        title: '📼 Clássico de Ficção',
        message: 'A edição histórica remasterizada de Blade Runner já está adicionada ao catálogo!',
        movieId: 'm4',
        createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
        isRead: false,
        type: 'movie'
      },
      {
        id: 'n3',
        title: '🌟 Fé e Inspiração',
        message: 'A sensacional produção cristã The Chosen está completa no nosso acervo retrô.',
        movieId: 'm10',
        createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
        isRead: true,
        type: 'series'
      }
    ];
  });

  // Toast e sistema alertador de novas notificações na tela
  const [toast, setToast] = useState<AppNotification | null>(null);

  // Gatilho global para disparar uma nova notificação e mostrá-la no carrossel de popups/toast alertadores
  const triggerNotification = (title: string, message: string, movieId: string, type: 'movie' | 'series' | 'system') => {
    const newNotif: AppNotification = {
      id: 'notif_' + Date.now() + Math.random().toString(36).substring(2, 7),
      title,
      message,
      movieId,
      createdAt: new Date().toISOString(),
      isRead: false,
      type
    };
    setNotifications(prev => [newNotif, ...prev]);
    setToast(newNotif);
  };

  // Timer para sumir com o toast de notificação da tela automaticamente após alguns segundos
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 8500);
    return () => clearTimeout(timer);
  }, [toast]);

  // --- EFEITOS DE SINCRONIZAÇÃO COM LOCALSTORAGE ---
  useEffect(() => {
    localStorage.setItem('vhsflix_notifications', JSON.stringify(notifications));
  }, [notifications]);

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
    localStorage.setItem('vhsflix_tmdb_key', tmdbApiKey);
  }, [tmdbApiKey]);

  useEffect(() => {
    localStorage.setItem('vhsflix_adguard_enabled', JSON.stringify(adguardEnabled));
  }, [adguardEnabled]);

  useEffect(() => {
    localStorage.setItem('vhsflix_vhs_mode', JSON.stringify(vhsMode));
  }, [vhsMode]);

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

  const activeProfile = useMemo(() => {
    const userProfs = allProfiles[currentUserId] || [];
    return userProfs.find(p => p.id === currentProfileId) || null;
  }, [allProfiles, currentUserId, currentProfileId]);

  // Escolhe o filme em grande plano (Hero Banner)
  const [activeHighlightIndex, setActiveHighlightIndex] = useState(0);

  const featuredHighlights = useMemo(() => {
    const sorted = [...movies].sort((a, b) => b.year - a.year);
    
    // Filtro e ordenação inteligente:
    // 1. Prioriza os filmes marcados como isFeatured, mas ordenados por ano decrescente (lançamentos atuais primeiro)
    // 2. Mescla lançamentos do ano atual (2026+) ordenando por ano desc e nota/rating decrescente
    const currentYear = new Date().getFullYear();
    
    const starred = sorted.filter(m => m.isFeatured).sort((a, b) => b.year - a.year);
    const nonStarred = sorted.filter(m => !m.isFeatured);
    
    // Junta priorizando os marcados + lançamentos do ano corrente
    const combined = [...starred, ...nonStarred];
    
    // Vamos separar filmes e séries para termos um carrossel rotativo intercalado (Filme 1, Série 1, Filme 2, Série 2...)
    const movieItems = combined.filter(m => m.type === 'movie');
    const seriesItems = combined.filter(m => m.type === 'series');
    
    const highlights: Movie[] = [];
    const maxHighlightsCount = Math.min(5, combined.length);
    let moviePtr = 0;
    let seriesPtr = 0;
    
    for (let i = 0; i < maxHighlightsCount; i++) {
      if (i % 2 === 0 && moviePtr < movieItems.length) {
        highlights.push(movieItems[moviePtr++]);
      } else if (seriesPtr < seriesItems.length) {
        highlights.push(seriesItems[seriesPtr++]);
      } else if (moviePtr < movieItems.length) {
        highlights.push(movieItems[moviePtr++]);
      }
    }
    
    return highlights.length > 0 ? highlights : combined.slice(0, 5);
  }, [movies]);

  // Filme atualmente focado no carrossel do Banner
  const featuredMovie = useMemo(() => {
    if (featuredHighlights.length === 0) return null;
    return featuredHighlights[activeHighlightIndex] || featuredHighlights[0];
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

  // Lançamentos VHS (Ordenado por ano decrescente e rating)
  const moviesSortedByYear = useMemo(() => {
    return [...movies].sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return (b.rating || 0) - (a.rating || 0);
    });
  }, [movies]);

  // Transição automática das fitas de destaque rotativas a cada 8 segundos
  useEffect(() => {
    if (featuredHighlights.length <= 1) return;
    const interval = setInterval(() => {
      setActiveHighlightIndex(prev => (prev + 1) % featuredHighlights.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [featuredHighlights]);

  // --- BUSCADOR AUTOMÁTICO DE TENDÊNCIAS TMDB (LANÇAMENTOS DO ANO CORRENTE) ---
  useEffect(() => {
    if (!tmdbApiKey || tmdbApiKey === 'MY_GEMINI_API_KEY' || tmdbApiKey.trim() === '') return;

    const fetchCurrentYearTrending = async () => {
      try {
        const currentYear = new Date().getFullYear();
        
        // Descoberta rápida de populares do ano corrente
        const movieUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${encodeURIComponent(tmdbApiKey)}&language=pt-BR&sort_by=popularity.desc&primary_release_year=${currentYear}&vote_count.gte=10`;
        const tvUrl = `https://api.themoviedb.org/3/discover/tv?api_key=${encodeURIComponent(tmdbApiKey)}&language=pt-BR&sort_by=popularity.desc&first_air_date_year=${currentYear}&vote_count.gte=10`;

        const [movieData, tvData] = await Promise.all([
          fetch(movieUrl).then(res => res.ok ? res.json() : null).catch(() => null),
          fetch(tvUrl).then(res => res.ok ? res.json() : null).catch(() => null)
        ]);

        const incomingItems: any[] = [];
        if (movieData && movieData.results) {
          movieData.results.slice(0, 5).forEach((item: any) => incomingItems.push({ ...item, mediaType: 'movie' }));
        }
        if (tvData && tvData.results) {
          tvData.results.slice(0, 5).forEach((item: any) => incomingItems.push({ ...item, mediaType: 'tv' }));
        }

        if (incomingItems.length === 0) return;

        const newMoviesToAdd: Movie[] = [];

        for (const item of incomingItems) {
          const type = item.mediaType === 'tv' ? 'series' : 'movie';
          const alreadyExists = movies.some(m => m.tmdbId === item.id && m.type === type);
          if (alreadyExists) continue;

          const details = await getMovieDetailsTMDB(item.id, item.mediaType, tmdbApiKey);
          if (details && details.title) {
            newMoviesToAdd.push({
              id: 'm_tmdb_auto_' + item.id,
              title: details.title,
              description: details.description || '',
              posterUrl: details.posterUrl || '',
              backdropUrl: details.backdropUrl || '',
              category: details.category || (type === 'series' ? 'Séries' : 'Destaque'),
              year: details.year || currentYear,
              duration: details.duration || '2h 10m',
              type: type,
              rating: details.rating || 7.5,
              trailerUrl: details.trailerUrl || 'https://www.youtube.com/embed/qvsgGtIvCBY',
              isFeatured: true,
              vhsTapeColor: ['#e11d48', '#2563eb', '#9333ea', '#16a34a', '#ca8a04', '#059669'][Math.floor(Math.random() * 6)],
              tmdbId: item.id
            });
          }
        }

        if (newMoviesToAdd.length > 0) {
          setMovies(prev => {
            const preserved = prev.filter(p => !newMoviesToAdd.some(n => n.tmdbId === p.tmdbId && n.type === p.type));
            return [...newMoviesToAdd, ...preserved];
          });
          
          // Dispara as notificações e toasts na tela de maneira elegante e escalonada para cada novo conteúdo sincronizado
          newMoviesToAdd.forEach((n, idx) => {
            setTimeout(() => {
              const isSeries = n.type === 'series';
              triggerNotification(
                isSeries ? '📺 Nova Série Sincronizada!' : '📼 Novo Filme Sincronizado!',
                `O lançamento de ${n.year} "${n.title}" acaba de ser adicionado automaticamente via TMDB! Assista agora em VHS.`,
                n.id,
                isSeries ? 'series' : 'movie'
              );
            }, idx * 2500); // escalonado a cada 2.5s para visualização perfeita dos popups
          });

          console.log(`[Auto Highlights] Sincronizados ${newMoviesToAdd.length} lançamentos automáticos de ${currentYear}.`);
        }
      } catch (err) {
        console.error('Erro de sincronização dinâmica do TMDB:', err);
      }
    };

    fetchCurrentYearTrending();
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
    } else if (activeTab === 'series') {
      list = list.filter(m => m.type === 'series');
    } else if (activeTab === 'mylist' && activeProfile) {
      list = list.filter(m => activeProfile.myList.includes(m.id));
    }

    // Filtro por categoria selecionada (Estática Netflix)
    if (selectedCategory) {
      if (selectedCategory === 'Melhores Avaliações') {
        list = list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      } else if (selectedCategory === 'Séries') {
        list = list.filter(m => m.type === 'series');
      } else {
        list = list.filter(m => m.category === selectedCategory);
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

    const newUser: User = {
      id: 'u_' + Date.now(),
      name,
      email: emailLower,
      password: password,
      isAdmin,
      avatarUrl: defaultAvatar,
      createdAt: new Date().toISOString()
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

    return null; // Sucesso
  };

  const handleEditUser = (userId: string, name: string, email: string, password?: string, isAdmin?: boolean, avatarUrl?: string): string | null => {
    const emailLower = email.trim().toLowerCase();
    
    // Se o e-mail mudou, verifica duplicidade
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return 'Usuário não localizado.';

    if (targetUser.email.toLowerCase() !== emailLower && users.some(u => u.email.toLowerCase() === emailLower && u.id !== userId)) {
      return 'Este e-mail já está em uso por outro usuário.';
    }

    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          name,
          email: emailLower,
          password: (password !== undefined && password.trim() !== '') ? password : u.password,
          isAdmin: isAdmin !== undefined ? isAdmin : u.isAdmin,
          avatarUrl: avatarUrl !== undefined ? avatarUrl : u.avatarUrl
        };
      }
      return u;
    }));

    // Se o avatarUrl foi atualizado, também atualiza o perfil principal
    if (avatarUrl) {
      setAllProfiles(prev => {
        const userList = prev[userId] || [];
        if (userList.length > 0) {
          return {
            ...prev,
            [userId]: userList.map((p, idx) => idx === 0 ? { ...p, avatarUrl } : p)
          };
        }
        return prev;
      });
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
      if (newMovieData.tmdbId && m.tmdbId === newMovieData.tmdbId && m.type === newMovieData.type) {
        return true;
      }
      const existingTitle = (m.title || '').trim().toLowerCase();
      const incomingTitle = (newMovieData.title || '').trim().toLowerCase();
      return existingTitle === incomingTitle && m.type === newMovieData.type;
    });

    if (isDuplicate) {
      // Disparar uma notificação elegante de erro do sistema
      const tipo = newMovieData.type === 'series' ? 'Série' : 'Filme';
      triggerNotification(
        '⚠️ Título Duplicado!',
        `Este(a) ${tipo} ("${newMovieData.title}") já está adicionado(a) no acervo retrô do VHSFLIX!`,
        '',
        'system'
      );
      return false; // Retorna falso para avisar o caller que falhou
    }

    const newMovieId = 'm_' + Date.now();
    const newMovie: Movie = {
      ...newMovieData,
      id: newMovieId,
    };
    setMovies(prev => [newMovie, ...prev]);

    // Gerar notificação automática toda vez que é adicionado um novo filme ou série no site
    const isSeries = newMovie.type === 'series';
    triggerNotification(
      isSeries ? '📺 Nova Série Adicionada!' : '📼 Novo Filme Adicionado!',
      `"${newMovie.title}" acaba de ser adicionado ao acervo retrô de ${newMovie.category}!`,
      newMovieId,
      isSeries ? 'series' : 'movie'
    );
    return true; // Sucesso ao adicionar
  };

  const handleEditMovie = (editedMovie: Movie) => {
    setMovies(prev => prev.map(m => m.id === editedMovie.id ? editedMovie : m));
  };

  const handleDeleteMovie = (movieId: string) => {
    setMovies(prev => prev.filter(m => m.id !== movieId));
  };

  const handleResetCatalog = () => {
    setMovies(INITIAL_MOVIES);
  };

  const handleNotificationClick = (movieId: string, notificationId: string) => {
    setNotifications(prev => prev.map(notif => notif.id === notificationId ? { ...notif, isRead: true } : notif));
    const found = movies.find(m => m.id === movieId);
    if (found) {
      setSelectedMovie(found);
    }
  };

  const handleMarkAllNotificationsAsRead = () => {
    setNotifications(prev => prev.map(notif => ({ ...notif, isRead: true })));
  };

  // Jogar Rápido a fita VHS
  const handleFeaturedPlay = (movie: Movie, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    handleSelectMovie(movie);
  };

  // Abre detalhes do filme sintonizando cliques de audiência
  const handleSelectMovie = (movie: Movie) => {
    setMovies(prev => prev.map(m => {
      if (m.id === movie.id) {
        return {
          ...m,
          clicksCount: (m.clicksCount || 0) + 1
        };
      }
      return m;
    }));
    setSelectedMovie({
      ...movie,
      clicksCount: (movie.clicksCount || 0) + 1
    });
  };

  // Contabilidade real de gostei/não-gostei profissional e preciso
  const handleVoteMovie = (movieId: string, voteType: 'like' | 'dislike') => {
    if (!activeProfile) return;
    const storageKey = `vote_${activeProfile.id}_${movieId}`;
    const previousVote = localStorage.getItem(storageKey);

    setMovies(prev => prev.map(m => {
      if (m.id === movieId) {
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

        // Atualiza o modal de detalhes ativo se estiver com o filme carregado
        if (selectedMovie && selectedMovie.id === movieId) {
          setSelectedMovie(curr => curr ? { ...curr, votesLikes: newLikes, votesDislikes: newDislikes } : null);
        }

        return {
          ...m,
          votesLikes: newLikes,
          votesDislikes: newDislikes
        };
      }
      return m;
    }));
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
          />

          {/* --- TELA 2.A: INTERFACE ADMINISTRATIVA --- */}
          {isAdminView && activeUser.isAdmin ? (
            <AdminPanel
              movies={movies}
              users={users}
              allProfiles={allProfiles}
              tmdbApiKey={tmdbApiKey}
              onUpdateTmdbApiKey={setTmdbApiKey}
              onAddMovie={handleAddMovie}
              onEditMovie={handleEditMovie}
              onDeleteMovie={handleDeleteMovie}
              onResetCatalog={handleResetCatalog}
              onAddUser={handleAddUser}
              onEditUser={handleEditUser}
              onDeleteUser={handleDeleteUser}
              currentUserId={currentUserId}
              currentProfileId={currentProfileId || undefined}
              onEditProfile={handleEditProfile}
              adguardEnabled={adguardEnabled}
              onToggleAdguardEnabled={setAdguardEnabled}
            />
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

                    {/* Botões do destaque */}
                    <div className="flex items-center gap-3 sm:gap-4 mt-6 sm:mt-10">
                      <button
                        onClick={() => handleFeaturedPlay(featuredMovie)}
                        className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm px-5 py-3 sm:px-7 sm:py-4 rounded-lg flex items-center gap-2.5 shadow-lg shadow-rose-600/30 active:scale-95 transition-all cursor-pointer tracking-widest"
                        id="btn-hero-play"
                      >
                        <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-white" />
                        <span>PLAY</span>
                      </button>

                      <button
                        onClick={() => handleSelectMovie(featuredMovie)}
                        className="bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white font-semibold text-xs sm:text-sm px-5 py-3 sm:px-6 sm:py-4 rounded-lg flex items-center gap-2 transition-colors cursor-pointer tracking-wider"
                        id="btn-hero-details"
                      >
                        <Info className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span>Ficha Técnica</span>
                      </button>

                      {/* Botão rápido lista */}
                      <button
                        onClick={() => handleToggleMyList(featuredMovie.id)}
                        className={`p-3 sm:p-4 border rounded-full transition-all active:scale-90 flex items-center justify-center ${
                          activeProfile.myList.includes(featuredMovie.id)
                            ? 'bg-rose-500/10 border-rose-500 text-rose-400'
                            : 'border-zinc-750 text-zinc-400 hover:text-white hover:border-zinc-500 bg-zinc-900/60'
                        }`}
                        title="Adicionar à lista"
                        id="btn-hero-add-list"
                      >
                        {activeProfile.myList.includes(featuredMovie.id) ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Indicadores do carrossel removidos por solicitação do usuário */}

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
                          <div className="px-4 sm:px-8 mb-6">
                            <span className="text-zinc-500 font-mono text-[9px] sm:text-[10px] uppercase font-bold tracking-widest block mb-1">Coleção de Fitas Clássicas</span>
                            <h2 className="text-xl sm:text-2xl font-black font-display text-white uppercase tracking-tight">
                              Minha Lista <span className="text-rose-500 font-extrabold">({listMovies.length} {listMovies.length === 1 ? 'item' : 'itens'})</span>
                            </h2>
                          </div>
                          <MovieRow
                            title="Prateleira Particular"
                            movies={listMovies}
                            watchHistory={activeProfile.watchHistory}
                            myList={activeProfile.myList}
                            onMovieClick={handleSelectMovie}
                            onToggleMyList={handleToggleMyList}
                            onPlayClick={handleFeaturedPlay}
                          />
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
                          const categoryMovies = category === 'Séries'
                            ? movies.filter(m => m.type === 'series')
                            : movies.filter(m => m.category === category);

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
            movie={selectedMovie}
            isOpen={selectedMovie !== null}
            onClose={() => setSelectedMovie(null)}
            myList={activeProfile ? activeProfile.myList : []}
            onToggleMyList={(id) => handleToggleMyList(id)}
            watchHistory={activeProfile ? activeProfile.watchHistory : {}}
            onUpdateProgress={handleUpdateWatchProgress}
            adguardEnabled={adguardEnabled}
            onVoteMovie={handleVoteMovie}
            activeProfileId={activeProfile ? activeProfile.id : ''}
          />

          {/* --- SISTEMA DE TOAST DE NOTIFICAÇÃO AO VIVO RETRÔ --- */}
          <AnimatePresence>
            {toast && (() => {
              const toastMovie = movies.find(m => m.id === toast.movieId);
              return (
                <motion.div
                  initial={{ opacity: 0, y: 40, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.95, transition: { duration: 0.18 } }}
                  className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-[9999] max-w-none sm:max-w-sm w-auto sm:w-full bg-zinc-950/95 border border-rose-500/30 rounded-xl p-3.5 shadow-2xl shadow-rose-950/30 backdrop-blur-md flex gap-3 select-none"
                >
                  {/* Mini Poster do Filme/Série */}
                  {toastMovie && toastMovie.posterUrl ? (
                    <div className="w-16 h-24 rounded overflow-hidden flex-shrink-0 border border-zinc-800 shadow">
                      <img
                        src={toastMovie.posterUrl}
                        alt={toastMovie.title}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center flex-shrink-0 text-rose-500">
                      <Bell className="w-6 h-6 animate-pulse" />
                    </div>
                  )}

                  {/* Conteúdo Informativo */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      {/* Título da Notificação */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] uppercase font-black tracking-wider text-rose-500 flex items-center gap-1">
                          <Flame className="w-3.5 h-3.5 fill-rose-500/20 text-rose-500 animate-pulse" />
                          {toast.title}
                        </span>
                        <button
                          onClick={() => setToast(null)}
                          className="text-zinc-500 hover:text-zinc-200 p-0.5 rounded transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Nome do Conteúdo */}
                      <p className="text-xs font-bold font-display text-white mt-1 truncate">
                        {toastMovie ? toastMovie.title : toast.title}
                      </p>

                      {/* Descritivo curto */}
                      <p className="text-[10px] text-zinc-400 font-light mt-1.5 leading-relaxed line-clamp-2">
                        {toastMovie ? toastMovie.description : toast.message}
                      </p>
                    </div>

                    {/* Ação Interativa */}
                    {toastMovie && (
                      <button
                        onClick={() => {
                          setSelectedMovie(toastMovie);
                          setToast(null);
                        }}
                        className="mt-2.5 w-full bg-rose-600 hover:bg-rose-700 active:scale-[0.98] transition-all text-white font-bold text-[9px] uppercase tracking-widest py-1.5 px-3 rounded flex items-center justify-center gap-1 shadow shadow-rose-600/20 cursor-pointer"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Inserir VHS e Assistir</span>
                      </button>
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
