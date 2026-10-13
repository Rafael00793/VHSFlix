/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Movie } from '../types';
import { getCleanPosterUrl, handlePosterError } from '../lib/imageUtils';
import { getShareUrl } from '../lib/routing';
import { fetchApi } from '../lib/apiClient';
import { 
  Megaphone, Search, Copy, Check, ExternalLink, Film, Tv,
  RotateCcw, SlidersHorizontal, Image, ChevronRight, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PromotionCenterProps {
  movies: Movie[];
  tmdbApiKey: string;
  onSelectMovie?: (movie: Movie) => void;
}

type TemplateVariant = 'complete' | 'retro';

interface ExtendedMediaDetails {
  originalTitle?: string;
  realRating?: number;
  genresList?: string;
  castMembers?: string[];
  seasonsCount?: number;
  loading: boolean;
}

export default function PromotionCenter({ movies, tmdbApiKey }: PromotionCenterProps) {
  // Estado de pesquisa
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'movie' | 'series'>('all');
  
  // Filme atualmente selecionado para a divulgação
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(() => {
    return movies.length > 0 ? movies[0] : null;
  });

  // Template selecionado: Apenas "complete" (Estrutura Oficial) e "retro" (Clássico Locadora)
  const [templateVariant, setTemplateVariant] = useState<TemplateVariant>('complete');
  const [customText, setCustomText] = useState('');
  const [isEditingCustom, setIsEditingCustom] = useState(false);

  // Detalhes estendidos vindos do TMDB (Elenco, Título Original, Nota Real)
  const [extraDetails, setExtraDetails] = useState<ExtendedMediaDetails>({
    loading: false
  });

  // Feedback de cópia
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Filmes encontrados estritamente pela busca do usuário
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    let list = movies.filter(m => {
      const matchTitle = m.title?.toLowerCase().includes(q);
      const matchCategory = m.category?.toLowerCase().includes(q);
      const matchYear = String(m.year || '').includes(q);
      return matchTitle || matchCategory || matchYear;
    });

    if (typeFilter === 'movie') {
      list = list.filter(m => m.type === 'movie');
    } else if (typeFilter === 'series') {
      list = list.filter(m => m.type === 'series');
    }

    return list;
  }, [movies, searchQuery, typeFilter]);

  // Sugestões rápidas extraídas de títulos reais do acervo para facilitar busca
  const suggestions = useMemo(() => {
    const list: string[] = [];
    for (const m of movies) {
      if (m.title && !list.includes(m.title) && list.length < 5) {
        list.push(m.title);
      }
    }
    return list;
  }, [movies]);

  // Busca detalhes adicionais no TMDB para enriquecer o texto da postagem
  useEffect(() => {
    if (!selectedMovie) {
      setExtraDetails({ loading: false });
      return;
    }

    let isCancelled = false;
    const mediaType = selectedMovie.type === 'series' ? 'tv' : 'movie';
    const effectiveKey = tmdbApiKey || '9ba478ffe785bbc34fa2b10c46296580';

    setExtraDetails({ loading: true });

    async function loadExtendedDetails() {
      let targetTmdbId = selectedMovie?.tmdbId;
      let originalTitle = '';
      let realRating = selectedMovie?.rating;
      let genresList = selectedMovie?.category || '';
      let castMembers: string[] = [];
      let seasonsCount: number | undefined = undefined;

      try {
        // 1. Se não tiver tmdbId, busca pelo título no TMDB
        if (!targetTmdbId && effectiveKey && effectiveKey !== 'MY_GEMINI_API_KEY') {
          const searchRes = await fetchApi(
            `https://api.themoviedb.org/3/search/${mediaType}?api_key=${encodeURIComponent(effectiveKey)}&query=${encodeURIComponent(selectedMovie?.title || '')}&language=pt-BR`
          );
          if (searchRes.ok && searchRes.data && Array.isArray(searchRes.data.results) && searchRes.data.results.length > 0) {
            targetTmdbId = searchRes.data.results[0].id;
          }
        }

        // 2. Com o TMDB ID, busca dados detalhados da obra
        if (targetTmdbId && effectiveKey && effectiveKey !== 'MY_GEMINI_API_KEY') {
          const detailRes = await fetchApi(
            `https://api.themoviedb.org/3/${mediaType}/${targetTmdbId}?api_key=${encodeURIComponent(effectiveKey)}&language=pt-BR`
          );

          if (detailRes.ok && detailRes.data) {
            const data = detailRes.data;
            originalTitle = data.original_title || data.original_name || '';
            if (typeof data.vote_average === 'number' && data.vote_average > 0) {
              realRating = Number(data.vote_average.toFixed(1));
            }
            if (Array.isArray(data.genres) && data.genres.length > 0) {
              genresList = data.genres.map((g: any) => g.name).join(', ');
            }
            if (typeof data.number_of_seasons === 'number') {
              seasonsCount = data.number_of_seasons;
            }
          }

          // 3. Busca elenco principal
          const creditsRes = await fetchApi(
            `https://api.themoviedb.org/3/${mediaType}/${targetTmdbId}/credits?api_key=${encodeURIComponent(effectiveKey)}&language=pt-BR`
          );

          if (creditsRes.ok && creditsRes.data && Array.isArray(creditsRes.data.cast)) {
            castMembers = creditsRes.data.cast
              .slice(0, 5)
              .map((person: any) => person.name)
              .filter(Boolean);
          }
        }
      } catch (err) {
        console.warn('[PromotionCenter] Consulta TMDB simplificada:', err);
      }

      if (!isCancelled) {
        setExtraDetails({
          originalTitle,
          realRating,
          genresList: genresList || selectedMovie?.category,
          castMembers,
          seasonsCount,
          loading: false
        });
      }
    }

    loadExtendedDetails();

    return () => {
      isCancelled = true;
    };
  }, [selectedMovie, tmdbApiKey]);

  // Função geradora de modelos de postagem — limpa, sem asteriscos (*) e sem estrelas (⭐)
  const generatePostContent = (movie: Movie, variant: TemplateVariant, details: ExtendedMediaDetails): string => {
    if (!movie) return '';

    const shareUrl = getShareUrl(movie);
    const ratingDisplay = details.realRating || movie.rating;
    const genres = details.genresList || movie.category || '';
    const castLine = (details.castMembers && details.castMembers.length > 0)
      ? details.castMembers.join(', ')
      : '';
    const seasonsInfo = movie.type === 'series' 
      ? (details.seasonsCount ? `${details.seasonsCount} Temporada(s)` : (movie.duration || 'Disponível completa'))
      : null;

    const cleanOverview = (movie.description || '').trim();

    if (variant === 'complete') {
      const lines: string[] = [];
      lines.push(`🎬 ${movie.title.toUpperCase()}`);
      if (details.originalTitle && details.originalTitle.toLowerCase() !== movie.title.toLowerCase()) {
        lines.push(`Título Original: ${details.originalTitle}`);
      }
      if (ratingDisplay) {
        lines.push(`Nota no TMDB: ${ratingDisplay}/10`);
      }
      if (movie.year) {
        lines.push(`Ano de lançamento: ${movie.year}`);
      }
      if (seasonsInfo) {
        lines.push(`Formato: ${seasonsInfo}`);
      }
      if (castLine) {
        lines.push(`Elenco principal: ${castLine}`);
      }
      if (genres) {
        lines.push(`Gênero: ${genres}`);
      }
      if (cleanOverview) {
        lines.push(`\nSinopse:\n${cleanOverview}`);
      }
      lines.push(`\nASSISTA NO VHSFLIX:`);
      lines.push(shareUrl);

      return lines.join('\n');
    }

    if (variant === 'retro') {
      const lines: string[] = [];
      lines.push(`📼 FITA DISPONÍVEL NO ACERVO VHSFLIX`);
      lines.push(`🎬 ${movie.title.toUpperCase()} (${movie.year})`);
      if (ratingDisplay) {
        lines.push(`Nota TMDB: ${ratingDisplay}/10`);
      }
      if (genres) {
        lines.push(`Prateleira: ${genres}`);
      }
      if (castLine) {
        lines.push(`Estrelando: ${castLine}`);
      }
      if (cleanOverview) {
        lines.push(`\nResumo da Fita:\n${cleanOverview}`);
      }
      lines.push(`\nASSISTA NO VHSFLIX:`);
      lines.push(shareUrl);
      lines.push(`\nFavor rebobinar após assistir!`);

      return lines.join('\n');
    }

    return '';
  };

  // Atualiza o texto da postagem quando o filme ou o template muda
  useEffect(() => {
    if (selectedMovie && !isEditingCustom) {
      const text = generatePostContent(selectedMovie, templateVariant, extraDetails);
      setCustomText(text);
    }
  }, [selectedMovie, templateVariant, extraDetails, isEditingCustom]);

  // Função para cópia para a área de transferência
  const handleCopy = async (text: string, key: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      setCopiedKey(key);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => {
        setCopiedKey(null);
      }, 3000);
    } catch (err) {
      console.error('Falha ao copiar:', err);
    }
  };

  // Testar link oficial em nova aba
  const handleTestLink = () => {
    if (!selectedMovie) return;
    const url = getShareUrl(selectedMovie);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6">
      {/* CABEÇALHO DA CENTRAL DE DIVULGAÇÃO */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-950 border border-zinc-800 shadow-xl px-6 py-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="p-2 rounded-xl bg-rose-600/15 border border-rose-500/30 text-rose-500">
              <Megaphone className="w-5 h-5 animate-pulse" />
            </span>
            <h2 className="text-xl sm:text-2xl font-bold font-display text-white tracking-tight flex items-center gap-2">
              Central de Divulgação <span className="text-rose-500 font-mono text-xs sm:text-sm uppercase px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">VHSFLIX</span>
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1 font-sans">
            Gere e copie postagens personalizadas de qualquer filme ou série para compartilhar manualmente.
          </p>
        </div>

        {/* Notificação Toast de Cópia */}
        <AnimatePresence>
          {copiedKey && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -5 }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 border border-emerald-500 text-emerald-300 rounded-xl text-xs font-mono font-bold shadow-lg shadow-emerald-950/40"
            >
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Copiado com sucesso!</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ÁREA PRINCIPAL: PESQUISA E PREPARAÇÃO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* COLUNA ESQUERDA (5 COLUNAS): BUSCA OBJETIVA NO ACERVO */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-zinc-900/90 border border-zinc-800 p-4 sm:p-5 rounded-2xl shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase font-bold text-zinc-300 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-rose-500" />
                Pesquisar no Acervo
              </span>
              {searchQuery.trim() && (
                <span className="text-[11px] font-mono text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded-full border border-zinc-800">
                  {searchResults.length} {searchResults.length === 1 ? 'encontrado' : 'encontrados'}
                </span>
              )}
            </div>

            {/* Campo de Busca */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Digite o nome da fita (ex: Robôs, Michael)..."
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-rose-500 text-white text-xs font-sans rounded-xl pl-9 pr-9 py-2.5 outline-none transition-all placeholder:text-zinc-500"
                autoFocus={false}
              />
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3 pointer-events-none" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-zinc-500 hover:text-zinc-200 transition-colors p-0.5 rounded"
                  title="Limpar pesquisa"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filtro Rápido (Todos, Filmes, Séries) */}
            <div className="flex items-center gap-1.5 text-[11px] font-mono">
              <button
                type="button"
                onClick={() => setTypeFilter('all')}
                className={`px-3 py-1 rounded-lg border transition-all cursor-pointer font-bold ${
                  typeFilter === 'all'
                    ? 'bg-rose-600 text-white border-rose-500'
                    : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('movie')}
                className={`px-3 py-1 rounded-lg border transition-all cursor-pointer font-bold flex items-center gap-1.5 ${
                  typeFilter === 'movie'
                    ? 'bg-rose-600 text-white border-rose-500'
                    : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
                }`}
              >
                <Film className="w-3 h-3" /> Filmes
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('series')}
                className={`px-3 py-1 rounded-lg border transition-all cursor-pointer font-bold flex items-center gap-1.5 ${
                  typeFilter === 'series'
                    ? 'bg-rose-600 text-white border-rose-500'
                    : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
                }`}
              >
                <Tv className="w-3 h-3" /> Séries
              </button>
            </div>

            {/* ÁREA DE RESULTADOS: APENAS OS FILMES PESQUISADOS (SEM ROLAGEM GIGANTE DO ACERVO TODO) */}
            {!searchQuery.trim() ? (
              <div className="p-6 text-center bg-zinc-950/60 rounded-xl border border-zinc-850 space-y-3">
                <div className="w-10 h-10 mx-auto rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
                  <Search className="w-5 h-5 text-rose-500" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-zinc-200">
                    Digite no campo acima para pesquisar
                  </p>
                  <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
                    Apenas os títulos pesquisados aparecerão aqui, sem rolagem desnecessária de todo o catálogo.
                  </p>
                </div>
                {suggestions.length > 0 && (
                  <div className="pt-2">
                    <span className="text-[10px] font-mono text-zinc-500 block mb-1.5 uppercase tracking-wider">
                      Sugestões do acervo:
                    </span>
                    <div className="flex flex-wrap gap-1.5 justify-center">
                      {suggestions.map((title) => (
                        <button
                          key={title}
                          type="button"
                          onClick={() => setSearchQuery(title)}
                          className="text-[11px] font-mono px-2.5 py-1 bg-zinc-900 hover:bg-rose-950/40 text-zinc-300 hover:text-rose-300 border border-zinc-800 hover:border-rose-500/40 rounded-lg transition-colors cursor-pointer truncate max-w-[150px]"
                        >
                          {title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : searchResults.length === 0 ? (
              <div className="p-6 text-center bg-zinc-950/60 rounded-xl border border-zinc-850 space-y-2">
                <p className="text-xs font-bold text-zinc-300">
                  Nenhum título encontrado para &ldquo;{searchQuery}&rdquo;
                </p>
                <p className="text-[11px] text-zinc-500">
                  Verifique a ortografia ou tente pesquisar por outra palavra-chave.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                {searchResults.map((movie) => {
                  const isSelected = selectedMovie?.id === movie.id;
                  return (
                    <div
                      key={movie.id}
                      onClick={() => {
                        setSelectedMovie(movie);
                        setIsEditingCustom(false);
                      }}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-rose-950/30 border-rose-500/60 shadow-md'
                          : 'bg-zinc-950/80 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={getCleanPosterUrl(movie.posterUrl)}
                          alt={movie.title}
                          className="w-10 h-14 object-cover rounded-lg border border-zinc-800 shrink-0 shadow-sm"
                          onError={handlePosterError}
                        />
                        <div className="min-w-0">
                          <h4 className={`text-xs font-bold truncate ${isSelected ? 'text-rose-400' : 'text-zinc-200'}`}>
                            {movie.title}
                          </h4>
                          <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400 mt-0.5">
                            <span className="uppercase text-zinc-500">
                              {movie.type === 'series' ? 'Série' : 'Filme'}
                            </span>
                            <span>•</span>
                            <span>{movie.year}</span>
                            <span>•</span>
                            <span className="text-zinc-300 font-bold">
                              TMDB {movie.rating}
                            </span>
                          </div>
                          {movie.category && (
                            <span className="text-[10px] text-zinc-500 truncate block mt-0.5">
                              {movie.category}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isSelected ? (
                          <span className="px-2 py-1 bg-rose-600 text-white rounded-lg text-[10px] font-mono font-bold shadow">
                            Ativo
                          </span>
                        ) : (
                          <ChevronRight className="w-4 h-4 text-zinc-600" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* COLUNA DIREITA (7 COLUNAS): GERADOR E COPIADOR REFINADO */}
        <div className="lg:col-span-7 space-y-5">
          {selectedMovie ? (
            <>
              {/* FICHA RESUMO ELEGANTE DO CONTEÚDO SELECIONADO */}
              <div className="bg-zinc-900/90 border border-zinc-800 p-4 sm:p-5 rounded-2xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <img
                    src={getCleanPosterUrl(selectedMovie.posterUrl)}
                    alt={selectedMovie.title}
                    className="w-16 h-24 object-cover rounded-xl border border-zinc-700 shadow-md shrink-0"
                    onError={handlePosterError}
                  />

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 bg-rose-600 text-white text-[10px] font-mono font-bold uppercase rounded-md shadow-sm">
                        {selectedMovie.type === 'series' ? 'Série' : 'Filme'}
                      </span>
                      <span className="text-xs text-zinc-400 font-mono">
                        {selectedMovie.year}
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold font-display text-white uppercase tracking-tight truncate">
                      {selectedMovie.title}
                    </h3>

                    {extraDetails.originalTitle && extraDetails.originalTitle.toLowerCase() !== selectedMovie.title.toLowerCase() && (
                      <p className="text-[11px] text-zinc-400 font-sans truncate">
                        Título Original: {extraDetails.originalTitle}
                      </p>
                    )}

                    <div className="flex items-center gap-2.5 text-xs font-mono text-zinc-300 flex-wrap pt-0.5">
                      <span className="font-bold text-zinc-100 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                        Nota TMDB: {extraDetails.realRating || selectedMovie.rating}/10
                      </span>
                      {selectedMovie.category && (
                        <span className="text-zinc-400 font-sans text-[11px]">
                          {selectedMovie.category}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Botões rápidos da mídia */}
                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800 justify-end">
                  <button
                    type="button"
                    onClick={handleTestLink}
                    className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    title="Abrir página deste título"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-rose-500" />
                    <span>Testar Link</span>
                  </button>
                </div>
              </div>

              {/* MODELOS DE POSTAGEM: COMPLETO (OFICIAL) E RETRÔ VHS (LOCADORA) */}
              <div className="bg-zinc-900/90 border border-zinc-800 p-5 rounded-2xl shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-white font-display uppercase tracking-wider flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-rose-500" />
                      Modelo de Postagem
                    </h4>
                    <p className="text-xs text-zinc-400 font-sans mt-0.5">
                      Selecione a estrutura desejada para gerar a publicação
                    </p>
                  </div>

                  {isEditingCustom && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingCustom(false);
                        const text = generatePostContent(selectedMovie, templateVariant, extraDetails);
                        setCustomText(text);
                      }}
                      className="text-xs font-mono text-rose-400 hover:text-white flex items-center gap-1 cursor-pointer underline"
                    >
                      <RotateCcw className="w-3 h-3" /> Restaurar Original
                    </button>
                  )}
                </div>

                {/* APENAS AS DUAS OPÇÕES REFINADAS E APROVADAS */}
                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => {
                      setTemplateVariant('complete');
                      setIsEditingCustom(false);
                    }}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                      templateVariant === 'complete'
                        ? 'bg-rose-600 text-white border-rose-500 shadow-md font-bold'
                        : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700'
                    }`}
                  >
                    <span className="text-xs sm:text-sm">🎬 Completo</span>
                    <span className="text-[10px] opacity-80">Estrutura oficial</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTemplateVariant('retro');
                      setIsEditingCustom(false);
                    }}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                      templateVariant === 'retro'
                        ? 'bg-rose-600 text-white border-rose-500 shadow-md font-bold'
                        : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700'
                    }`}
                  >
                    <span className="text-xs sm:text-sm">📼 Retrô VHS</span>
                    <span className="text-[10px] opacity-80">Clássico locadora</span>
                  </button>
                </div>

                {/* TEXTO DA POSTAGEM GERADO / EDITÁVEL */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-mono text-zinc-400">
                    <span className="font-bold text-zinc-300 flex items-center gap-1.5">
                      <span>Texto Pronto para Divulgação</span>
                      {isEditingCustom && <span className="text-amber-400 text-[10px]">(Editado)</span>}
                    </span>
                    <span className="text-[11px] text-zinc-500">
                      {customText.length} caracteres
                    </span>
                  </div>

                  <textarea
                    value={customText}
                    onChange={(e) => {
                      setCustomText(e.target.value);
                      setIsEditingCustom(true);
                    }}
                    rows={11}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-rose-500 rounded-xl p-3.5 text-xs font-mono text-zinc-200 outline-none leading-relaxed transition-all resize-y shadow-inner"
                    placeholder="O texto promocional gerado aparecerá aqui..."
                  />
                </div>

                {/* BOTÕES DE CÓPIA CONCENTRADOS E EFICIENTES */}
                <div className="space-y-2.5 pt-1">
                  {/* BOTÃO PRINCIPAL: COPIAR POSTAGEM COMPLETA */}
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => handleCopy(customText, 'full_post')}
                    className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm uppercase tracking-wider py-3.5 rounded-xl shadow-lg shadow-rose-950/40 flex items-center justify-center gap-2 cursor-pointer transition-all border border-rose-500"
                  >
                    {copiedKey === 'full_post' ? (
                      <>
                        <Check className="w-4 h-4 text-white" />
                        <span>Postagem Completa Copiada! ✅</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copiar Postagem Completa</span>
                      </>
                    )}
                  </motion.button>

                  {/* BOTÃO SECUNDÁRIO: COPIAR LINK DA CAPA */}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleCopy(getCleanPosterUrl(selectedMovie.posterUrl), 'poster_url')}
                      className="w-full sm:w-auto px-4 py-2 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 rounded-xl font-mono text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                      title="Copiar link direto da imagem da capa"
                    >
                      {copiedKey === 'poster_url' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-bold">Link da Capa Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Image className="w-3.5 h-3.5 text-rose-500" />
                          <span>Copiar Link da Capa</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-zinc-900/70 border border-zinc-800 p-12 rounded-2xl text-center space-y-3">
              <Megaphone className="w-10 h-10 text-rose-500 mx-auto opacity-50" />
              <h3 className="text-base font-bold text-white font-display">Selecione uma Fita do Acervo</h3>
              <p className="text-xs text-zinc-400 font-sans max-w-sm mx-auto">
                Pesquise por qualquer filme ou série à esquerda para carregar as informações e gerar o material de divulgação.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
