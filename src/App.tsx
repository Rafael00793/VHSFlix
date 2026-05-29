/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Movie, User, Profile, WatchProgress } from './types';
import { INITIAL_MOVIES, INITIAL_USERS, DEFAULT_PROFILES, GENRE_CATEGORIES } from './data';
import Navbar from './components/Navbar';
import ProfileSelector from './components/ProfileSelector';
import MovieRow from './components/MovieRow';
import MovieDetailModal from './components/MovieDetailModal';
import AdminPanel from './components/AdminPanel';
import { Play, Info, Sparkles, Star, Plus, Check, Shield, HelpCircle, AlertCircle, Heart, HeartOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  // --- ESTADOS DE SESSÃO E PERSISTÊNCIA GERAL ---
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('vhsflix_users');
    return saved ? JSON.parse(saved) : INITIAL_USERS;
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
  const [playHeroTrailer, setPlayHeroTrailer] = useState(false);

  // --- EFEITOS DE SINCRONIZAÇÃO COM LOCALSTORAGE ---
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

  // Autoplay trailer no plano de fundo do Hero Spotlight com delay
  useEffect(() => {
    setPlayHeroTrailer(false);
    if (!featuredMovie) return;
    const timer = setTimeout(() => {
      setPlayHeroTrailer(true);
    }, 2800); // 2.8s
    return () => clearTimeout(timer);
  }, [featuredMovie?.id, activeTab, isAdminView]);

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

  const handleAddUser = (name: string, email: string, isAdmin: boolean) => {
    const newUser: User = {
      id: 'u_' + Date.now(),
      name,
      email,
      isAdmin,
      createdAt: new Date().toISOString()
    };
    setUsers(prev => [...prev, newUser]);
    
    // Inicializa perfil padrão para ele
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
    setCurrentUserId(newUser.id);
    setCurrentProfileId(null);
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
    const newMovie: Movie = {
      ...newMovieData,
      id: 'm_' + Date.now(),
    };
    setMovies(prev => [newMovie, ...prev]);
  };

  const handleEditMovie = (editedMovie: Movie) => {
    setMovies(prev => prev.map(m => m.id === editedMovie.id ? editedMovie : m));
  };

  const handleDeleteMovie = (movieId: string) => {
    if (confirm('Tem certeza absoluta que deseja excluir este filme permanentemente de VHSFLIX?')) {
      setMovies(prev => prev.filter(m => m.id !== movieId));
    }
  };

  const handleResetCatalog = () => {
    setMovies(INITIAL_MOVIES);
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
          onAddUser={handleAddUser}
          profiles={allProfiles[currentUserId] || []}
          onSelectProfile={handleSelectProfile}
          onAddProfile={handleAddProfile}
          onDeleteProfile={handleDeleteProfile}
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
            />
          ) : (
            /* --- TELA 2.B: PAINEL PRINCIPAL DO USUÁRIO ESTILO NETFLIX --- */
            <div className="flex-1 pb-16 font-sans">
              
              {/* SEÇÃO HERO SPOTLIGHT (EM GRANDE PLANO) */}
              {!searchVal && activeTab === 'all' && featuredMovie && (
                <div className="relative h-[62vh] sm:h-[84vh] w-full bg-zinc-950 flex flex-col justify-end select-none border-b border-zinc-900/40 overflow-hidden">
                  <div className="absolute inset-0 z-0">
                    {playHeroTrailer && featuredMovie.trailerUrl ? (
                      <div className="absolute inset-0 w-full h-full scale-[1.3] pointer-events-none origin-center">
                        <iframe
                          src={`${featuredMovie.trailerUrl}?autoplay=1&mute=1&controls=0&loop=1&playlist=${featuredMovie.trailerUrl.split('/').pop() || ''}&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3&enablejsapi=1`}
                          title={featuredMovie.title}
                          className="w-full h-full border-0 absolute top-0 left-0"
                          allow="autoplay; encrypted-media"
                        />
                      </div>
                    ) : (
                      <img
                        src={featuredMovie.backdropUrl}
                        alt={featuredMovie.title}
                        className="w-full h-full object-cover select-none brightness-[0.75]"
                        referrerPolicy="no-referrer"
                      />
                    )}
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
                        <span>FAZER PLAY</span>
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

          {/* RODAPÉ DO FOOTER */}
          <footer className="border-t border-zinc-900/60 bg-zinc-950/80 backdrop-blur-md py-8 px-4 sm:px-8 text-center text-xs text-zinc-650 font-mono space-y-2 mt-auto">
            <div className="flex justify-center items-center gap-3">
              <span className="text-rose-600 font-black tracking-wider text-sm">VHSFLIX © 2026</span>
              <span>•</span>
              <span>Todos os Direitos Reservados</span>
            </div>
            <p className="text-[10px] max-w-md mx-auto text-zinc-600 leading-relaxed uppercase tracking-wider">
              Desenvolvido com estética Vaporwave, tubo CRT 80s e curadoria inteligente alimentada por TMDB API.
            </p>
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
