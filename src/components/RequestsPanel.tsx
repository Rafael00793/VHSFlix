import React, { useState, useEffect, useMemo } from 'react';
import { 
  Film, Tv, Play, Check, Plus, Trash, Search, ArrowRight, Clock, 
  MessageCircle, AlertCircle, Sparkles, X, Star, RefreshCw, 
  Grid, List, CheckCircle2, Clapperboard, Send, Layers, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Movie, MovieRequest, Profile } from '../types';
import { searchMoviesTMDB, getMovieDetailsTMDB } from '../data';
import { handlePosterError, DEFAULT_POSTER_FALLBACK, getCleanPosterUrl } from '../lib/imageUtils';

interface RequestsPanelProps {
  movies: Movie[];
  requests: MovieRequest[];
  activeProfile: Profile;
  isAdmin: boolean;
  onAddRequest: (title: string, type: 'movie' | 'series', richData?: Partial<MovieRequest>) => void;
  onFulfillRequest: (requestId: string) => void;
  onDeleteRequest: (requestId: string) => void;
  tmdbApiKey?: string;
  onSelectMovie?: (movie: Movie) => void;
}

export default function RequestsPanel({
  movies,
  requests,
  activeProfile,
  isAdmin,
  onAddRequest,
  onFulfillRequest,
  onDeleteRequest,
  tmdbApiKey,
  onSelectMovie,
}: RequestsPanelProps) {
  // Aba ativa: 'new_request' (busca e solicitação) ou 'community_wall' (mural de pedidos)
  const [activeTab, setActiveTab] = useState<'new_request' | 'community_wall'>('new_request');

  // Modo de visualização dos resultados da busca: 'grid' (capas grandes estilo Netflix) ou 'list' (detalhado)
  const [resultsViewMode, setResultsViewMode] = useState<'grid' | 'list'>('grid');

  // Filtro de tipo na busca TMDB: 'all' | 'movie' | 'series'
  const [mediaTypeFilter, setMediaTypeFilter] = useState<'all' | 'movie' | 'series'>('all');

  // Input de pesquisa e estados do formulário
  const [title, setTitle] = useState('');
  const [manualType, setManualType] = useState<'movie' | 'series'>('movie');
  const [isManualMode, setIsManualMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Estados de busca no TMDB
  const [tmdbResults, setTmdbResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedTmdb, setSelectedTmdb] = useState<any | null>(null);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);

  // Filtros do Mural de Pedidos
  const [muralSearch, setMuralSearch] = useState('');
  const [muralFilter, setMuralFilter] = useState<'all' | 'pending' | 'fulfilled' | 'mine'>('all');

  // Normalização para checagem local
  const normalize = (str: string) => str.toLowerCase().trim().replace(/[\s\-\:\.\,]/g, '');

  // Checa se o título já existe no acervo considerando título, ano de lançamento, tipo de mídia e tmdbId
  // Evita falsos positivos entre remakes, reboots e filmes com mesmo nome de anos diferentes (ex: Invencível 2014 vs 2026, Mortal Kombat 1995 vs 2021)
  const checkIfExists = (
    inputTitle: string, 
    year?: number | string, 
    type?: 'movie' | 'series', 
    tmdbId?: number
  ): Movie | undefined => {
    if (!inputTitle.trim() && !tmdbId) return undefined;
    const normalizedInput = normalize(inputTitle);
    const parsedYear = year && year !== '----' && year !== '????' ? Number(year) : undefined;

    return movies.find(m => {
      // 1. Tipo de mídia deve ser igual se informado (Série !== Filme)
      if (type && m.type && m.type !== type) return false;

      // 2. TMDB ID exato
      if (tmdbId && m.tmdbId && Number(m.tmdbId) === Number(tmdbId)) return true;
      if (tmdbId && m.tmdbId && Number(m.tmdbId) !== Number(tmdbId)) return false;

      // 3. Título normalizado idêntico
      if (normalizedInput && normalize(m.title) === normalizedInput) {
        const mYear = m.year ? Number(m.year) : undefined;
        if (parsedYear && mYear) {
          // Diferença de 2 anos ou mais = PRODUÇÃO DISTINTA (ex: Invencível 2014 vs 2026, Mortal Kombat 1995 vs 2021)
          if (Math.abs(parsedYear - mYear) > 1) {
            return false;
          }
          return true;
        }
        return true;
      }
      return false;
    });
  };

  // Disparo manual ou debounced da busca
  const executeSearch = async (queryText: string) => {
    const trimmed = queryText.trim();
    if (!trimmed || trimmed.length < 2) {
      setTmdbResults([]);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    setError(null);

    try {
      const cleanedApiKey = tmdbApiKey === 'MY_GEMINI_API_KEY' ? '' : (tmdbApiKey || '');
      const rawResults = await searchMoviesTMDB(trimmed, cleanedApiKey);
      const filtered = (rawResults || []).filter((item: any) => 
        (item.media_type === 'movie' || item.media_type === 'tv') && 
        (item.title || item.name)
      );
      setTmdbResults(filtered);
    } catch (err) {
      console.error('Erro ao buscar sugestões TMDB no painel de pedidos:', err);
      setTmdbResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Auto-pesquisa TMDB com debounce enquanto o usuário digita
  useEffect(() => {
    if (!title.trim() || title.trim().length < 2 || selectedTmdb || isManualMode) {
      if (!title.trim()) {
        setTmdbResults([]);
        setHasSearched(false);
      }
      return;
    }

    const timer = setTimeout(() => {
      executeSearch(title);
    }, 450);

    return () => clearTimeout(timer);
  }, [title, tmdbApiKey, selectedTmdb, isManualMode]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    setError(null);
    setSuccess(null);

    if (selectedTmdb && selectedTmdb.title !== val) {
      setSelectedTmdb(null);
    }
  };

  // Busca detalhes ricos do item TMDB selecionado
  const handleSelectTmdbItem = async (id: number, mediaType: 'movie' | 'tv') => {
    setIsFetchingDetails(true);
    setError(null);
    try {
      const cleanedApiKey = tmdbApiKey === 'MY_GEMINI_API_KEY' ? '' : (tmdbApiKey || '');
      const details = await getMovieDetailsTMDB(id, mediaType, cleanedApiKey);
      if (details) {
        setSelectedTmdb(details);
        setTitle(details.title || '');
        setManualType(details.type === 'series' ? 'series' : 'movie');

        const itemYear = details.year || (details.releaseDate ? details.releaseDate.substring(0, 4) : undefined);
        const match = checkIfExists(details.title || '', itemYear, details.type === 'series' ? 'series' : 'movie', details.tmdbId);
        if (match) {
          setError(`O título "${match.title}" (${match.year}) já existe no acervo como ${match.type === 'movie' ? 'Filme' : 'Série'}.`);
        }
      }
    } catch (err) {
      console.error('Erro ao obter detalhes completos TMDB:', err);
    } finally {
      setIsFetchingDetails(false);
    }
  };

  // Limpa a seleção e volta para a busca
  const handleClearSelection = () => {
    setSelectedTmdb(null);
    setError(null);
  };

  // Submissão do pedido
  const handleConfirmSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccess(null);

    const finalTitle = (selectedTmdb?.title || title).trim();

    if (!finalTitle) {
      setError('Por favor, informe o título do filme ou da série desejada.');
      return;
    }

    const submitYear = selectedTmdb?.year || undefined;
    const submitType = (selectedTmdb?.type === 'series' || manualType === 'series') ? 'series' : 'movie';
    const match = checkIfExists(finalTitle, submitYear, submitType, selectedTmdb?.tmdbId);
    if (match) {
      setError(`Esta versão de "${match.title}" (${match.year}) já está disponível no acervo. Caso esteja procurando um remake ou lançamento de outro ano, você pode solicitar selecionando na busca.`);
      return;
    }

    const richData: Partial<MovieRequest> = {};
    if (selectedTmdb) {
      if (selectedTmdb.posterUrl) richData.posterUrl = selectedTmdb.posterUrl;
      if (selectedTmdb.backdropUrl) richData.backdropUrl = selectedTmdb.backdropUrl;
      if (selectedTmdb.description) richData.overview = selectedTmdb.description;
      if (selectedTmdb.rating) richData.rating = selectedTmdb.rating;
      if (selectedTmdb.tmdbId) richData.tmdbId = selectedTmdb.tmdbId;
      if (selectedTmdb.year) richData.year = selectedTmdb.year;
      if (selectedTmdb.category) richData.genres = [selectedTmdb.category];
      if (selectedTmdb.type === 'series') {
        const seasons = parseInt(String(selectedTmdb.duration || '1')) || 1;
        richData.seasonsCount = seasons;
      }
    }

    const requestType = selectedTmdb ? (selectedTmdb.type === 'series' ? 'series' : 'movie') : manualType;

    onAddRequest(finalTitle, requestType, richData);

    // Limpa estado e exibe mensagem de sucesso
    setTitle('');
    setSelectedTmdb(null);
    setTmdbResults([]);
    setHasSearched(false);
    setIsManualMode(false);
    setSuccess(`Pedido de "📼 ${finalTitle}" enviado com sucesso! Nossa equipe foi notificada.`);
    setTimeout(() => setSuccess(null), 6000);
  };

  // Filtragem dos resultados de busca conforme o filtro de tipo (Todos, Filmes, Séries)
  const filteredTmdbResults = useMemo(() => {
    return tmdbResults.filter(item => {
      if (mediaTypeFilter === 'all') return true;
      if (mediaTypeFilter === 'movie') return item.media_type === 'movie';
      if (mediaTypeFilter === 'series') return item.media_type === 'tv';
      return true;
    });
  }, [tmdbResults, mediaTypeFilter]);

  // Filtragem dos pedidos do Mural da Comunidade
  const filteredMuralRequests = useMemo(() => {
    return requests.filter(req => {
      // Filtro de texto
      const term = muralSearch.toLowerCase().trim();
      const matchesSearch = !term ||
        req.title.toLowerCase().includes(term) ||
        req.profileName.toLowerCase().includes(term) ||
        (req.genres && req.genres.some(g => g.toLowerCase().includes(term)));

      if (!matchesSearch) return false;

      // Filtro de aba
      if (muralFilter === 'pending') return req.status !== 'fulfilled';
      if (muralFilter === 'fulfilled') return req.status === 'fulfilled';
      if (muralFilter === 'mine') return req.profileName === activeProfile.name;
      return true;
    });
  }, [requests, muralSearch, muralFilter, activeProfile.name]);

  // Contadores rápidos para o mural
  const pendingCount = requests.filter(r => r.status !== 'fulfilled').length;
  const fulfilledCount = requests.filter(r => r.status === 'fulfilled').length;
  const myRequestsCount = requests.filter(r => r.profileName === activeProfile.name).length;

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans pt-24 sm:pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-[1440px] mx-auto select-none">
      
      {/* ============================================================== */}
      {/* 1. CABEÇALHO DA CENTRAL DE PEDIDOS */}
      {/* ============================================================== */}
      <motion.div 
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6 sm:mb-8 text-center sm:text-left flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-zinc-900 pb-5"
      >
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/10 border border-red-500/25 text-red-400 text-[11px] font-mono font-bold tracking-wider uppercase mb-2">
            <Sparkles className="w-3.5 h-3.5 text-red-500" />
            <span>Videoteca & Atendimento VHSFLIX</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black font-display uppercase tracking-tight text-white flex items-center justify-center sm:justify-start gap-2.5">
            <Clapperboard className="w-7 h-7 sm:w-9 sm:h-9 text-red-600 drop-shadow-[0_0_15px_rgba(239,68,68,0.7)]" />
            <span>Pedidos de <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rose-400 to-amber-400">Filmes & Séries</span></span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 font-sans mt-1 max-w-2xl">
            Pesquise capas do catálogo mundial em alta resolução, solicite novidades para o acervo e acompanhe o status em tempo real.
          </p>
        </div>

        {/* NAVEGAÇÃO SEGMENTADA EM ABAS (ESTILO STREAMING PREMIUM) */}
        <div className="flex items-center p-1 bg-zinc-900/90 rounded-xl border border-zinc-800 self-center sm:self-auto shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTab('new_request')}
            className={`px-4 py-2 sm:py-2.5 rounded-lg text-xs font-bold font-mono tracking-wider uppercase transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'new_request'
                ? 'bg-red-600 text-white shadow-lg shadow-red-950/60 font-black'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
            }`}
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Fazer Pedido</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('community_wall')}
            className={`px-4 py-2 sm:py-2.5 rounded-lg text-xs font-bold font-mono tracking-wider uppercase transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'community_wall'
                ? 'bg-red-600 text-white shadow-lg shadow-red-950/60 font-black'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Mural de Pedidos</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'community_wall' ? 'bg-white/20 text-white' : 'bg-zinc-800 text-zinc-300'
            }`}>
              {requests.length}
            </span>
          </button>
        </div>
      </motion.div>

      {/* AVISOS GERAIS DE SUCESSO OU ERRO */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 flex items-center gap-3 shadow-lg shadow-emerald-950/30"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-xs sm:text-sm font-semibold font-sans">{success}</span>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 rounded-xl bg-red-600/15 border border-red-500/40 text-red-300 flex items-center gap-3 shadow-lg shadow-red-950/30"
          >
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span className="text-xs sm:text-sm font-semibold font-sans">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================================== */}
      {/* 2. ABA 1: FAZER NOVO PEDIDO (BUSCA VISUAL EXPANSIVA) */}
      {/* ============================================================== */}
      {activeTab === 'new_request' && (
        <div className="space-y-6">

          {/* CARD SPOTLIGHT CASO UM TÍTULO ESTEJA SELECIONADO */}
          <AnimatePresence>
            {selectedTmdb && !isFetchingDetails && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="relative overflow-hidden rounded-2xl border-2 border-red-600/70 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 p-5 sm:p-7 shadow-[0_0_50px_rgba(220,38,38,0.25)]"
              >
                {/* Backdrop cinematográfico de fundo */}
                {selectedTmdb.backdropUrl && (
                  <div 
                    className="absolute inset-0 opacity-20 bg-cover bg-center filter blur-lg pointer-events-none select-none"
                    style={{ backgroundImage: `url(${selectedTmdb.backdropUrl})` }}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/90 to-transparent pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6">
                  {/* Capa Gigante de Cinema */}
                  <div className="relative w-36 sm:w-44 md:w-52 aspect-[2/3] rounded-xl overflow-hidden border-2 border-red-500 shadow-2xl shrink-0 group">
                    <img
                      src={getCleanPosterUrl(selectedTmdb.posterUrl)}
                      alt={selectedTmdb.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover select-none group-hover:scale-105 transition-transform duration-300"
                      onError={handlePosterError}
                    />
                    <div className="absolute top-2 left-2 bg-red-600 text-white font-mono font-black text-[10px] px-2 py-0.5 rounded shadow uppercase">
                      {selectedTmdb.type === 'series' ? 'Série' : 'Filme'}
                    </div>
                  </div>

                  {/* Informações Completas */}
                  <div className="flex-1 min-w-0 text-center md:text-left space-y-3">
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                      <span className="text-[11px] font-mono font-bold text-red-400 bg-red-950/60 border border-red-800/60 px-2.5 py-0.5 rounded-full uppercase">
                        TÍTULO SELECIONADO DO TMDB
                      </span>
                      {selectedTmdb.year && (
                        <span className="text-xs font-mono font-bold text-zinc-300 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">
                          {selectedTmdb.year}
                        </span>
                      )}
                      {selectedTmdb.rating > 0 && (
                        <span className="text-xs font-mono font-black text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>{selectedTmdb.rating.toFixed(1)}</span>
                        </span>
                      )}
                      {selectedTmdb.category && (
                        <span className="text-xs font-mono text-zinc-300 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">
                          {selectedTmdb.category}
                        </span>
                      )}
                    </div>

                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-black font-display uppercase tracking-tight text-white leading-tight">
                      {selectedTmdb.title}
                    </h2>

                    {selectedTmdb.description && (
                      <p className="text-xs sm:text-sm text-zinc-300 font-sans leading-relaxed line-clamp-4 max-w-3xl">
                        {selectedTmdb.description}
                      </p>
                    )}

                    {/* Botões de Ação do Spotlight */}
                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-center md:justify-start gap-3">
                      <button
                        type="button"
                        onClick={() => handleConfirmSubmit()}
                        className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-mono font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_0_30px_rgba(239,68,68,0.6)] hover:shadow-[0_0_40px_rgba(239,68,68,0.85)] flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
                        id="btn-confirm-selected-request"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>Confirmar Pedido Deste {selectedTmdb.type === 'series' ? 'Série' : 'Filme'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleClearSelection}
                        className="w-full sm:w-auto px-4 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white font-mono text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-2"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Escolher Outro Título</span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* BARRA DE PESQUISA PRINCIPAL */}
          {!selectedTmdb && (
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 sm:p-6 shadow-2xl backdrop-blur-md relative space-y-4">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <h2 className="text-base sm:text-lg font-black uppercase tracking-wide text-white flex items-center gap-2 font-display">
                    <Search className="w-5 h-5 text-red-500" />
                    <span>Buscar Título no Catálogo Mundial</span>
                  </h2>
                  <p className="text-xs text-zinc-400 font-sans">
                    Digite o nome de qualquer filme ou série (ex: <strong className="text-zinc-200">O Poderoso Chefão</strong>, <strong className="text-zinc-200">De Volta Para o Futuro</strong>, <strong className="text-zinc-200">Breaking Bad</strong>).
                  </p>
                </div>

                {/* Filtro por Tipo de Mídia */}
                <div className="flex items-center gap-1.5 p-1 bg-zinc-950 rounded-xl border border-zinc-850 self-start md:self-auto">
                  <button
                    type="button"
                    onClick={() => setMediaTypeFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold uppercase transition-all cursor-pointer ${
                      mediaTypeFilter === 'all'
                        ? 'bg-red-600 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setMediaTypeFilter('movie')}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold uppercase transition-all cursor-pointer flex items-center gap-1 ${
                      mediaTypeFilter === 'movie'
                        ? 'bg-red-600 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Film className="w-3 h-3" />
                    <span>Filmes</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMediaTypeFilter('series')}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold uppercase transition-all cursor-pointer flex items-center gap-1 ${
                      mediaTypeFilter === 'series'
                        ? 'bg-red-600 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Tv className="w-3 h-3" />
                    <span>Séries</span>
                  </button>
                </div>
              </div>

              {/* INPUT DE BUSCA ULTRA VISÍVEL */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  executeSearch(title);
                }}
                className="relative flex items-center"
              >
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500 pointer-events-none" />
                  <input
                    type="text"
                    value={title}
                    onChange={handleInputChange}
                    placeholder="Digite o título do filme ou da série aqui..."
                    className="w-full bg-zinc-950 border-2 border-zinc-800 focus:border-red-500 rounded-xl pl-12 pr-12 py-3.5 sm:py-4 text-sm sm:text-base text-white placeholder-zinc-500 focus:outline-none focus:ring-4 focus:ring-red-500/20 transition-all font-sans font-semibold shadow-inner"
                    id="input-movie-request-search"
                    autoFocus
                  />
                  {title && (
                    <button
                      type="button"
                      onClick={() => {
                        setTitle('');
                        setTmdbResults([]);
                        setHasSearched(false);
                      }}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
                      title="Limpar busca"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSearching || !title.trim()}
                  className="ml-2.5 px-5 sm:px-7 py-3.5 sm:py-4 rounded-xl bg-red-600 hover:bg-red-500 disabled:bg-zinc-800 text-white disabled:text-zinc-500 font-mono font-black text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-red-950/50 shrink-0"
                >
                  {isSearching ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span className="hidden sm:inline">Buscando...</span>
                    </>
                  ) : (
                    <>
                      <span>Buscar</span>
                      <ArrowRight className="w-4 h-4 stroke-[3]" />
                    </>
                  )}
                </button>
              </form>

              {/* BARRA DE CONTROLE DE EXIBIÇÃO CASO HAJA RESULTADOS */}
              {filteredTmdbResults.length > 0 && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 border-t border-zinc-800/80">
                  <span className="text-xs font-mono font-bold text-zinc-400 uppercase">
                    {filteredTmdbResults.length} títulos encontrados no catálogo:
                  </span>

                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase mr-1">Exibição:</span>
                    <button
                      type="button"
                      onClick={() => setResultsViewMode('grid')}
                      className={`p-1.5 rounded-lg border text-xs font-mono transition-colors cursor-pointer ${
                        resultsViewMode === 'grid'
                          ? 'bg-zinc-800 border-red-500/50 text-white'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-white'
                      }`}
                      title="Grade de Capas Grandes"
                    >
                      <Grid className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setResultsViewMode('list')}
                      className={`p-1.5 rounded-lg border text-xs font-mono transition-colors cursor-pointer ${
                        resultsViewMode === 'list'
                          ? 'bg-zinc-800 border-red-500/50 text-white'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-white'
                      }`}
                      title="Lista Detalhada"
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SPINNER DE CARREGAMENTO */}
          {isFetchingDetails && (
            <div className="p-12 text-center rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-red-500" />
              <p className="text-xs font-mono text-zinc-300 uppercase tracking-widest animate-pulse">
                Carregando dados completos e capa em alta resolução...
              </p>
            </div>
          )}

          {/* ============================================================== */}
          {/* RESULTADOS DA BUSCA (CAPAS GIGANTES, LEGÍVEIS E SEM CORTE) */}
          {/* ============================================================== */}
          {!selectedTmdb && !isFetchingDetails && filteredTmdbResults.length > 0 && (
            <div className="space-y-4">
              
              {/* MODO GRADE: CAPAS GRANDES ESTILO NETFLIX / PRIME VIDEO */}
              {resultsViewMode === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-5">
                  {filteredTmdbResults.map((item, idx) => {
                    const itemTitle = item.title || item.name || 'Título sem nome';
                    const itemYear = (item.release_date || item.first_air_date || '----').substring(0, 4);
                    const isTv = item.media_type === 'tv';
                    const posterPic = getCleanPosterUrl(item.poster_path);
                    const itemMediaType: 'movie' | 'series' = isTv ? 'series' : 'movie';
                    const alreadyExists = checkIfExists(itemTitle, itemYear !== '----' ? itemYear : undefined, itemMediaType, item.id);

                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: Math.min(idx * 0.04, 0.4) }}
                        whileHover={{ y: -6, transition: { duration: 0.2 } }}
                        onClick={() => handleSelectTmdbItem(item.id, item.media_type)}
                        className="group relative flex flex-col bg-zinc-900/90 border border-zinc-800/90 hover:border-red-500 rounded-xl overflow-hidden shadow-lg hover:shadow-[0_0_25px_rgba(239,68,68,0.35)] transition-all cursor-pointer"
                        id={`tmdb-result-${item.id}`}
                      >
                        {/* Box de Capa de Cinema Proporcional (2/3) */}
                        <div className="relative aspect-[2/3] w-full bg-zinc-950 overflow-hidden">
                          <img
                            src={posterPic}
                            alt={itemTitle}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 select-none"
                            loading="lazy"
                            onError={handlePosterError}
                          />

                          {/* Gradiente escuro no rodapé da capa para legibilidade */}
                          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-black/30 pointer-events-none" />

                          {/* Tag de Tipo no Topo */}
                          <div className="absolute top-2 left-2 flex items-center gap-1 z-10">
                            <span className={`text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded shadow ${
                              isTv ? 'bg-indigo-600 text-white' : 'bg-red-600 text-white'
                            }`}>
                              {isTv ? 'SÉRIE' : 'FILME'}
                            </span>
                          </div>

                          {/* Ano e Nota no Canto */}
                          <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
                            {item.vote_average > 0 && (
                              <span className="text-[10px] font-mono font-bold bg-black/85 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/30 flex items-center gap-0.5 shadow">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                <span>{item.vote_average.toFixed(1)}</span>
                              </span>
                            )}
                          </div>

                          {/* Overlay de Hover para Ação Rápida */}
                          <div className="absolute inset-0 bg-red-600/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-3">
                            <span className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-mono font-black uppercase tracking-wider shadow-lg flex items-center gap-1.5">
                              <span>Pedir Este</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </span>
                          </div>

                          {alreadyExists && (
                            <div className="absolute bottom-2 left-2 right-2 bg-emerald-600/90 backdrop-blur-xs text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded text-center shadow">
                              Já no Acervo ✅
                            </div>
                          )}
                        </div>

                        {/* Dados textuais do título */}
                        <div className="p-3 flex-1 flex flex-col justify-between space-y-1.5">
                          <h3 className="font-bold text-xs sm:text-sm text-white group-hover:text-red-400 transition-colors line-clamp-2 leading-snug font-sans">
                            {itemTitle}
                          </h3>

                          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-1 border-t border-zinc-800/60">
                            <span className="font-semibold">{itemYear}</span>
                            <span className="text-red-400 font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                              Pedir &rarr;
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                /* MODO LISTA: CARDS HORIZONTAIS DETALHADOS COM SINOPSE */
                <div className="space-y-3">
                  {filteredTmdbResults.map((item, idx) => {
                    const itemTitle = item.title || item.name || 'Título sem nome';
                    const itemYear = (item.release_date || item.first_air_date || '----').substring(0, 4);
                    const isTv = item.media_type === 'tv';
                    const posterPic = getCleanPosterUrl(item.poster_path);
                    const itemMediaType: 'movie' | 'series' = isTv ? 'series' : 'movie';
                    const alreadyExists = checkIfExists(itemTitle, itemYear !== '----' ? itemYear : undefined, itemMediaType, item.id);

                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: Math.min(idx * 0.03, 0.3) }}
                        onClick={() => handleSelectTmdbItem(item.id, item.media_type)}
                        className="group bg-zinc-900/90 border border-zinc-800 hover:border-red-500 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all hover:bg-zinc-850 hover:shadow-xl hover:shadow-red-950/20 cursor-pointer"
                      >
                        <div className="flex items-start gap-4 min-w-0 flex-1">
                          <img
                            src={posterPic}
                            alt={itemTitle}
                            referrerPolicy="no-referrer"
                            className="w-16 sm:w-20 aspect-[2/3] object-cover rounded-lg border border-zinc-800 group-hover:border-red-500 shrink-0 select-none shadow-md"
                            loading="lazy"
                            onError={handlePosterError}
                          />

                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded shadow ${
                                isTv ? 'bg-indigo-600 text-white' : 'bg-red-600 text-white'
                              }`}>
                                {isTv ? 'SÉRIE' : 'FILME'}
                              </span>
                              <span className="text-xs font-mono font-bold text-zinc-400">
                                {itemYear}
                              </span>
                              {item.vote_average > 0 && (
                                <span className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1">
                                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                  <span>{item.vote_average.toFixed(1)}</span>
                                </span>
                              )}
                              {alreadyExists && (
                                <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                                  Já no Acervo
                                </span>
                              )}
                            </div>

                            <h3 className="font-bold text-sm sm:text-base text-white group-hover:text-red-400 transition-colors font-sans">
                              {itemTitle}
                            </h3>

                            {item.overview && (
                              <p className="text-xs text-zinc-400 font-sans line-clamp-2 leading-relaxed">
                                {item.overview}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0 self-end sm:self-center">
                          <button
                            type="button"
                            className="px-4 py-2 rounded-xl bg-red-600 group-hover:bg-red-500 text-white font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-red-950/40 transition-colors"
                          >
                            <span>Selecionar</span>
                            <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* NENHUM RESULTADO ENCONTRADO NO TMDB / OPÇÃO DE DIGITAÇÃO MANUAL LIVRE */}
          {!selectedTmdb && !isFetchingDetails && hasSearched && filteredTmdbResults.length === 0 && (
            <div className="p-8 sm:p-12 text-center rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
              <Film className="w-10 h-10 text-zinc-600 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white font-display uppercase tracking-wide">
                  Nenhum título encontrado com "{title}"
                </h3>
                <p className="text-xs text-zinc-400 max-w-md mx-auto font-sans leading-relaxed">
                  Não se preocupe! Você pode enviar este pedido manualmente com digitação livre caso seja um título raro, clássico nacional ou fita independente.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsManualMode(true)}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-mono font-bold text-xs uppercase tracking-wider transition-colors inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-red-950/50"
              >
                <Plus className="w-4 h-4" />
                <span>Enviar como Pedido Manual Livre</span>
              </button>
            </div>
          )}

          {/* FORMULÁRIO DE PEDIDO MANUAL LIVRE (SE ATIVADO OU CASO O USUÁRIO QUEIRA) */}
          {isManualMode && !selectedTmdb && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-zinc-900/95 border-2 border-red-600/40 rounded-2xl p-6 shadow-2xl space-y-4 max-w-xl mx-auto"
            >
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-red-500 flex items-center gap-2">
                  <Clapperboard className="w-4 h-4 text-red-500" />
                  <span>Pedido Manual Livre</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsManualMode(false)}
                  className="text-zinc-500 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-zinc-400 font-bold mb-1">
                    Tipo de Mídia
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setManualType('movie')}
                      className={`py-2 px-3 rounded-lg border text-xs font-mono font-bold uppercase transition-all ${
                        manualType === 'movie'
                          ? 'bg-red-600 border-red-500 text-white shadow-md'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      Filme
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualType('series')}
                      className={`py-2 px-3 rounded-lg border text-xs font-mono font-bold uppercase transition-all ${
                        manualType === 'series'
                          ? 'bg-red-600 border-red-500 text-white shadow-md'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      Série
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-zinc-400 font-bold mb-1">
                    Título Completo do Pedido
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: O Poderoso Chefão (1972)"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-red-500 font-sans"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleConfirmSubmit()}
                  disabled={!title.trim()}
                  className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:bg-zinc-800 text-white font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-red-950/40"
                >
                  <Send className="w-4 h-4" />
                  <span>Enviar Pedido Manual</span>
                </button>
              </div>
            </motion.div>
          )}

        </div>
      )}

      {/* ============================================================== */}
      {/* 3. ABA 2: MURAL DE PEDIDOS DA COMUNIDADE */}
      {/* ============================================================== */}
      {activeTab === 'community_wall' && (
        <div className="space-y-6">

          {/* BARRA DE FILTROS E PESQUISA NO MURAL */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            
            {/* Filtros por Status */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
              <button
                type="button"
                onClick={() => setMuralFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-all whitespace-nowrap cursor-pointer ${
                  muralFilter === 'all'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                Todos ({requests.length})
              </button>

              <button
                type="button"
                onClick={() => setMuralFilter('pending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  muralFilter === 'pending'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Pendentes ({pendingCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setMuralFilter('fulfilled')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  muralFilter === 'fulfilled'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Atendidos ({fulfilledCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setMuralFilter('mine')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-all whitespace-nowrap cursor-pointer ${
                  muralFilter === 'mine'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                Meus Pedidos ({myRequestsCount})
              </button>
            </div>

            {/* Barra de Pesquisa Rápida no Mural */}
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                value={muralSearch}
                onChange={(e) => setMuralSearch(e.target.value)}
                placeholder="Filtrar por título ou usuário..."
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-red-500 rounded-xl pl-10 pr-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors font-sans"
              />
              {muralSearch && (
                <button
                  type="button"
                  onClick={() => setMuralSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* LISTA RESPONSIVA DE PEDIDOS NO MURAL */}
          {filteredMuralRequests.length === 0 ? (
            <div className="p-16 text-center rounded-2xl bg-zinc-900/40 border border-zinc-900 space-y-3">
              <MessageCircle className="w-10 h-10 text-zinc-600 mx-auto" />
              <h3 className="text-base font-bold text-white font-display uppercase tracking-wide">
                Nenhum pedido encontrado nesta seção
              </h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto font-sans">
                {muralSearch 
                  ? 'Tente buscar com outros termos ou limpe o filtro de busca.' 
                  : 'Seja o primeiro a solicitar um filme ou série retro para nosso acervo!'}
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('new_request')}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-mono font-bold text-xs uppercase tracking-wider inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-red-950/50"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Fazer um Pedido Agora</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMuralRequests.map((req, idx) => {
                const existingMovie = checkIfExists(req.title);
                const isFulfilled = req.status === 'fulfilled' || Boolean(existingMovie);

                return (
                  <motion.div
                    key={req.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: Math.min(idx * 0.04, 0.4) }}
                    className="bg-zinc-900/90 border border-zinc-800/90 hover:border-red-600/50 rounded-2xl p-4 sm:p-5 relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-red-950/25 flex flex-col justify-between group"
                  >
                    <div className="flex items-start gap-4">
                      {/* Pôster com proporção adequada */}
                      <div className="relative w-20 sm:w-24 aspect-[2/3] rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800 shrink-0 shadow-lg select-none">
                        <img
                          src={getCleanPosterUrl(req.posterUrl)}
                          alt={req.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover select-none group-hover:scale-105 transition-transform duration-300"
                          onError={handlePosterError}
                          loading="lazy"
                        />
                        <div className={`absolute top-1 left-1 text-[8px] font-mono font-black uppercase text-white px-1.5 py-0.5 rounded shadow ${
                          req.type === 'series' ? 'bg-indigo-600' : 'bg-red-600'
                        }`}>
                          {req.type === 'series' ? 'S' : 'M'}
                        </div>
                      </div>

                      {/* Informações da fita solicitada */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded border ${
                            req.type === 'series'
                              ? 'bg-indigo-950 text-indigo-400 border-indigo-800/60'
                              : 'bg-red-950 text-red-400 border-red-800/60'
                          }`}>
                            {req.type === 'series' ? 'Série' : 'Filme'}
                          </span>

                          {req.year && (
                            <span className="text-[11px] font-mono font-bold text-zinc-400">
                              {req.year}
                            </span>
                          )}

                          {req.rating && req.rating > 0 && (
                            <span className="text-[11px] font-mono font-bold text-amber-400 flex items-center gap-0.5">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              <span>{req.rating.toFixed(1)}</span>
                            </span>
                          )}
                        </div>

                        <h3 className="font-bold text-base sm:text-lg text-white group-hover:text-red-400 transition-colors leading-tight font-sans">
                          {req.title}
                        </h3>

                        {req.overview && (
                          <p className="text-xs text-zinc-400 font-sans line-clamp-2 leading-relaxed">
                            {req.overview}
                          </p>
                        )}

                        <div className="pt-1 flex items-center gap-2 text-[11px] font-mono text-zinc-400">
                          <span>Pedido de: <strong className="text-zinc-200">{req.profileName}</strong></span>
                          <span>•</span>
                          <span>{new Date(req.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
                        </div>
                      </div>
                    </div>

                    {/* STATUS E AÇÕES NO RODAPÉ DO CARD */}
                    <div className="mt-4 pt-3 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {isFulfilled ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-black uppercase bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 shadow-sm">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Disponível no Acervo ✅</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase bg-amber-500/15 border border-amber-500/30 text-amber-400 shadow-sm">
                            <Clock className="w-3.5 h-3.5 animate-pulse" />
                            <span>Aguardando Fita</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Se o filme já estiver no catálogo, permite assistir direto */}
                        {existingMovie && onSelectMovie && (
                          <button
                            type="button"
                            onClick={() => onSelectMovie(existingMovie)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold uppercase flex items-center gap-1 cursor-pointer shadow-md transition-colors"
                          >
                            <Play className="w-3 h-3 fill-white" />
                            <span>Assistir</span>
                          </button>
                        )}

                        {/* Ações de Admin */}
                        {isAdmin && (
                          <>
                            {!isFulfilled && (
                              <button
                                type="button"
                                onClick={() => onFulfillRequest(req.id)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold uppercase flex items-center gap-1 cursor-pointer shadow-md transition-colors"
                                title="Marcar como atendido"
                              >
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                <span>Atender</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => onDeleteRequest(req.id)}
                              className="p-1.5 rounded-lg bg-zinc-950 hover:bg-red-600/20 text-zinc-400 hover:text-red-400 border border-zinc-800 transition-colors cursor-pointer"
                              title="Excluir pedido"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}

                        {/* Usuário excluindo seu próprio pedido */}
                        {!isAdmin && req.profileName === activeProfile.name && (
                          <button
                            type="button"
                            onClick={() => onDeleteRequest(req.id)}
                            className="p-1.5 rounded-lg bg-zinc-950 hover:bg-red-600/20 text-zinc-400 hover:text-red-400 border border-zinc-800 transition-colors cursor-pointer"
                            title="Excluir meu pedido"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

        </div>
      )}

    </div>
  );
}
