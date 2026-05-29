/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Movie, WatchProgress } from '../types';
import { X, Play, Pause, Plus, Check, Star, RefreshCw, Tv, Clock, HelpCircle, Film, Sparkles, AlertCircle, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MovieDetailModalProps {
  movie: Movie | null;
  isOpen: boolean;
  onClose: () => void;
  myList: string[];
  onToggleMyList: (movieId: string) => void;
  watchHistory: { [movieId: string]: WatchProgress };
  onUpdateProgress: (movieId: string, progress: number, currentTime: number, duration: number, isFinished: boolean) => void;
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
  onUpdateProgress
}: MovieDetailModalProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTapeLoading, setIsTapeLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(120 * 60); // Default 2 horas em segundos
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // Retro 1x, 2x, 4x rewind index
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const currentTimeRef = useRef(currentTime);

  // Mantém currentTimeRef atualizado sem disparar re-render
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/95 backdrop-blur-md overflow-y-auto">
          {/* Backdrop de click para fechar */}
          <div className="absolute inset-0 z-10" onClick={onClose} />

          {/* Card Principal do Detalhe (Estilo Caixa Estojo VHS) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ duration: 0.3 }}
            className="relative z-20 w-full max-w-4xl bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
            id={`detail-modal-${movie.id}`}
          >
            {/* Botão de Fechar Modal */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 bg-black/80 hover:bg-rose-600 hover:text-white text-zinc-400 p-2 rounded-full z-45 border border-zinc-800 transition-colors cursor-pointer"
              id="btn-close-modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* --- ÁREA SUPERIOR: BANNER OU PLAYER DE VIDEO --- */}
            <div className="relative aspect-[16/9] w-full bg-zinc-950 border-b border-zinc-900 overflow-hidden flex flex-col justify-center">
                    {/* CASO 1: REPRODUÇÃO DO PLAYER DE VÍDEO COMPLETO E REAL (EMBED MOVIES API) */}
              {isPlaying && !isTapeLoading ? (
                <div className="absolute inset-0 bg-black flex flex-col text-white font-mono z-30">
                  
                  {/* Player Real do EmbedMovies */}
                  <div className="absolute inset-0 w-full h-full z-10 bg-black">
                    <iframe
                      src={movie.type === 'series' 
                        ? `https://myembed.biz/serie/${movie.tmdbId || '1396'}`
                        : `https://myembed.biz/filme/${movie.tmdbId || '105'}`
                      }
                      title={`Reproduzindo ${movie.title}`}
                      className="w-full h-full border-0"
                      allowFullScreen
                      allow="autoplay; encrypted-media"
                      loading="lazy"
                    />
                  </div>

                  {/* Barra sobreposta temporária para voltar ao menu */}
                  <div className="absolute top-4 left-4 z-20 flex gap-2 mr-12 bg-black/60 p-1.5 rounded-lg border border-zinc-850 backdrop-blur-md">
                    <button
                      onClick={() => setIsPlaying(false)}
                      className="bg-black/95 hover:bg-zinc-900 border border-zinc-800 text-white px-3.5 py-1.5 rounded-md text-xs font-sans font-bold flex items-center gap-1.5 transition-all cursor-pointer hover:scale-105 active:scale-95"
                    >
                      <X className="w-3.5 h-3.5 text-rose-500 fill-current" />
                      <span>Voltar ao VHSFLIX</span>
                    </button>
                  </div>
                </div>
              ) : isTapeLoading ? (
                /* CASO 2: ANIMAÇÃO ESTÉTICA DE CARREGAMENTO DA FITA VHS */
                <div className="absolute inset-0 bg-black flex flex-col justify-center items-center font-mono text-zinc-400 z-30 select-none vhs-crt-flicker">
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
                  <div className="absolute bottom-4 left-4 sm:bottom-8 sm:left-8 right-4 text-left z-20 flex flex-col items-start">
                    
                    {/* Categoria */}
                    <span className="bg-rose-600 text-white font-mono text-[9px] sm:text-xs font-black px-2.5 py-1 rounded tracking-wider uppercase mb-2.5 sm:mb-4 shadow-lg border border-rose-500/20">
                      {movie.category}
                    </span>

                    {/* Título Principal */}
                    <h2 className="text-xl sm:text-4.5xl font-black font-display text-white tracking-tight leading-tight uppercase text-shadow">
                      {movie.title}
                    </h2>

                    {/* Botões Rápidos */}
                    <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 mt-4 sm:mt-6">
                      
                      <button
                        onClick={handlePlayClick}
                        className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm px-5 py-2.5 sm:px-7 sm:py-3.5 rounded-lg transition-transform active:scale-95 flex items-center gap-2 shadow-lg shadow-rose-600/20 cursor-pointer"
                        id="btn-modal-play"
                      >
                        <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-white" />
                        <span>
                          {progressState && progressState.progress > 0 
                            ? `Continuar (${Math.round(progressState.progress)}%)` 
                            : 'Assistir Trailer / Filme'
                          }
                        </span>
                      </button>

                      <button
                        onClick={() => onToggleMyList(movie.id)}
                        className={`text-xs sm:text-sm font-semibold px-4 py-2.5 sm:px-5 sm:py-3.5 rounded-lg border transition-all active:scale-95 flex items-center gap-2 ${
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
                          className="bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:text-rose-500 p-2.5 sm:p-3.5 rounded-lg transition-colors"
                          title="Recomeçar do início (Rebobinar de forma digital)"
                          id="btn-modal-rewind"
                        >
                          <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* --- ÁREA INFERIOR: ABAS DE DETALHES E TRAILER EMBED --- */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 text-left grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-10 bg-zinc-950 font-sans">
              
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
                      src={`${movie.trailerUrl}?controls=1&autoplay=0&mute=0`}
                      title={`Trailer de ${movie.title}`}
                      className="w-full h-full border-0 absolute inset-0"
                      allowFullScreen
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
