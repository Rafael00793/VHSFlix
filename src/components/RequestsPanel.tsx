import React, { useState } from 'react';
import { MessageSquare, Film, Tv, Play, AlertTriangle, Check, Plus, Trash, Search, ArrowRight, Clock, MessageCircle, AlertCircle, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Movie, MovieRequest, Profile } from '../types';

interface RequestsPanelProps {
  movies: Movie[];
  requests: MovieRequest[];
  activeProfile: Profile;
  isAdmin: boolean;
  onAddRequest: (title: string, type: 'movie' | 'series') => void;
  onFulfillRequest: (requestId: string) => void;
  onDeleteRequest: (requestId: string) => void;
}

export default function RequestsPanel({
  movies,
  requests,
  activeProfile,
  isAdmin,
  onAddRequest,
  onFulfillRequest,
  onDeleteRequest,
}: RequestsPanelProps) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'movie' | 'series'>('movie');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Normalize string for better matching
  const normalize = (str: string) => str.toLowerCase().trim().replace(/[\s\-\:]/g, '');

  // Check if movie/series already exists in catalog
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

    const match = checkIfExists(val);
    if (match) {
      setError(`O título "${match.title}" já existe no site! Ele está disponível na categoria "${match.category}" como ${match.type === 'movie' ? 'Filme' : 'Série'}.`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!title.trim()) {
      setError('Por favor, digite o título do filme ou da série.');
      return;
    }

    const match = checkIfExists(title);
    if (match) {
      setError(`Seu pedido não pôde ser enviado porque "${match.title}" já está disponível em nosso site.`);
      return;
    }

    onAddRequest(title.trim(), type);
    setTitle('');
    setSuccess(`Pedido para "${title.trim()}" enviado com sucesso!`);
    setTimeout(() => setSuccess(null), 5000);
  };

  const filteredRequests = requests.filter(req =>
    req.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.profileName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans pt-28 pb-16 px-4 sm:px-8 max-w-[1400px] mx-auto">
      {/* Cabeçalho */}
      <div className="mb-10 text-center md:text-left">
        <span className="text-xs font-mono uppercase tracking-widest text-rose-500 font-bold block mb-1">
          Espaço do Espectador vhsflix
        </span>
        <h1 className="text-3xl sm:text-4xl font-black font-display uppercase tracking-wider text-white">
          Pedidos de <span className="text-rose-500">Filmes e Séries</span>
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 mt-2 max-w-2xl font-light leading-relaxed">
          Quer assistir a um clássico vintage, um seriado antigo ou um desenho que não encontrou? Envie sua sugestão! 
          Quando o administrador adicionar o filme, você receberá uma notificação instantânea e o pedido sairá da lista.
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
                  <span>SÉRIE / OUTRO</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest mb-1.5">
                Título do Vídeo
              </label>
              <input
                type="text"
                value={title}
                onChange={handleInputChange}
                placeholder="Ex: De Volta Para o Futuro, Twin Peaks..."
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-rose-500/80 rounded-lg px-3.5 py-2 text-xs text-white placeholder-zinc-650 focus:outline-none focus:ring-1 focus:ring-rose-500/20"
              />
            </div>

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
              disabled={!!error || !title.trim()}
              className={`w-full py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest font-mono flex items-center justify-center gap-2 transition-all transition-colors cursor-pointer ${
                !!error || !title.trim()
                  ? 'bg-zinc-800 text-zinc-500 border border-zinc-850 cursor-not-allowed'
                  : 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/10 active:scale-98'
              }`}
            >
              <span>Enviar Pedido</span>
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
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-zinc-900/20 p-3 rounded-lg border border-zinc-900">
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

          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 no-scrollbar">
            <AnimatePresence initial={false}>
              {filteredRequests.length === 0 ? (
                <div className="text-center py-16 border border-zinc-900 rounded-2xl bg-zinc-950/25">
                  <MessageCircle className="w-8 h-8 text-zinc-600 mx-auto mb-2.5" />
                  <p className="text-xs text-zinc-500 font-mono">Nenhum pedido encontrado no momento.</p>
                </div>
              ) : (
                filteredRequests.map((req) => (
                  <motion.div
                    key={req.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-zinc-900 border border-zinc-800/60 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:bg-zinc-850 hover:border-zinc-750"
                  >
                    {/* Infos do filme */}
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-rose-400 shrink-0 mt-0.5">
                        {req.type === 'movie' ? <Film className="w-4 h-4" /> : <Tv className="w-4 h-4" />}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-sm text-zinc-150 uppercase tracking-wide leading-tight">
                            {req.title}
                          </h3>
                          <span className={`text-[8px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                            req.type === 'movie' 
                              ? 'bg-rose-500/10 text-rose-400' 
                              : 'bg-indigo-500/10 text-indigo-400'
                          }`}>
                            {req.type === 'movie' ? 'Filme' : 'Série'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono">
                          <span>Pedido por:</span>
                          <span className="text-zinc-350 font-bold">{req.profileName}</span>
                          <span className="text-zinc-600">•</span>
                          <span>{new Date(req.createdAt).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}</span>
                        </div>
                      </div>
                    </div>

                    {/* Ações e Status */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      {/* Admin controls */}
                      {isAdmin ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => onFulfillRequest(req.id)}
                            className="bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/30 hover:border-emerald-500 text-emerald-400 hover:text-white px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer"
                            title="Já adicionou esse filme? Clique para notificar o usuário e apagar o pedido."
                          >
                            <Check className="w-3 h-3" />
                            <span>Atender / Notificar</span>
                          </button>
                          <button
                            onClick={() => onDeleteRequest(req.id)}
                            className="bg-zinc-950 hover:bg-rose-600/20 border border-zinc-800 hover:border-rose-600/40 text-zinc-500 hover:text-rose-450 p-1.5 rounded-lg transition-all cursor-pointer"
                            title="Excluir pedido"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="flex items-center gap-1 bg-amber-500/10 text-amber-500 px-2.5 py-1 rounded-full text-[9px] font-mono font-bold uppercase tracking-widest border border-amber-500/20">
                          <Clock className="w-3 h-3 animate-pulse" />
                          <span>Pendente</span>
                        </span>
                      )}
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
