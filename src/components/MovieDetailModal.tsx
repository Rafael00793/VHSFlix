/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Movie, WatchProgress } from '../types';
import { X, Play, Pause, Plus, Check, Star, RefreshCw, Tv, Clock, HelpCircle, Film, Sparkles, AlertCircle, ExternalLink, Maximize, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MovieDetailModalProps {
  movie: Movie | null;
  isOpen: boolean;
  onClose: () => void;
  myList: string[];
  onToggleMyList: (movieId: string) => void;
  watchHistory: { [movieId: string]: WatchProgress };
  onUpdateProgress: (movieId: string, progress: number, currentTime: number, duration: number, isFinished: boolean) => void;
  adguardEnabled?: boolean;
}

const CATEGORY_COLORS: { [key: string]: string } = {
  'Ação': '#dc2626', // Vermelho
  'Aventura': '#059669', // Verde Esmeralda
  'Terror': '#7c3aed', // Roxo
  'Suspense': '#ea580c', // Laranja Escuro
  'Drama': '#db2777', // Rosa
  'Comédia': '#eab308', // Amarelo
  'Ficção Científica': '#06b6d4', // Ciano
  'Cristão': '#0ea5e9', // Azul Céu
  'Séries': '#10b981', // Verde Esmeralda
  'Reality': '#f43f5e', // Rosa Intenso
  'Documentário': '#71717a', // Cinza
  'Animação': '#fbbf24', // Amarelo Dourado
  'Família': '#22c55e', // Verde Claro
  'Fantasia': '#a855f7', // Roxo Claro
  'Crime': '#334155', // Chumbo Noir
  'Musical': '#ec4899', // Magenta
  'Guerra': '#78350f', // Castanho Cáqui
  'Faroeste': '#b45309', // Marrom Deserto
  'Romance': '#e11d48', // Vermelho Paixão
  'História': '#854d0e', // Bronze Histórico
  'Biografia': '#0d9488' // Teal Literário
};

const CATEGORY_TAPE_LABELS: { [key: string]: string } = {
  'Ação': 'Vermelho Vintage',
  'Aventura': 'Verde Selva Retro',
  'Terror': 'Roxo Sombrio',
  'Suspense': 'Laranja Tensão',
  'Drama': 'Rosa Clássico',
  'Comédia': 'Amarelo Radiante',
  'Ficção Científica': 'Ciano Galáctico',
  'Cristão': 'Azul Celestial',
  'Séries': 'Verde Brilhante',
  'Reality': 'Rosa Shocking',
  'Documentário': 'Chumbo Magnético',
  'Animação': 'Dourado Cartum',
  'Família': 'Neon Fraterno',
  'Fantasia': 'Místico Púrpura',
  'Crime': 'Rachadura Grafite',
  'Musical': 'Magenta Melodia',
  'Guerra': 'Verde Oliva Combate',
  'Faroeste': 'Marrom Areia',
  'Romance': 'Carmesim Paixão',
  'História': 'Cobre Antigo',
  'Biografia': 'Teal Documental'
};

export default function MovieDetailModal({
  movie,
  isOpen,
  onClose,
  myList,
  onToggleMyList,
  watchHistory,
  onUpdateProgress,
  adguardEnabled = true
}: MovieDetailModalProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTapeLoading, setIsTapeLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(120 * 60); // Default 2 horas em segundos
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // Retro 1x, 2x, 4x rewind index
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const currentTimeRef = useRef(currentTime);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  // Monitorar se mudou o estado de Fullscreen para sincronizar os ícones
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch((err) => {
          console.warn(`Erro ao tentar ativar tela cheia: ${err.message}`);
        });
    } else {
      document.exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch((err) => {
          console.warn(`Erro ao tentar sair da tela cheia: ${err.message}`);
        });
    }
  };

  // Mantém currentTimeRef atualizado sem disparar re-render
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  // AdGuard Active Protection Engine (Anti-Ads / Anti-Popups / Anti-Redirection)
  useEffect(() => {
    if (!isPlaying || !adguardEnabled) return;

    // Intercepta tentativas automáticas de redirecionar ou sair da página principal
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "AdGuard Pro bloqueou um redirecionamento de anúncio externo.";
      return e.returnValue;
    };

    // Bloqueia qualquer clique ou evento que tente de alguma forma iniciar abertura de abas externas/popups
    const preventPopups = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      const closestLink = target.closest('a');
      if (closestLink) {
        const href = closestLink.getAttribute('href') || '';
        const targetAttr = closestLink.getAttribute('target') || '';

        if (targetAttr === '_blank' || href.startsWith('http') || href.startsWith('//')) {
          try {
            const urlObj = new URL(href, window.location.href);
            if (urlObj.hostname !== window.location.hostname) {
              e.preventDefault();
              e.stopPropagation();
              console.warn("[AdGuard Pro] Link ou Popup bloqueado com sucesso:", href);
            }
          } catch (err) {
            e.preventDefault();
            e.stopPropagation();
          }
        }
      }
    };

    // Sobrescreve com segurança o window.open para evitar novos popups de abrirem via script
    const originalOpen = window.open;
    // @ts-ignore
    window.open = function() {
      console.warn("[AdGuard Pro] Tentativa bloqueada de criar uma nova aba/janela.");
      return {
        focus: () => {},
        blur: () => {},
        close: () => {},
        postMessage: () => {}
      }; // Retorna objeto proxy inofensivo para evitar erros de compilação/execução em scripts invasivos
    };

    // Bloqueia manipulações de window.top para redirecionar a página inteira
    const preventFrameEscape = () => {
      try {
        if (window.top && window.top !== window.self) {
          window.top.onbeforeunload = function() {
            return "O AdGuard impediu que o reprodutor nativo tentasse escapar da página.";
          };
        }
      } catch (e) {}
    };

    const intervalId = setInterval(preventFrameEscape, 1000);

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('click', preventPopups, true);
    document.addEventListener('mousedown', preventPopups, true);
    document.addEventListener('mouseup', preventPopups, true);

    return () => {
      // @ts-ignore
      window.open = originalOpen;
      clearInterval(intervalId);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('click', preventPopups, true);
      document.removeEventListener('mousedown', preventPopups, true);
      document.removeEventListener('mouseup', preventPopups, true);
    };
  }, [isPlaying, adguardEnabled]);

  const isAddedToList = movie ? myList.includes(movie.id) : false;
  const progressState = movie ? watchHistory[movie.id] : undefined;

  // Converte string de duração do filme "1h 56m" ou "3 Temporadas" para segundos razoáveis
  useEffect(() => {
    if (movie) {
      setIsPlaying(false);
      setIsTapeLoading(false);
      setPlaybackSpeed(1);
      
      let seconds = 110 * 60; // default 1h 50m
      if (movie.duration.includes('h')) {
        const parts = movie.duration.split('h');
        const hours = parseInt(parts[0]) || 1;
        const minutes = parts[1] ? (parseInt(parts[1].replace('m', '')) || 0) : 0;
        seconds = (hours * 3600) + (minutes * 60);
      } else if (movie.duration.includes('Temporada')) {
        const seasons = parseInt(movie.duration) || 1;
        seconds = seasons * 10 * 45 * 60; // 10 caps de 45m cada temp
      }
      setTotalDuration(seconds);

      // Carrega progresso anterior uma única vez ao carregar o filme
      const initialProgress = watchHistory[movie.id];
      if (initialProgress) {
        setCurrentTime(initialProgress.currentTime);
      } else {
        setCurrentTime(0);
      }
    }
  }, [movie?.id]);

  // Simulador de Ticking de Tempo do Player (Relógio da fita VHS)
  useEffect(() => {
    if (isPlaying && movie) {
      timerRef.current = setInterval(() => {
        const prev = currentTimeRef.current;
        let nextTime = prev + (1 * playbackSpeed);
        if (nextTime >= totalDuration) {
          nextTime = totalDuration;
          setIsPlaying(false);
          if (timerRef.current) clearInterval(timerRef.current);
          
          // Fim do filme!
          onUpdateProgress(movie.id, 100, totalDuration, totalDuration, true);
          setCurrentTime(totalDuration);
        } else {
          // Envia atualizações de progresso
          const percentage = (nextTime / totalDuration) * 100;
          onUpdateProgress(movie.id, percentage, nextTime, totalDuration, false);
          setCurrentTime(nextTime);
        }
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, totalDuration, movie?.id, playbackSpeed, onUpdateProgress]);

  // --- SISTEMA DE PROTEÇÃO ROBUSTO ANTI-ANÚNCIOS, POPUPS E REDIRECIONAMENTOS ---
  useEffect(() => {
    if (!isPlaying) return;

    // 1. Bloquear abertura de novas abas via window.open
    const originalOpen = window.open;
    window.open = function() {
      console.warn("[VHSFLIX-SECURITY] Chamada para window.open bloqueada para prevenção de anúncios.");
      return null;
    };

    // 2. Interceptar tentativas de redirecionamento ou saída do aplicativo
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      const msg = "Prevenção de anúncios: Deseja realmente sair do VHSFLIX?";
      e.returnValue = msg;
      return msg;
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    // 3. Capturar e bloquear cliques em elementos de redirecionamento fantasma / anúncios flutuantes
    const handleWindowClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'A' || target.closest('a'))) {
        const anchor = target.tagName === 'A' ? (target as HTMLAnchorElement) : target.closest('a');
        if (anchor && anchor.href) {
          try {
            const destUrl = new URL(anchor.href);
            // Bloqueia se não for do próprio domínio vhsflix
            if (destUrl.hostname !== window.location.hostname && !destUrl.hostname.includes("youtube.com")) {
              e.preventDefault();
              e.stopPropagation();
              console.warn(`[VHSFLIX-SECURITY] Link externo suspeito bloqueado durante a reprodução: ${anchor.href}`);
            }
          } catch (err) {
            e.preventDefault();
            e.stopPropagation();
            console.warn("[VHSFLIX-SECURITY] URL inválida bloqueada.");
          }
        }
      }
    };
    window.addEventListener("click", handleWindowClick, true);

    return () => {
      window.open = originalOpen;
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("click", handleWindowClick, true);
    };
  }, [isPlaying]);

  const formatVCRTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handlePlayClick = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      setIsTapeLoading(true);
      setTimeout(() => {
        setIsTapeLoading(false);
        setIsPlaying(true);
      }, 1800); // Simulador de encaixar fita VCR
    }
  };

  const handleScrubChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!movie) return;
    const targetSecs = parseInt(e.target.value);
    setCurrentTime(targetSecs);
    const percentage = (targetSecs / totalDuration) * 100;
    onUpdateProgress(movie.id, percentage, targetSecs, totalDuration, targetSecs >= totalDuration);
  };

  const handleResetProgress = () => {
    if (!movie) return;
    setCurrentTime(0);
    setIsPlaying(false);
    onUpdateProgress(movie.id, 0, 0, totalDuration, false);
  };

  if (!movie) return null;

  const tapeColor = CATEGORY_COLORS[movie.category] || movie.vhsTapeColor || '#dc2626';
  const tapeLabel = CATEGORY_TAPE_LABELS[movie.category] || 'Estojo Preto Clássico';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/95 backdrop-blur-md overflow-y-auto">
          {/* Backdrop de click para fechar */}
          <div className="absolute inset-0 z-10 hidden md:block" onClick={onClose} />

          {/* Card Principal do Detalhe (Estilo Caixa Estojo VHS) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.25 }}
            className="relative z-20 w-full max-w-4xl bg-zinc-950 border-0 md:border border-zinc-800 rounded-none md:rounded-xl overflow-hidden shadow-2xl flex flex-col h-[100dvh] md:h-auto md:max-h-[92vh]"
            id={`detail-modal-${movie.id}`}
          >
            {/* Botão de Fechar Modal */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 bg-black/80 hover:bg-rose-600 hover:text-white text-zinc-400 p-3.5 sm:p-2 rounded-full z-45 border border-zinc-800 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none"
              id="btn-close-modal"
              aria-label="Fechar Modal"
            >
              <X className="w-6 h-6 sm:w-5 sm:h-5" />
            </button>

            {/* REPRODUÇÃO DO PLAYER DE VÍDEO COMPLETO E REAL (OCUPA TODO O MODAL EM REPRODUÇÃO) */}
            {isPlaying && !isTapeLoading && (
              <div ref={playerContainerRef} className="absolute inset-0 bg-black flex flex-col text-white font-mono z-45 animate-fade-in">
                {/* Player Real do EmbedMovies */}
                <div className="absolute inset-0 w-full h-full z-10 bg-black">
                  <iframe
                    src={movie.type === 'series' 
                      ? `https://myembed.biz/serie/${movie.tmdbId || '1396'}`
                      : `https://myembed.biz/filme/${movie.tmdbId || '105'}`
                    }
                    title={`Reproduzindo ${movie.title}`}
                    className="w-full h-full border-0 video-player-iframe"
                    allowFullScreen
                    webkitallowfullscreen="true"
                    mozallowfullscreen="true"
                    allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                  />
                </div>

                {/* Botão de fechar player - posicionado no canto superior direito para cobrir marca d'água e exibir um 'X' vermelho pequeno */}
                <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-50 bg-black/95 p-1 rounded-full shadow-2xl border border-zinc-800">
                  <button
                    onClick={() => setIsPlaying(false)}
                    className="bg-black hover:bg-zinc-900 text-rose-500 hover:text-rose-400 p-2 sm:p-2.5 rounded-full transition-all cursor-pointer hover:scale-110 active:scale-95 flex items-center justify-center focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none"
                    aria-label="Voltar para Detalhes"
                    title="Fechar Vídeo"
                    id="btn-close-vhs-player"
                  >
                    <X className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-rose-500 stroke-[3.5]" />
                  </button>
                </div>
              </div>
            )}

            {/* --- ÁREA SUPERIOR: BANNER OU CARREGAMENTO DA FITA --- */}
            <div className="relative min-h-[350px] xs:min-h-[290px] sm:min-h-0 sm:aspect-[16/9] w-full bg-zinc-950 border-b border-zinc-900 overflow-hidden flex flex-col justify-end">
              {isTapeLoading ? (
                /* CASO 2: ANIMAÇÃO ESTÉTICA DE CARREGAMENTO DA FITA VHS */
                <div className="absolute inset-0 bg-black flex flex-col justify-center items-center font-mono text-zinc-400 z-30 select-none vhs-crt-flicker p-4">
                  <div className="w-40 h-10 border border-zinc-800 rounded-lg p-1.5 mb-4 flex gap-1 items-center bg-zinc-950">
                    <span className="w-2.5 h-2.5 bg-red-600 rounded-full animate-pulse"></span>
                    <div className="flex-1 bg-zinc-900 h-full rounded overflow-hidden relative">
                      <div className="absolute top-0 bottom-0 bg-zinc-800 animate-pulse" style={{ right: 0, left: '30%' }}></div>
                    </div>
                    <span className="text-[10px] text-zinc-600">VCR_HEAD</span>
                  </div>
                  <h3 className="text-sm font-bold text-amber-500 tracking-widest uppercase animate-pulse">INSERINDO FITA VHS...</h3>
                  <div className="flex flex-col gap-1 mt-4 text-center text-[10px] text-zinc-600 max-w-xs">
                    <p>SISTEMA VHSFLIX CO. EST. 1982</p>

                    <p className="font-mono">CARREGANDO DADOS {movie.title.substring(0, 15).toUpperCase()}...</p>
                  </div>
                </div>
              ) : (
                /* CASO 3: TELA DE DETALHE PADRÃO COM HERO BANNER */
                <>
                  <img
                    src={movie.backdropUrl}
                    alt={movie.title}
                    className="w-full h-full object-cover select-none"
                    referrerPolicy="no-referrer"
                  />
                  {/* Sombreado elegante estilo cinema */}
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-black/40" />

                  {/* Detalhes Rápidos no Banner */}
                  <div className="absolute bottom-3 left-3 sm:bottom-8 sm:left-8 right-3 text-left z-20 flex flex-col items-start">
                    
                    {/* Categoria */}
                    <span className="bg-rose-600 text-white font-mono text-[9px] sm:text-xs font-black px-2 py-0.5 sm:px-2.5 sm:py-1 rounded tracking-wider uppercase mb-1.5 sm:mb-4 shadow-lg border border-rose-500/20">
                      {movie.category}
                    </span>

                    {/* Título Principal */}
                    <h2 className="text-xl xs:text-2xl sm:text-4xl md:text-5xl font-black font-display text-white tracking-tight leading-tight uppercase text-shadow">
                      {movie.title}
                    </h2>

                    {/* Botões Rápidos */}
                    <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 mt-3 sm:mt-6 w-full sm:w-auto">
                      
                      <button
                        onClick={handlePlayClick}
                        className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm px-5 py-2.5 sm:px-7 sm:py-3.5 rounded-lg transition-transform active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 cursor-pointer focus-visible:ring-4 focus-visible:ring-rose-500 focus-visible:outline-none focus-visible:scale-[1.02]"
                        id="btn-modal-play"
                      >
                        <Play className="w-4.5 h-4.5 sm:w-5 sm:h-5 fill-white" />
                        <span>
                          {progressState && progressState.progress > 0 
                            ? `Continuar (${Math.round(progressState.progress)}%)` 
                            : 'Assistir Trailer / Filme'
                          }
                        </span>
                      </button>

                      <button
                        onClick={() => onToggleMyList(movie.id)}
                        className={`w-full sm:w-auto text-xs sm:text-sm font-semibold px-5 py-2.5 sm:px-5 sm:py-3.5 rounded-lg border transition-all active:scale-95 flex items-center justify-center gap-2 focus-visible:ring-4 focus-visible:ring-rose-500 focus-visible:outline-none focus-visible:scale-[1.02] ${
                          isAddedToList 
                            ? 'bg-rose-500/10 border-rose-500 text-rose-400' 
                            : 'border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-400 bg-zinc-900/60'
                        }`}
                        id="btn-modal-mylist"
                      >
                        {isAddedToList ? (
                          <>
                            <Check className="w-4 h-4 text-rose-500" />
                            <span>Remover da Lista</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" />
                            <span>Minha Lista</span>
                          </>
                        )}
                      </button>

                      {/* Se houver progresso, botão para rebobinar */}
                      {progressState && progressState.progress > 0 && (
                        <button
                          onClick={handleResetProgress}
                          className="w-full sm:w-auto bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:text-rose-500 px-5 py-2.5 sm:p-3.5 rounded-lg transition-transform active:scale-95 flex items-center justify-center gap-2 focus-visible:ring-4 focus-visible:ring-rose-500 focus-visible:outline-none focus-visible:scale-[1.02]"
                          title="Recomeçar do início (Rebobinar de forma digital)"
                          id="btn-modal-rewind"
                        >
                          <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
                          <span className="sm:hidden text-xs font-semibold">Rebobinar Fita</span>
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* --- ÁREA INFERIOR: ABAS DE DETALHES E TRAILER EMBED --- */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-8 text-left grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-10 bg-zinc-950 font-sans">
              
              {/* Lado Esquerdo/Centro: Sinopse, Ano, Duração, Progresso */}
              <div className="md:col-span-2 flex flex-col gap-5 sm:gap-6">
                
                {/* Meta Dados Rápidos */}
                <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-zinc-400 font-mono">
                  <span className="flex items-center gap-1.5 text-yellow-400 font-bold bg-yellow-400/5 px-2 py-1 rounded border border-yellow-400/20">
                    <Star className="w-3.5 h-3.5 fill-yellow-400" /> {movie.rating} de TMDB
                  </span>
                  <span className="flex items-center gap-1 bg-zinc-900 px-2 py-1 rounded border border-zinc-800">
                    <Clock className="w-3.5 h-3.5 text-rose-500" /> {movie.duration}
                  </span>
                  <span className="text-zinc-300 font-semibold">{movie.year}</span>
                  <span className="border border-zinc-700 px-1.5 py-0.5 rounded text-[10px] font-bold text-zinc-300 uppercase leading-none">
                    {movie.type === 'movie' ? 'Filme' : 'Série'}
                  </span>
                </div>

                {/* Caixa VHS de estojo físico decorativa com cor baseada na categoria */}
                <div 
                  className="p-3.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  style={{ borderColor: `${tapeColor}30`, backgroundColor: `${tapeColor}08` }}
                >
                  <div className="flex items-center gap-2.5 font-mono">
                    <span className="w-3.5 h-3.5 rounded-full inline-block" style={{ backgroundColor: tapeColor }}></span>
                    <div>
                      <p className="text-zinc-200 font-bold uppercase tracking-wider">Edição Especial - Fita Videocassete</p>
                      <p className="text-zinc-400 text-[10px]">Gênero: <span className="font-bold" style={{ color: tapeColor }}>{movie.category}</span></p>
                    </div>
                  </div>
                  <div className="font-mono text-[10px] text-zinc-400">
                    <span>Cor: </span>
                    <span className="capitalize font-bold" style={{ color: tapeColor }}>{tapeLabel}</span>
                  </div>
                </div>

                {/* Descrição Sinopse */}
                <div>
                  <h3 className="text-zinc-500 text-xs font-mono font-bold uppercase mb-2 tracking-wider">Sinopse da Obra</h3>
                  <p className="text-sm sm:text-base text-zinc-300 leading-relaxed font-sans font-normal">
                    {movie.description}
                  </p>
                </div>

                {/* Notificador de Progresso Ativo */}
                {progressState && progressState.progress > 0 && (
                  <div className="bg-zinc-900/60 p-4 rounded-lg border border-zinc-900 flex justify-between items-center text-xs">
                    <div>
                      <p className="text-zinc-300 font-bold font-mono">ESTADO DA FITA</p>
                      <p className="text-zinc-500 text-[11px] mt-0.5">
                        Parou em <span className="text-rose-400">{formatVCRTime(progressState.currentTime)}</span> de {formatVCRTime(totalDuration)}. ({Math.round(progressState.progress)}% concluído).
                      </p>
                    </div>
                    <button
                      onClick={handlePlayClick}
                      className="bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-white px-3 py-1.5 rounded transition-all text-xs font-bold font-mono flex items-center gap-1.5"
                    >
                      <Play className="w-3 h-3 fill-current" /> Retomar fita
                    </button>
                  </div>
                )}
              </div>

              {/* Lado Direito: Mais Infos de Catalogação */}
              <div className="flex flex-col gap-5 border-t md:border-t-0 md:border-l border-zinc-900 pt-6 md:pt-0 md:pl-6">
                <h3 className="text-zinc-500 text-xs font-mono font-bold uppercase mb-1 tracking-wider flex items-center gap-1.5">
                  Ficha de Catalogação
                </h3>
                
                <div className="flex flex-col gap-4 text-xs sm:text-sm font-sans">
                  <div>
                    <span className="text-zinc-500 font-mono uppercase font-bold text-[10px] block mb-1 tracking-wider">Gênero / Categoria</span>
                    <span className="text-rose-400 font-semibold font-sans">{movie.category}</span>
                  </div>

                  <div>
                    <span className="text-zinc-500 font-mono uppercase font-bold text-[10px] block mb-1 tracking-wider">Lançamento VHS</span>
                    <span className="text-zinc-300 font-medium font-sans">{movie.year} ({movie.type === 'movie' ? 'Fita Cinematográfica' : 'Televisivo'})</span>
                  </div>
                </div>
              </div>

              {/* Seção Widescreen para o Trailer - Ampla, Grande e Imersiva! */}
              {!isPlaying && (
                <div className="col-span-full border-t border-zinc-900 pt-6 mt-4">
                  <h3 className="text-zinc-400 text-xs font-mono font-bold uppercase mb-4 tracking-wider flex items-center gap-1.5 justify-center sm:justify-start">
                    <Film className="w-4 h-4 text-rose-500" /> Assistir Prévias / Trailer Oficial em Alta Definição
                  </h3>
                  <div className="relative aspect-[16/9] w-full max-w-4xl mx-auto rounded-xl overflow-hidden border border-zinc-800 shadow-2xl shadow-black/90 bg-zinc-900">
                    <iframe
                      src={`${movie.trailerUrl}?controls=1&autoplay=0&mute=0&vq=hd1080&rel=0`}
                      title={`Trailer de ${movie.title}`}
                      className="w-full h-full border-0 absolute inset-0"
                      allowFullScreen
                      webkitallowfullscreen="true"
                      mozallowfullscreen="true"
                      allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                    />
                  </div>
                  <span className="text-[11px] text-zinc-500 font-mono mt-4 block text-center uppercase tracking-wider">
                    Suporta Alta Definição (HD) • Alterne para Tela Cheia no player para melhor experiência cinematográfica
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
