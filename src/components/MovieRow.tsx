/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { Movie, WatchProgress } from '../types';
import { ChevronLeft, ChevronRight, Play, Plus, Check, Star, Info } from 'lucide-react';
import { motion } from 'motion/react';
import { handlePosterError, getCleanPosterUrl } from '../lib/imageUtils';
import { RecommendationBadge } from './RecommendationBadge';

interface MovieRowProps {
  key?: string;
  title: string | React.ReactNode;
  icon?: React.ReactNode;
  movies: Movie[];
  watchHistory?: { [movieId: string]: WatchProgress };
  myList: string[];
  onMovieClick: (movie: Movie) => void;
  onToggleMyList: (movieId: string, e?: React.MouseEvent) => void;
  onPlayClick: (movie: Movie, e?: React.MouseEvent) => void;
  showCount?: boolean;
  showRankingBadge?: boolean;
  accentColor?: 'rose' | 'neon' | 'amber';
}

export const MovieRow = React.memo(function MovieRow({
  title,
  icon,
  movies,
  watchHistory,
  myList,
  onMovieClick,
  onToggleMyList,
  onPlayClick,
  showCount = false,
  showRankingBadge = false,
  accentColor = 'rose'
}: MovieRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);

  if (movies.length === 0) return null;

  const handleScroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollAmt = clientWidth * 0.75;
      const targetScroll = direction === 'left' ? scrollLeft - scrollAmt : scrollLeft + scrollAmt;
      
      rowRef.current.scrollTo({
        left: targetScroll,
        behavior: 'smooth'
      });

      // Update arrow state dynamically
      setTimeout(() => {
        if (rowRef.current) {
          setShowLeftArrow(rowRef.current.scrollLeft > 10);
        }
      }, 350);
    }
  };

  const onScrollContainer = () => {
    if (rowRef.current) {
      setShowLeftArrow(rowRef.current.scrollLeft > 10);
    }
  };

  const titleString = typeof title === 'string' ? title : 'categoria';

  return (
    <div className="relative mb-6 sm:mb-10 font-sans group/row">
      {/* Título da Categoria */}
      <div className="flex items-center gap-3 mb-2.5 sm:mb-4 px-4 sm:px-8">
        <div className="flex items-center gap-2.5">
          {icon && (
            <div className="flex items-center justify-center shrink-0">
              {icon}
            </div>
          )}
          <h2 className="text-base sm:text-xl font-black tracking-tight text-white font-display group-hover/row:text-red-500 transition-colors flex items-center gap-2 uppercase">
            {title}
          </h2>
        </div>
        <span className="h-px flex-1 bg-gradient-to-r from-zinc-800 via-zinc-800/40 to-transparent"></span>
        {showCount && (
          <span className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase font-semibold hidden sm:inline">
            {movies.length} {movies.length === 1 ? 'TÍTULO' : 'TÍTULOS'}
          </span>
        )}
      </div>

      {/* Container do Slider de Filmes */}
      <div className="relative">
        
        {/* Seta Esquerda */}
        {showLeftArrow && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => handleScroll('left')}
            className="absolute left-0 top-0 bottom-0 w-12 sm:w-14 bg-gradient-to-r from-zinc-950 to-transparent text-white hover:text-red-500 flex items-center justify-center z-30 transition-all opacity-0 group-hover/row:opacity-100 cursor-pointer"
            id={`btn-scroll-left-${titleString.replace(/\s+/g, '-').toLowerCase()}`}
          >
            <ChevronLeft className="w-8 h-8 sm:w-10 sm:h-10 text-white hover:scale-110 drop-shadow-lg" />
          </motion.button>
        )}

        {/* Seta Direita */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => handleScroll('right')}
          className="absolute right-0 top-0 bottom-0 w-12 sm:w-14 bg-gradient-to-l from-zinc-950 to-transparent text-white hover:text-red-500 flex items-center justify-center z-30 transition-all opacity-0 group-hover/row:opacity-100 cursor-pointer"
          id={`btn-scroll-right-${titleString.replace(/\s+/g, '-').toLowerCase()}`}
        >
          <ChevronRight className="w-8 h-8 sm:w-10 sm:h-10 text-white hover:scale-110 drop-shadow-lg" />
        </motion.button>

        {/* Linha de Cards com Scroll Horizontal Oculto e Touch Snap Otimizado */}
        <div
          ref={rowRef}
          onScroll={onScrollContainer}
          className="flex gap-3 sm:gap-4 md:gap-5 xl:gap-6 px-3 sm:px-8 overflow-x-auto no-scrollbar scroll-smooth py-2 sm:py-4 snap-x snap-mandatory"
        >
          {movies.map((movie, idx) => {
            const hasProgressState = watchHistory && watchHistory[movie.id];
            const isAddedToList = Array.isArray(myList) && myList.some(id => String(id) === String(movie.id) || (movie.tmdbId && String(id) === `tmdb_${movie.tmdbId}`));
            const progress = hasProgressState ? watchHistory[movie.id] : null;

            return (
              <motion.div
                key={movie.id}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                tabIndex={0}
                className="relative flex-none w-[125px] xs:w-[145px] sm:w-[185px] md:w-[215px] xl:w-[245px] snap-start group/card rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800/80 hover:border-red-500 hover:shadow-[0_0_22px_rgba(239,68,68,0.35)] focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none transition-all duration-300 cursor-pointer animate-fade-in"
                onClick={() => onMovieClick(movie)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onMovieClick(movie);
                  }
                }}
                id={`movie-card-${movie.id}`}
              >
                {/* Badge de Selo de Recomendação Oficial do Administrador Rafael */}
                {movie.isRecommended && (
                  <div className={`absolute z-30 ${showRankingBadge ? 'top-8 left-2' : 'top-2 left-2'}`}>
                    <RecommendationBadge variant="card" />
                  </div>
                )}

                {/* Badge de Ranking */}
                {showRankingBadge && (
                  <div 
                    className="absolute top-2 left-2 z-30 px-2 py-0.5 rounded-md font-mono font-black text-[10px] sm:text-[11px] select-none flex items-center gap-1 bg-red-600 text-white border border-red-400 shadow-[0_0_12px_rgba(239,68,68,0.7)]"
                  >
                    <span>#{idx + 1}</span>
                  </div>
                )}

                {/* Badge Categoria */}
                <div 
                  className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-md text-[8px] sm:text-[9px] font-sans font-black uppercase text-white z-20 flex items-center gap-0.5 select-none bg-red-600 border border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.4)]"
                  title={`Gênero: ${movie.category}`}
                >
                  {movie.type === 'series' ? 'Série' : 'Filme'}
                </div>

                {/* Imagem do Poster */}
                <div className="relative aspect-[2/3] w-full overflow-hidden bg-zinc-950">
                  <img
                    src={getCleanPosterUrl(movie.posterUrl)}
                    alt={movie.title}
                    className="w-full h-full object-cover select-none group-hover/card:scale-108 transition-transform duration-300"
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    onError={handlePosterError}
                  />
                  
                  {/* Overlay Escurecido Rápido de Hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-2.5 sm:p-4 z-20">
                    
                    {/* Botões rápidos de controle com animações modernas */}
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-3">
                      <motion.button
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => onPlayClick(movie, e)}
                        className="p-1.5 sm:p-2.5 rounded-full transition-all bg-red-600 hover:bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.7)] cursor-pointer"
                        title={movie.type === 'series' ? 'Assistir Série' : 'Assistir Filme'}
                      >
                        <Play className="w-3 h-3 sm:w-4 sm:h-4 fill-white text-white" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => onToggleMyList(movie.id, e)}
                        className={`p-1.5 sm:p-2.5 border rounded-full transition-all cursor-pointer ${
                          isAddedToList 
                            ? 'bg-red-600/20 border-red-500 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.4)]' 
                            : 'border-zinc-500 text-zinc-300 hover:text-white hover:border-red-500 bg-zinc-900/80'
                        }`}
                        title={isAddedToList ? "Remover da lista" : "Adicionar à lista"}
                      >
                        {isAddedToList ? <Check className="w-3 h-3 sm:w-4 sm:h-4" /> : <Plus className="w-3 h-3 sm:w-4 sm:h-4" />}
                      </motion.button>
                      
                      <div className="ml-auto">
                        <motion.button 
                          whileHover={{ scale: 1.15 }}
                          whileTap={{ scale: 0.9 }}
                          className="p-1.5 sm:p-2.5 border border-zinc-600 text-zinc-300 hover:text-red-400 hover:border-red-500 bg-zinc-900/80 rounded-full transition-all cursor-pointer"
                        >
                          <Info className="w-3 h-3 sm:w-4 sm:h-4" />
                        </motion.button>
                      </div>
                    </div>

                    {/* Stats rápidos */}
                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[9px] sm:text-[10px] text-zinc-300 font-sans mt-0.5 select-none">
                      <span className="text-yellow-400 font-bold flex items-center gap-0.5">
                        <Star className="w-2.5 h-2.5 fill-yellow-400" /> {movie.rating}
                      </span>
                      <span>•</span>
                      <span className="text-zinc-400">{movie.year}</span>
                    </div>
                  </div>
                </div>

                {/* Bloco de Texto Inferior Compacto */}
                <div className="p-2 sm:p-3 bg-zinc-950 border-t border-zinc-900 flex flex-col justify-between h-13 sm:h-18">
                  <p className="text-[11px] sm:text-sm font-semibold text-zinc-200 group-hover/card:text-red-400 transition-colors truncate">
                    {movie.title}
                  </p>
                  
                  {/* Progress bar para Continuar Assistindo */}
                  {progress ? (
                    <div className="mt-1 sm:mt-2">
                      <div className="flex justify-between items-center text-[8px] sm:text-[10px] text-zinc-500 font-mono mb-1 leading-none">
                        <span>{Math.floor(progress.currentTime / 60)}m</span>
                        <span className="text-red-400 font-bold">{Math.round(progress.progress)}%</span>
                      </div>
                      <div className="w-full bg-zinc-800 h-1 sm:h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-red-600 h-full rounded-full shadow-[0_0_8px_#ef4444]" 
                          style={{ width: `${progress.progress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-zinc-500 font-sans leading-none">
                      <span className="bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800 text-[8px] sm:text-[9px] uppercase font-bold text-zinc-400">
                        {movie.category}
                      </span>
                      <span className="font-mono text-[9px] sm:text-[10px]">{movie.duration}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

export default MovieRow;
