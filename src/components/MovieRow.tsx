/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { Movie, WatchProgress } from '../types';
import { ChevronLeft, ChevronRight, Play, Plus, Check, Star, Info } from 'lucide-react';
import { motion } from 'motion/react';

interface MovieRowProps {
  key?: string;
  title: string;
  movies: Movie[];
  watchHistory?: { [movieId: string]: WatchProgress };
  myList: string[];
  onMovieClick: (movie: Movie) => void;
  onToggleMyList: (movieId: string, e?: React.MouseEvent) => void;
  onPlayClick: (movie: Movie, e?: React.MouseEvent) => void;
}

export default function MovieRow({
  title,
  movies,
  watchHistory,
  myList,
  onMovieClick,
  onToggleMyList,
  onPlayClick
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

  return (
    <div className="relative mb-8 sm:mb-12 font-sans group/row">
      {/* Título da Categoria */}
      <div className="flex items-center gap-3 mb-3.5 sm:mb-5 px-4 sm:px-8">
        <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-white font-display group-hover/row:text-rose-500 transition-colors">
          {title}
        </h2>
        <span className="h-0.5 flex-1 bg-gradient-to-r from-zinc-800 to-transparent"></span>
        <span className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase font-semibold hidden sm:inline">
          {movies.length} {movies.length === 1 ? 'TÍTULO' : 'TÍTULOS'}
        </span>
      </div>

      {/* Container do Slider de Filmes */}
      <div className="relative">
        
        {/* Seta Esquerda */}
        {showLeftArrow && (
          <button
            onClick={() => handleScroll('left')}
            className="absolute left-0 top-0 bottom-0 w-12 sm:w-14 bg-gradient-to-r from-zinc-950 to-transparent text-white hover:text-rose-500 flex items-center justify-center z-30 transition-all opacity-0 group-hover/row:opacity-100 hover:scale-105 active:scale-95 cursor-pointer"
            id={`btn-scroll-left-${title.replace(/\s+/g, '-').toLowerCase()}`}
          >
            <ChevronLeft className="w-8 h-8 sm:w-10 sm:h-10 text-white hover:scale-110 drop-shadow-lg" />
          </button>
        )}

        {/* Seta Direita */}
        <button
          onClick={() => handleScroll('right')}
          className="absolute right-0 top-0 bottom-0 w-12 sm:w-14 bg-gradient-to-l from-zinc-950 to-transparent text-white hover:text-rose-500 flex items-center justify-center z-30 transition-all opacity-0 group-hover/row:opacity-100 hover:scale-105 active:scale-95 cursor-pointer"
          id={`btn-scroll-right-${title.replace(/\s+/g, '-').toLowerCase()}`}
        >
          <ChevronRight className="w-8 h-8 sm:w-10 sm:h-10 text-white hover:scale-110 drop-shadow-lg" />
        </button>

        {/* Linha de Cards com Scroll Horizontal Oculto */}
        <div
          ref={rowRef}
          onScroll={onScrollContainer}
          className="flex gap-4 md:gap-5 xl:gap-6 px-4 sm:px-8 overflow-x-auto no-scrollbar scroll-smooth py-2 sm:py-4"
        >
          {movies.map((movie) => {
            const hasProgressState = watchHistory && watchHistory[movie.id];
            const isAddedToList = myList.includes(movie.id);
            const progress = hasProgressState ? watchHistory[movie.id] : null;

            return (
              <motion.div
                key={movie.id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3 }}
                tabIndex={0}
                className="relative flex-none w-[145px] xs:w-[165px] sm:w-[195px] md:w-[220px] xl:w-[250px] group/card rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-rose-500 hover:shadow-xl hover:shadow-rose-600/10 focus-visible:ring-4 focus-visible:ring-rose-500 focus-visible:scale-105 focus-visible:outline-none transition-all cursor-pointer"
                onClick={() => onMovieClick(movie)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onMovieClick(movie);
                  }
                }}
                id={`movie-card-${movie.id}`}
              >
                {/* Visual VHS estético: adesivo no poster */}
                {(() => {
                  const COLOR_MAP: { [key: string]: string } = {
                    'Ação': '#dc2626',
                    'Aventura': '#059669',
                    'Terror': '#7c3aed',
                    'Suspense': '#ea580c',
                    'Drama': '#db2777',
                    'Comédia': '#eab308',
                    'Ficção Científica': '#06b6d4',
                    'Cristão': '#0ea5e9',
                    'Séries': '#10b981',
                    'Reality': '#f43f5e',
                    'Documentário': '#71717a',
                    'Animação': '#fbbf24',
                    'Família': '#22c55e',
                    'Fantasia': '#a855f7',
                    'Crime': '#334155',
                    'Musical': '#ec4899',
                    'Guerra': '#78350f',
                    'Faroeste': '#b45309',
                    'Romance': '#e11d48',
                    'História': '#854d0e',
                    'Biografia': '#0d9488'
                  };
                  const finalTapeColor = COLOR_MAP[movie.category] || movie.vhsTapeColor || '#dc2626';
                  return (
                    <div 
                      className="absolute top-1.5 right-1.5 px-1 py-0.5 rounded text-[8px] font-mono font-black uppercase text-zinc-950 z-20 flex items-center gap-0.5 select-none"
                      style={{ backgroundColor: finalTapeColor }}
                      title={`Etiqueta VHS: ${movie.category}`}
                    >
                      VHS
                    </div>
                  );
                })()}

                {/* Imagem do Poster */}
                <div className="relative aspect-[2/3] w-full overflow-hidden bg-zinc-950">
                  <img
                    src={movie.posterUrl}
                    alt={movie.title}
                    className="w-full h-full object-cover select-none group-hover/card:scale-108 transition-transform duration-500"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                  
                  {/* Overlay Escurecido Rápido de Hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3 sm:p-4">
                    
                    {/* Botões rápidos de controle */}
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                      <button
                        onClick={(e) => onPlayClick(movie, e)}
                        className="p-1.5 sm:p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-full transition-all active:scale-90"
                        title="Assistir agora"
                      >
                        <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-white" />
                      </button>
                      <button
                        onClick={(e) => onToggleMyList(movie.id, e)}
                        className={`p-1.5 sm:p-2 border rounded-full transition-all active:scale-90 ${
                          isAddedToList 
                            ? 'bg-rose-500/10 border-rose-500 text-rose-400' 
                            : 'border-zinc-500 text-zinc-300 hover:text-white hover:border-white bg-zinc-900/80'
                        }`}
                        title={isAddedToList ? "Remover da lista" : "Adicionar à lista"}
                      >
                        {isAddedToList ? <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                      </button>
                      
                      <div className="ml-auto">
                        <button className="p-1.5 sm:p-2 border border-zinc-500 text-zinc-300 hover:text-white hover:border-white bg-zinc-900/80 rounded-full transition-all">
                          <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Stats rápidos */}
                    <div className="flex items-center gap-1.5 text-[9px] sm:text-xs text-zinc-300 font-mono">
                      <span className="text-yellow-400 font-bold flex items-center gap-0.5">
                        <Star className="w-2.5 h-2.5 fill-yellow-400" /> {movie.rating}
                      </span>
                      <span>•</span>
                      <span>{movie.year}</span>
                    </div>
                  </div>
                </div>

                {/* Bloco de Texto Inferior (Fita VHS label look) */}
                <div className="p-2 sm:p-3 bg-zinc-950 border-t border-zinc-900 flex flex-col justify-between h-14 sm:h-18">
                  <p className="text-xs sm:text-sm font-semibold text-zinc-200 group-hover/card:text-rose-500 transition-colors truncate">
                    {movie.title}
                  </p>
                  
                  {/* Progress bar para Continuar Assistindo */}
                  {progress ? (
                    <div className="mt-1 sm:mt-2">
                      <div className="flex justify-between items-center text-[9px] sm:text-[10px] text-zinc-500 font-mono mb-1 leading-none">
                        <span>{Math.floor(progress.currentTime / 60)}m assistido</span>
                        <span>{Math.round(progress.progress)}%</span>
                      </div>
                      <div className="w-full bg-zinc-800 h-1 sm:h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-rose-600 h-full rounded-full" 
                          style={{ width: `${progress.progress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono leading-none">
                      <span className="bg-zinc-900 px-1 py-0.5 rounded border border-zinc-800 text-[8px] sm:text-[9px] uppercase">
                        {movie.type === 'movie' ? 'Filme' : 'Série'}
                      </span>
                      <span>{movie.duration}</span>
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
}
