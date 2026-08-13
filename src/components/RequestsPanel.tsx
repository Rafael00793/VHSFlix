import React, { useState, useEffect } from 'react';
import { MessageSquare, Film, Tv, Play, AlertTriangle, Check, Plus, Trash, Search, ArrowRight, Clock, MessageCircle, AlertCircle, Sparkles, X, Star, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Movie, MovieRequest, Profile } from '../types';
import { searchMoviesTMDB, getMovieDetailsTMDB } from '../data';
import { handlePosterError, DEFAULT_POSTER_FALLBACK, getCleanPosterUrl, getCleanBackdropUrl } from '../lib/imageUtils';

interface RequestsPanelProps {
  movies: Movie[];
  requests: MovieRequest[];
  activeProfile: Profile;
  isAdmin: boolean;
  onAddRequest: (title: string, type: 'movie' | 'series', richData?: Partial<MovieRequest>) => void;
  onFulfillRequest: (requestId: string) => void;
  onDeleteRequest: (requestId: string) => void;
  tmdbApiKey?: string;
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
}: RequestsPanelProps) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'movie' | 'series'>('movie');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Estados da pesquisa rica no TMDB
  const [tmdbResults, setTmdbResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedTmdb, setSelectedTmdb] = useState<any | null>(null);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);

  // Normaliza string para melhor correspondência local
  const normalize = (str: string) => str.toLowerCase().trim().replace(/[\s\-\:]/g, '');

  // Verifica se o título inserido já existe localmente no acervo
  const checkIfExists = (inputTitle: string) => {
    if (!inputTitle.trim()) return null;
    const normalizedInput = normalize(inputTitle);
    return movies.find(m => normalize(m.title) === normalizedInput);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    setError(null);
    setSuccess(null);

    // Se o usuário começar a digitar um título livre, limpamos o selecionado do TMDB
    // a menos que o título digitado coincida exatamente com o selecionado
    if (selectedTmdb && selectedTmdb.title !== val) {
      setSelectedTmdb(null);
    }

    const match = checkIfExists(val);
    if (match) {
      setError(`O título "${match.title}" já existe no acervo como ${match.type === 'movie' ? 'Filme' : 'Série'}.`);
    }
  };

  // Auto-pesquisa TMDB conforme digita (Debounced)
  useEffect(() => {
    if (!title.trim() || title.trim().length < 2 || selectedTmdb) {
      setTmdbResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsSearching(true);
      try {
        const cleanedApiKey = tmdbApiKey === 'MY_GEMINI_API_KEY' ? '' : (tmdbApiKey || '');
        const results = await searchMoviesTMDB(title.trim(), cleanedApiKey);
        // Filtrar apenas resultados que sejam filmes ou séries/tv e limitar a 35 resultados para listar pesquisas completas
        const filtered = results
          .filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv')
          .slice(0, 35);
        setTmdbResults(filtered);
      } catch (err) {
        console.error('Erro ao buscar sugestões TMDB no painel de pedidos:', err);
      } finally {
        setIsSearching(false);
      }
    }, 550);

    return () => clearTimeout(delayDebounce);
  }, [title, tmdbApiKey, selectedTmdb]);

  // Busca detalhes ricos do título TMDB selecionado
  const handleSelectTmdbItem = async (id: number, mediaType: 'movie' | 'tv') => {
    setIsFetchingDetails(true);
    setTmdbResults([]);
    setError(null);
    try {
      const cleanedApiKey = tmdbApiKey === 'MY_GEMINI_API_KEY' ? '' : (tmdbApiKey || '');
      const details = await getMovieDetailsTMDB(id, mediaType, cleanedApiKey);
      if (details) {
        setSelectedTmdb(details);
        setTitle(details.title || '');
        setType(details.type === 'series' ? 'series' : 'movie');

        // Dupla checagem: se o título detalhado já existe no catálogo do site
        const match = checkIfExists(details.title || '');
        if (match) {
          setError(`O título "${match.title}" já existe no acervo como ${match.type === 'movie' ? 'Filme' : 'Série'}.`);
        }
      }
    } catch (err) {
      console.error('Erro ao obter detalhes completos TMDB para o pedido', err);
    } finally {
      setIsFetchingDetails(false);
    }
  };

  // Limpa o item do TMDB selecionado para fazer busca livre ou re-digitar
  const handleClearSelection = () => {
    setSelectedTmdb(null);
    setTitle('');
    setTmdbResults([]);
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!title.trim()) {
      setError('Por favor, digite o título do filme ou da série desejada.');
      return;
    }

    const match = checkIfExists(title);
    if (match) {
      setError(`Esse título ("${match.title}") já está no acervo. Caso seja uma versão diferente, especifique o ano no título (ex: "${title.trim()} (1998)").`);
      return;
    }

    // Criar metadados ricos do TMDB para salvar na requisição pública
    const richData: Partial<MovieRequest> = {};
    if (selectedTmdb) {
      if (selectedTmdb.posterUrl !== undefined && selectedTmdb.posterUrl !== null) {
        richData.posterUrl = selectedTmdb.posterUrl;
      }
      if (selectedTmdb.backdropUrl !== undefined && selectedTmdb.backdropUrl !== null) {
        richData.backdropUrl = selectedTmdb.backdropUrl;
      }
      if (selectedTmdb.description !== undefined && selectedTmdb.description !== null) {
        richData.overview = selectedTmdb.description;
      }
      if (selectedTmdb.rating !== undefined && selectedTmdb.rating !== null) {
        richData.rating = selectedTmdb.rating;
      }
      if (selectedTmdb.tmdbId !== undefined && selectedTmdb.tmdbId !== null) {
        richData.tmdbId = selectedTmdb.tmdbId;
      }
      if (selectedTmdb.year !== undefined && selectedTmdb.year !== null) {
        richData.year = selectedTmdb.year;
      }
      if (selectedTmdb.category) {
        richData.genres = [selectedTmdb.category];
      }
      if (selectedTmdb.type === 'series') {
        const seasons = parseInt(selectedTmdb.duration) || 1;
        if (!isNaN(seasons)) {
          richData.seasonsCount = seasons;
        }
      }
    }

    onAddRequest(title.trim(), type, richData);
    
    // Resetar campos
    setTitle('');
    setSelectedTmdb(null);
    setTmdbResults([]);
    setSuccess(`Pedido de "📼 ${title.trim()}" enviado com sucesso à videoteca do vhsflix!`);
    setTimeout(() => setSuccess(null), 5000);
  };

  const filteredRequests = requests.filter(req =>
    req.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.profileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (req.genres && req.genres.some(g => g.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans pt-28 pb-16 px-4 sm:px-8 max-w-[1400px] mx-auto select-none">
      {/* Cabeçalho */}
      <div className="mb-10 text-center md:text-left">
        <span className="text-xs font-mono uppercase tracking-widest text-rose-500 font-bold block mb-1">
          Espaço do Espectador vhsflix
        </span>
        <h1 className="text-3xl sm:text-4xl font-black font-display uppercase tracking-wider text-white">
          Pedidos de <span className="text-rose-500 animate-pulse">Filmes e Séries</span>
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 mt-2 max-w-2xl font-light leading-relaxed">
          Procurou e não encontrou sua fita VHS predileta, clássico dos anos 80, animês ou desenhos vintage? Peça agora mesmo!
          Nossa pesquisa integrada busca a capa, sinopse e nota oficial em tempo real para deixar o pedido decorado.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Formulário de Envio (Lado Esquerdo) */}
        <div className="lg:col-span-5 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 relative overflow-hidden backdrop-blur-md shadow-xl shadow-black/40">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-rose-600" />
          
          <h2 className="text-lg font-bold uppercase tracking-wider text-rose-500 mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-rose-500" />
            <span>Fazer Novo Pedido</span>
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Seletor de Tipo (Apenas visível se NÃO tiver selecionado um título TMDB) */}
            {!selectedTmdb && (
              <div>
                <label className="block text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest mb-1.5">
                  Tipo do Pedido
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setType('movie')}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold font-mono tracking-wider flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer ${
                      type === 'movie'
                        ? 'bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-600/10'
                        : 'bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white'
                    }`}
                  >
                    <Film className="w-3.5 h-3.5" />
                    <span>FILME</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('series')}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold font-mono tracking-wider flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer ${
                      type === 'series'
                        ? 'bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-600/10'
                        : 'bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white'
                    }`}
                  >
                    <Tv className="w-3.5 h-3.5" />
                    <span>SÉRIE</span>
                  </button>
                </div>
              </div>
            )}

            {/* Input Campo de Título Digital ou Carregável */}
            <div className="relative">
              <label className="block text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest mb-1.5 flex justify-between items-center">
                <span>Título do Vídeo</span>
                {isSearching && (
                  <span className="text-[10px] text-rose-400 flex items-center gap-1 font-mono uppercase lowercase-none animate-pulse">
                    <RefreshCw className="w-3 h-3 animate-spin text-rose-500" /> buscando TMDB...
                  </span>
                )}
              </label>
              
              <div className="relative">
                <input
                  type="text"
                  value={title}
                  onChange={handleInputChange}
                  disabled={isFetchingDetails}
                  placeholder="Ex: De Volta Para o Futuro, Twin Peaks..."
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-rose-500/80 rounded-lg pl-3.5 pr-10 py-2.5 text-xs text-white placeholder-zinc-650 focus:outline-none focus:ring-1 focus:ring-rose-500/20 disabled:opacity-50"
                />
                
                {selectedTmdb && (
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-rose-500 transition-colors p-1"
                    title="Limpar e pesquisar de novo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Lista de Sugestões Rápidas TMDB (Dropdown Inteligente) */}
              <AnimatePresence>
                {tmdbResults.length > 0 && !selectedTmdb && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="absolute left-0 right-0 mt-1.5 bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl z-40 max-h-[380px] overflow-y-auto"
                    style={{ scrollbarWidth: 'thin' }}
                  >
                    <div className="p-2 border-b border-zinc-900 bg-zinc-900/40 text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
                      Fitas correspondentes encontradas na rede TMDB:
                    </div>
                    {tmdbResults.map((item) => {
                      const itemTitle = item.title || item.name || 'Título sem Nome';
                      const itemYear = (item.release_date || item.first_air_date || '----').substring(0, 4);
                      const isTv = item.media_type === 'tv';
                      const posterPic = getCleanPosterUrl(item.poster_path);

                      return (
                        <div
                          key={item.id}
                          onClick={() => handleSelectTmdbItem(item.id, item.media_type)}
                          className="flex items-center gap-3 p-2.5 hover:bg-zinc-900/90 border-b border-zinc-900 last:border-0 cursor-pointer select-none group transition-all"
                        >
                          <img 
                            src={posterPic} 
                            alt={itemTitle} 
                            referrerPolicy="no-referrer"
                            className="w-7 h-10 object-cover rounded border border-zinc-800 group-hover:border-zinc-650 shrink-0 select-none"
                            loading="lazy"
                            onError={handlePosterError}
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-zinc-200 group-hover:text-white truncate font-sans">
                              {itemTitle}
                            </h4>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-zinc-500 font-mono">
                              <span className="text-zinc-400">{itemYear}</span>
                              <span>•</span>
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                                isTv ? 'bg-indigo-950 text-indigo-400 border border-indigo-900/50' : 'bg-rose-950 text-rose-400 border border-rose-900/50'
                              }`}>
                                {isTv ? 'SÉRIE' : 'FILME'}
                              </span>
                              {item.vote_average > 0 && (
                                <>
                                  <span>•</span>
                                  <span className="text-yellow-500 font-bold">★ {item.vote_average.toFixed(1)}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-rose-500 transition-colors shrink-0" />
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Spinner de Carregamento dos Detalhes Completos */}
            {isFetchingDetails && (
              <div className="py-8 text-center flex flex-col items-center justify-center gap-2 border border-dashed border-zinc-800 bg-zinc-950/20 rounded-xl">
                <RefreshCw className="w-6 h-6 animate-spin text-rose-500" />
                <p className="text-[11px] font-mono text-zinc-400 uppercase animate-pulse">
                  Alinhando cabeçotes e sintonizando fita TMDB...
                </p>
              </div>
            )}

            {/* VISUALIZAÇÃO DA FITA VHS DO PEDIDO (BENTO CARD ESTILIZADO) */}
            <AnimatePresence>
              {selectedTmdb && !isFetchingDetails && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-zinc-950 border border-rose-500/25 rounded-xl p-4 relative overflow-hidden shadow-2xl"
                >
                  {/* Backdrop estético borrado */}
                  <div 
                    className="absolute inset-0 opacity-15 bg-cover bg-center filter blur-xl select-none"
                    style={{ backgroundImage: `url(${selectedTmdb.backdropUrl || selectedTmdb.posterUrl})` }}
                  />

                  {/* Fita Adesiva VHS Aesthetic */}
                  <div className="absolute top-0 right-4 bg-zinc-900/80 border-x border-b border-zinc-800 text-zinc-500 font-mono text-[8px] px-2 py-0.5 uppercase font-bold tracking-widest select-none z-10 shadow-md">
                    PEDIDO VHS DE CAPA
                  </div>

                  <div className="relative flex gap-4 z-10">
                    <img
                      src={getCleanPosterUrl(selectedTmdb.posterUrl)}
                      alt={selectedTmdb.title}
                      referrerPolicy="no-referrer"
                      className="w-16 sm:w-20 aspect-[2/3] object-cover rounded-lg border border-zinc-800 shadow-lg shrink-0 select-none"
                      loading="lazy"
                      onError={handlePosterError}
                    />

                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        {/* Tipo e Nota */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[8px] font-mono font-bold uppercase border px-1.5 py-0.5 rounded tracking-wide ${
                            selectedTmdb.type === 'series'
                              ? 'bg-indigo-950/80 border-indigo-700/50 text-indigo-400'
                              : 'bg-rose-950/80 border-rose-750/50 text-rose-450'
                          }`}>
                            {selectedTmdb.type === 'series' ? `SÉRIE (${selectedTmdb.duration})` : 'FILME RETRO'}
                          </span>
                          
                          {selectedTmdb.year && (
                            <span className="text-[10px] text-zinc-400 font-mono">{selectedTmdb.year}</span>
                          )}

                          {selectedTmdb.rating > 0 && (
                            <span className="text-[10px] text-yellow-500 font-bold font-mono flex items-center gap-0.5 select-none bg-yellow-500/10 px-1 py-0.5 rounded border border-yellow-500/10">
                              ★ {selectedTmdb.rating.toFixed(1)}
                            </span>
                          )}
                        </div>

                        <h3 className="font-extrabold text-white text-sm sm:text-base mt-2 font-display uppercase tracking-wide leading-tight truncate">
                          {selectedTmdb.title}
                        </h3>

                        {selectedTmdb.category && (
                          <span className="text-[9px] text-rose-400 font-mono uppercase mt-1 inline-block bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded">
                            {selectedTmdb.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Sinopse da Pré-visualização */}
                  {selectedTmdb.description && (
                    <div className="mt-3.5 pt-3.5 border-t border-zinc-900 relative z-10 text-[11px] leading-relaxed text-zinc-400 font-sans line-clamp-3 select-none">
                      <span className="text-zinc-500 font-bold uppercase font-mono mr-1">Sinopse:</span> {selectedTmdb.description}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Avisos Dinâmicos de Erro ou Disponibilidade */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 flex gap-2 text-rose-400"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="text-[11px] leading-relaxed font-mono">{error}</span>
                </motion.div>
              )}

              {success && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 flex gap-2 text-emerald-400"
                >
                  <Check className="w-4 h-4 shrink-0 mt-0.5 animate-bounce" />
                  <span className="text-[11px] leading-relaxed font-mono">{success}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={!!error || !title.trim() || isFetchingDetails}
              className={`w-full py-3 rounded-lg text-xs font-bold uppercase tracking-widest font-mono flex items-center justify-center gap-2 transition-all transition-colors cursor-pointer ${
                !!error || !title.trim() || isFetchingDetails
                  ? 'bg-zinc-800 text-zinc-500 border border-zinc-850 cursor-not-allowed'
                  : 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/15 active:scale-98 border border-rose-500/20'
              }`}
            >
              <span>{selectedTmdb ? 'Confirmar Envio do Pedido' : 'Enviar Pedido Manual'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Dica */}
          <div className="mt-5 pt-4 border-t border-zinc-800/50 flex gap-2 text-[10px] text-zinc-550 italic leading-snug">
            <span className="text-rose-500 font-bold">ℹ</span>
            <span>Seu pedido será associado ao perfil ativo <strong>{activeProfile.name}</strong> para identificação na lista pública de pedidos.</span>
          </div>
        </div>

        {/* Lista Pública de Pedidos (Lado Direito) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-zinc-900/20 p-3 rounded-xl border border-zinc-900">
            <div className="flex items-center gap-2 font-black text-rose-500 font-display text-sm tracking-wide uppercase">
              <MessageSquare className="w-4 h-4" />
              <span>Pedido dos Usuários ({filteredRequests.length})</span>
            </div>

            {/* Barra de Busca de Pedido */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Filtrar pedidos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-650 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 no-scrollbar-y">
            <AnimatePresence initial={false}>
              {filteredRequests.length === 0 ? (
                <div className="text-center py-24 border border-zinc-900 rounded-2xl bg-zinc-950/25">
                  <MessageCircle className="w-10 h-10 text-zinc-600 mx-auto mb-2.5" />
                  <p className="text-xs text-zinc-500 font-mono">Nenhum pedido encontrado na videoteca no momento.</p>
                </div>
              ) : (
                filteredRequests.map((req) => (
                  <motion.div
                    key={req.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-zinc-900/40 border border-zinc-800/70 hover:border-rose-500/20 rounded-xl p-4 relative overflow-hidden transition-all duration-300 hover:bg-zinc-900/80 hover:shadow-xl hover:shadow-rose-600/5 group"
                  >
                    {/* VHS FITA ESTANTE GRID DESIGN */}
                    <div className="flex flex-col sm:flex-row items-start gap-4">
                      {/* Capa Pôster da Fita de Pedido */}
                      <div className="w-16 sm:w-20 aspect-[2/3] bg-zinc-950 rounded-lg border border-zinc-800 overflow-hidden shrink-0 select-none relative shadow-lg shadow-black/60">
                        {req.posterUrl ? (
                          <img 
                            src={getCleanPosterUrl(req.posterUrl)} 
                            alt={req.title} 
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 select-none"
                            loading="lazy"
                            onError={handlePosterError}
                          />
                        ) : (
                          /* Fallback de fita VHS retro */
                          <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900 flex flex-col justify-between p-1.5 font-mono select-none">
                            <div className="text-[6px] text-zinc-550 border-b border-zinc-850 pb-0.5 truncate uppercase">vhsflix</div>
                            <div className="text-center py-1 text-rose-500/50">
                              <Film className="w-6 h-6 mx-auto opacity-70" />
                            </div>
                            <div className="text-[6px] text-zinc-500 text-center uppercase tracking-wide truncate bg-zinc-900 px-0.5 border border-zinc-800">
                              REQUISITADA
                            </div>
                          </div>
                        )}

                        {/* Adesivo Aesthetic de Tipo se tiver pôster */}
                        {req.posterUrl && (
                          <div className={`absolute top-1 left-1 text-[7px] font-mono font-black uppercase text-zinc-950 px-1 py-0.5 rounded leading-none select-none z-10 ${
                            req.type === 'movie' ? 'bg-rose-500' : 'bg-indigo-400'
                          }`}>
                            {req.type === 'movie' ? 'M' : 'S'}
                          </div>
                        )}
                      </div>

                      {/* Dados ricos do pedido */}
                      <div className="flex-1 min-w-0 space-y-1 sm:space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-sm sm:text-base text-zinc-100 group-hover:text-white uppercase tracking-normal leading-tight font-sans">
                            {req.title}
                          </h3>
                          
                          <span className={`text-[8px] font-mono font-extrabold uppercase tracking-wider px-2 py-0.5 rounded border ${
                            req.type === 'movie' 
                              ? 'bg-rose-500/10 border-rose-500/10 text-rose-400' 
                              : 'bg-indigo-500/10 border-indigo-505/10 text-indigo-400'
                          }`}>
                            {req.type === 'movie' ? 'Filme' : 'Série'}
                          </span>

                          {req.year && (
                            <span className="text-[10px] text-zinc-500 font-mono font-semibold">{req.year}</span>
                          )}

                          {req.rating && req.rating > 0 && (
                            <span className="text-[9px] text-yellow-500 font-bold font-mono flex items-center gap-0.5 select-none hover:scale-105 transition-transform bg-yellow-500/5 px-1.5 py-0.5 rounded border border-yellow-500/10">
                              ★ {req.rating.toFixed(1)}
                            </span>
                          )}
                        </div>

                        {/* Sinopse da Fita na Lista */}
                        {req.overview ? (
                          <p className="text-[11px] sm:text-xs text-zinc-400 font-sans leading-relaxed line-clamp-2 sm:line-clamp-3 hover:text-zinc-300 transition-colors select-none font-light">
                            {req.overview}
                          </p>
                        ) : (
                          <p className="text-[11px] sm:text-xs text-zinc-550 font-sans italic leading-relaxed select-none">
                            Sem sinopse anexada. Este título foi pedido manualmente com formulário livre.
                          </p>
                        )}

                        {/* Gêneros da fita requisitada */}
                        {req.genres && req.genres.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap pt-0.5 select-none">
                            {req.genres.map((g, idx) => (
                              <span 
                                key={idx} 
                                className="bg-zinc-950 border border-zinc-800 text-[8px] text-rose-400 font-mono tracking-wide px-1.5 py-0.5 rounded uppercase"
                              >
                                {g}
                              </span>
                            ))}
                            {req.seasonsCount && req.seasonsCount > 0 && (
                              <span className="bg-zinc-950 border border-zinc-800 text-[8px] text-indigo-400 font-mono tracking-wide px-1.5 py-0.5 rounded uppercase">
                                {req.seasonsCount} Temporada{req.seasonsCount > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Rodapé com Quem Pediu e Data */}
                        <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono pt-1 flex-wrap select-none">
                          <span className="flex items-center gap-1 font-semibold text-zinc-400 bg-zinc-950/40 border border-zinc-900 px-1.5 py-0.5 rounded">
                            <Plus className="w-2.5 h-2.5 text-rose-500" /> Pedido de <span className="text-zinc-300 font-extrabold">{req.profileName}</span>
                          </span>
                          <span className="text-zinc-700 font-black">•</span>
                          <span>{new Date(req.createdAt).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                      </div>

                      {/* Ações e Status */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center mt-3 sm:mt-0">
                        {/* Controles de Administrador ou do Próprio Perfil */}
                        {isAdmin ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => onFulfillRequest(req.id)}
                              className="bg-emerald-600/10 hover:bg-emerald-600 border border-emerald-500/20 hover:border-emerald-500 text-emerald-400 hover:text-white px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer shadow-lg shadow-emerald-950/25 active:scale-95"
                              title="Já adicionou esse filme? Clique para preencher o pedido, notificar o usuário e removê-lo."
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Atender fita</span>
                            </button>
                            <button
                              onClick={() => onDeleteRequest(req.id)}
                              className="bg-zinc-950 hover:bg-rose-600/20 border border-zinc-800 hover:border-rose-600/40 text-zinc-500 hover:text-rose-450 p-2 rounded-lg transition-all cursor-pointer active:scale-95"
                              title="Excluir pedido da pilha"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            {req.profileName === activeProfile.name && (
                              <button
                                onClick={() => onDeleteRequest(req.id)}
                                className="bg-zinc-950 hover:bg-rose-600/20 border border-zinc-850 hover:border-rose-600/30 text-zinc-500 hover:text-rose-400 p-2 rounded-lg transition-all cursor-pointer active:scale-95"
                                title="Excluir meu pedido"
                              >
                                <Trash className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <span className="flex items-center gap-1.5 bg-amber-500/10 text-amber-500 px-2.5 py-1 rounded-full text-[9px] font-mono font-black uppercase tracking-widest border border-amber-500/20 select-none">
                              <Clock className="w-3 h-3 animate-pulse text-amber-500" />
                              <span>Aguardando Fita</span>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
