/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Movie, User, Profile, WatchProgress, AppNotification } from './types';
import { INITIAL_MOVIES, INITIAL_USERS, DEFAULT_PROFILES, GENRE_CATEGORIES } from './data';
import Navbar from './components/Navbar';
import ProfileSelector from './components/ProfileSelector';
import MovieRow from './components/MovieRow';
import MovieDetailModal from './components/MovieDetailModal';
import AdminPanel from './components/AdminPanel';
import { Play, Info, Sparkles, Star, Plus, Check, Shield, HelpCircle, AlertCircle, Heart, HeartOff, Volume1, Volume2, VolumeX } from 'lucide-react';
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
    return saved ? JSON.parse(saved) : INITIAL_MOVIES;
  });

  const [tmdbApiKey, setTmdbApiKey] = useState<string>(() => {
    return localStorage.getItem('vhsflix_tmdb_key') || '';
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

  // Efetuador de Migração automática se houver dados antigos ou falta de itens cruciais recém-adicionados
  useEffect(() => {
    const hasOldGens = movies.some(m => m.category === 'Clássicos 80s' || m.category === 'Ação Retro');
    const hasTheChosen = movies.some(m => m.id === 'm10');
    if (hasOldGens || !hasTheChosen) {
      setMovies(INITIAL_MOVIES);
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
  const featuredMovie = useMemo(() => {
    const sorted = [...movies].sort((a, b) => b.year - a.year);
    const hasFeatured = sorted.find(m => m.isFeatured);
    return hasFeatured || sorted[0];
  }, [movies]);

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

    return list;
  }, [movies, activeTab, activeProfile, searchVal]);

  // --- TRATADORES DE CALLBACKS DO PERFIL ---
  const handleSelectUser = (userId: string) => {
    setCurrentUserId(userId);
    setCurrentProfileId(null); // Reseta perfil para escolher
    setIsAdminView(false);
  };

  const handleAddUser = (name: string, email: string, password: string, isAdmin: boolean): string | null => {
    const emailLower = email.trim().toLowerCase();
    
    // Verifica duplicidade
    if (users.some(u => u.email.toLowerCase() === emailLower)) {
      return 'Este e-mail já está sendo utilizado por outra conta.';
    }

    const newUser: User = {
      id: 'u_' + Date.now(),
      name,
      email: emailLower,
      password: password,
      isAdmin,
      createdAt: new Date().toISOString()
    };
    setUsers(prev => [...prev, newUser]);
    
    // Inicializa perfil padrão para o novo usuário
    const defaultProfile: Profile = {
      id: 'p_' + Date.now(),
      name: name.split(' ')[0],
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      myList: [],
      watchHistory: {}
    };
    
    setAllProfiles(prev => ({
      ...prev,
      [newUser.id]: [defaultProfile]
    }));

    return null; // Sucesso
  };

  const handleEditUser = (userId: string, name: string, email: string, password?: string, isAdmin?: boolean): string | null => {
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
          isAdmin: isAdmin !== undefined ? isAdmin : u.isAdmin
        };
      }
      return u;
    }));

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
    const newMovieId = 'm_' + Date.now();
    const newMovie: Movie = {
      ...newMovieData,
      id: newMovieId,
    };
    setMovies(prev => [newMovie, ...prev]);

    // Gerar notificação automática toda vez que sai/é lançado um novo filme ou série no site
    const isSeries = newMovie.type === 'series';
    const newNotif: AppNotification = {
      id: 'notif_' + Date.now(),
      title: isSeries ? '📺 Nova Série Lançada!' : '📼 Novo Filme Lançado!',
      message: `"${newMovie.title}" acaba de sair em super fita VHS retro! Insira no reprodutor e assista agora.`,
      movieId: newMovieId,
      createdAt: new Date().toISOString(),
      isRead: false,
      type: isSeries ? 'series' : 'movie'
    };
    setNotifications(prev => [newNotif, ...prev]);
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
    setSelectedMovie(movie);
    // Modal se abrirá e o player estará pronto para tocar
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
            onTabChange={(tab) => { setActiveTab(tab); setIsAdminView(false); }}
            isAdminView={isAdminView}
            onToggleAdminView={setIsAdminView}
            vhsMode={vhsMode}
            onToggleVhsMode={() => setVhsMode(!vhsMode)}
            notifications={notifications}
            onNotificationClick={handleNotificationClick}
            onMarkAllAsRead={handleMarkAllNotificationsAsRead}
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
            />
          ) : (
            /* --- TELA 2.B: PAINEL PRINCIPAL DO USUÁRIO ESTILO NETFLIX --- */
            <div className="flex-1 pb-16 font-sans">
              
              {/* SEÇÃO HERO SPOTLIGHT (EM GRANDE PLANO) */}
              {!searchVal && activeTab === 'all' && featuredMovie && (
                <div className="relative h-[62vh] sm:h-[84vh] w-full bg-zinc-950 flex flex-col justify-end select-none border-b border-zinc-900/40 overflow-hidden">
                  <div className="absolute inset-0 z-0">
                    <img
                      src={featuredMovie.backdropUrl}
                      alt={featuredMovie.title}
                      className="w-full h-full object-cover select-none brightness-[0.75]"
                      referrerPolicy="no-referrer"
                    />
                    {/* Sombras pretas de ambientação */}
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-black/20" />
                    <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/90 via-transparent to-transparent hidden md:block" />
                  </div>

                  <div className="relative z-20 max-w-[1400px] w-full mx-auto px-4 sm:px-8 pb-12 sm:pb-24 flex flex-col items-start text-left">
                    {/* Badge */}
                    <span className="bg-rose-600 text-white font-mono text-[10px] sm:text-xs font-bold px-2 py-0.5 sm:px-3 sm:py-1 rounded uppercase tracking-widest mb-2.5 sm:mb-4 border border-rose-500/20 shadow-md">
                      🎬 {featuredMovie.category} • Destaque Retro
                    </span>
                    
                    {/* Título */}
                    <h1 className="text-3xl sm:text-6xl font-black font-display tracking-widest text-white leading-tight uppercase max-w-2xl text-shadow">
                      {featuredMovie.title}
                    </h1>

                    {/* Descrição Sinopse curta */}
                    <p className="text-xs sm:text-base text-zinc-300 max-w-xl sm:max-w-2xl mt-4 line-clamp-3 leading-relaxed drop-shadow-sm font-light tracking-wide">
                      {featuredMovie.description}
                    </p>

                    {/* Botões do destaque */}
                    <div className="flex items-center gap-3 sm:gap-4 mt-6 sm:mt-10">
                      <button
                        onClick={() => handleFeaturedPlay(featuredMovie)}
                        className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm px-5 py-3 sm:px-7 sm:py-4 rounded-lg flex items-center gap-2.5 shadow-lg shadow-rose-600/20 active:scale-95 transition-all cursor-pointer tracking-widest"
                        id="btn-hero-play"
                      >
                        <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-white" />
                        <span>PLAY</span>
                      </button>

                      <button
                        onClick={() => setSelectedMovie(featuredMovie)}
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
                </div>
              )}

              {/* GRIDS / CATEGORIAS (ESTRELA DO DESIGN) */}
              <div className={`max-w-[1400px] mx-auto px-1 sm:px-4 ${(!searchVal && activeTab === 'all') ? '-mt-2 sm:-mt-8 relative z-30' : 'pt-32'}`}>
                
                {/* Visualizador de Busca Ativo */}
                {searchVal && (
                  <div className="px-4 sm:px-8 mb-6">
                    <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
                      Resultados para busca de: <span className="text-rose-500 italic">"{searchVal}"</span>
                    </h2>
                    <p className="text-xs text-zinc-500 font-mono mt-1 pr-1">{filteredMovies.length} correspondências encontradas no catálogo.</p>
                  </div>
                )}

                {/* --- 2.B.I: ROW DE CONTINUAR ASSISTINDO --- */}
                {!searchVal && activeTab === 'all' && (
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
                        onMovieClick={setSelectedMovie}
                        onToggleMyList={handleToggleMyList}
                        onPlayClick={handleFeaturedPlay}
                      />
                    );
                  })()
                )}

                {/* --- 2.B.II: ROW MINHA LISTA (SE ESTIVER EM ALL OU EM MYLIST TAB) --- */}
                {(!searchVal && (activeTab === 'all' || activeTab === 'mylist')) && (
                  (() => {
                    const listMovies = movies.filter(m => activeProfile.myList.includes(m.id));
                    if (listMovies.length === 0 && activeTab === 'mylist') {
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
                    if (listMovies.length === 0) return null; // Não exibe a row se estiver na home vazia
                    
                    return (
                      <MovieRow
                        title="Minha Lista"
                        movies={listMovies}
                        watchHistory={activeProfile.watchHistory}
                        myList={activeProfile.myList}
                        onMovieClick={setSelectedMovie}
                        onToggleMyList={handleToggleMyList}
                        onPlayClick={handleFeaturedPlay}
                      />
                    );
                  })()
                )}

                {/* --- 2.B.III: ROWS TRADICIONAIS DE GÊNEROS --- */}
                {activeTab !== 'mylist' && (
                  (() => {
                    // Se for busca ativa ou qualquer aba restrita, renderizamos Grid corrido, senão rows separadas
                    if (searchVal || activeTab === 'movies' || activeTab === 'series') {
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
                                onClick={() => setSelectedMovie(movie)}
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
                              onMovieClick={setSelectedMovie}
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
                  PLATAFORMA RETRÔ DIGITAL • CURADORIA DE ALTO PADRÃO COM INTEGRAÇÃO DE API TMDB
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
          />

        </div>
      )}
    </div>
  );
}
