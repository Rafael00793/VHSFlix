/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Movie, User, Profile, MovieRequest, MovieComment, getSubscriptionDaysLeft, renewSubscription } from '../types';
import { GENRE_CATEGORIES, searchMoviesTMDB, getMovieDetailsTMDB, PROFILE_AVATARS, DEFAULT_USER_AVATAR, RAFAEL_ADMIN_AVATAR } from '../data';
import { Trash, Edit, Plus, Users, Library, Settings, Search, Import, Download, Star, Shield, Film, Tv, Play, AlertTriangle, ShieldAlert, RefreshCw, Check, LayoutDashboard, Activity, Clock, TrendingUp, User as UserIcon, Lock as LockIcon, Eye, EyeOff, Flame, Sparkles, Pin, X, Save, Award, ChevronLeft, ChevronRight, Megaphone, Share2, Bell, MessageSquare, CheckCircle2, Send, ExternalLink, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { compressImage, saveMoviesToFirestore } from '../lib/firebase';
import { DEFAULT_POSTER_FALLBACK, DEFAULT_BACKDROP_FALLBACK, handlePosterError, handleBackdropError, getCleanPosterUrl, getCleanBackdropUrl } from '../lib/imageUtils';
import { AbyssService } from '../services/abyssService';
import PromotionCenter from './PromotionCenter';

interface AdminPanelProps {
  movies: any[]; // para maior flexibilidade se houver types
  users: User[];
  allProfiles: { [userId: string]: Profile[] };
  tmdbApiKey: string;
  onUpdateTmdbApiKey: (key: string) => void;
  abyssApiKey?: string;
  onUpdateAbyssApiKey?: (key: string) => void;
  onAddMovie: (movie: Omit<Movie, 'id'>) => boolean | void;
  onEditMovie: (movie: Movie) => void;
  onDeleteMovie: (movieId: string) => void;
  onBulkDeleteMovies?: (movieIds: string[]) => void;
  onResetCatalog: () => void;
  onAddUser: (name: string, email: string, password: string, isAdmin: boolean, avatarUrl?: string) => string | null;
  onEditUser: (userId: string, name: string, email: string, password?: string, isAdmin?: boolean, avatarUrl?: string, subscriptionExpiresAt?: string) => string | null;
  onDeleteUser: (userId: string) => void;
  currentUserId: string;
  currentProfileId?: string;
  onEditProfile?: (profileId: string, name: string, avatarUrl: string) => void;
  adguardEnabled: boolean;
  onToggleAdguardEnabled: (enabled: boolean) => void;
  onPublishUpdate?: () => void;
  pinnedMostDesiredId?: string | null;
  onTogglePinMostDesired?: (movieId: string | null) => void;
  requests?: MovieRequest[];
  comments?: MovieComment[];
  onFulfillRequest?: (requestId: string) => void;
  onDeleteRequest?: (requestId: string) => void;
  onDeleteComment?: (commentId: string) => void;
  onSelectMovie?: (movie: Movie) => void;
}

export default function AdminPanel({
  movies,
  users,
  allProfiles,
  tmdbApiKey,
  onUpdateTmdbApiKey,
  abyssApiKey = '',
  onUpdateAbyssApiKey,
  onAddMovie,
  onEditMovie,
  onDeleteMovie,
  onBulkDeleteMovies,
  onResetCatalog,
  onAddUser,
  onEditUser,
  onDeleteUser,
  currentUserId,
  currentProfileId,
  onEditProfile,
  adguardEnabled,
  onToggleAdguardEnabled,
  onPublishUpdate,
  pinnedMostDesiredId,
  onTogglePinMostDesired,
  requests = [],
  comments = [],
  onFulfillRequest,
  onDeleteRequest,
  onDeleteComment,
  onSelectMovie
}: AdminPanelProps) {
  const [activeAdminTab, setActiveAdminTab] = useState<'dashboard' | 'catalog' | 'notifications' | 'promotion' | 'users' | 'myaccount' | 'settings'>('dashboard');

  // Estados de Seleção em Lote e Exclusão Coletiva
  const [selectedMovieIds, setSelectedMovieIds] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [catalogSearchQuery, setCatalogSearchQuery] = useState('');
  const [catalogFilter, setCatalogFilter] = useState<'all' | 'recommended' | 'pinned' | 'movies' | 'series' | 'duplicates'>('all');
  const [showDeleteAllDuplicatesConfirm, setShowDeleteAllDuplicatesConfirm] = useState(false);

  // Estado para busca rápida com lupa da Fita Específica para Fixar
  const [pinSearchQuery, setPinSearchQuery] = useState('');
  const [isPinPickerOpen, setIsPinPickerOpen] = useState(false);

  const filteredPinMovies = useMemo(() => {
    if (!pinSearchQuery.trim()) return movies.slice(0, 10);
    const q = pinSearchQuery.toLowerCase().trim();
    return movies.filter(m => 
      m.title.toLowerCase().includes(q) || 
      m.category.toLowerCase().includes(q) || 
      String(m.year).includes(q)
    );
  }, [movies, pinSearchQuery]);

  const currentlyPinnedMovie = useMemo(() => {
    return pinnedMostDesiredId ? movies.find(m => m.id === pinnedMostDesiredId) : null;
  }, [movies, pinnedMostDesiredId]);

  // Estados com confirmação customizada segura
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [movieToDelete, setMovieToDelete] = useState<Movie | null>(null);
  const [showCatalogResetConfirm, setShowCatalogResetConfirm] = useState(false);

  // Estados com edição de foto de perfil de Admin
  const [showAdminAvatarModal, setShowAdminAvatarModal] = useState(false);
  const [adminCustomAvatarUrl, setAdminCustomAvatarUrl] = useState('');
  const [adminSelectedAvatarIdx, setAdminSelectedAvatarIdx] = useState(0);
  
  // Estados para Gerenciamento de Usuários
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userFormName, setUserFormName] = useState('');
  const [userFormEmail, setUserFormEmail] = useState('');
  const [userFormPassword, setUserFormPassword] = useState('');
  const [userFormIsAdmin, setUserFormIsAdmin] = useState(false);
  const [userFormAvatarUrl, setUserFormAvatarUrl] = useState('');
  const [userFormSelectedAvatarIdx, setUserFormSelectedAvatarIdx] = useState(0);
  const [userFormError, setUserFormError] = useState('');
  const [userFormSubscriptionExpiresAt, setUserFormSubscriptionExpiresAt] = useState<string | undefined>(undefined);
  const [userSearchQuery, setUserSearchQuery] = useState('');

  const filteredUsers = useMemo(() => {
    if (!userSearchQuery.trim()) return users;
    const q = userSearchQuery.toLowerCase().trim();
    return users.filter(u => 
      u.name.toLowerCase().includes(q) || 
      u.email.toLowerCase().includes(q) || 
      u.id.toLowerCase().includes(q)
    );
  }, [users, userSearchQuery]);

  // Estados da Central de Avisos e Notificações em Tempo Real
  const [noticeFilter, setNoticeFilter] = useState<'all' | 'requests' | 'comments' | 'users'>('all');
  const [noticeSearch, setNoticeSearch] = useState('');

  const formatAlertTime = (isoString?: string) => {
    if (!isoString) return 'Recentemente';
    try {
      const d = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Agora mesmo';
      if (diffMins < 60) return `Há ${diffMins} min`;
      if (diffHours < 24) return `Há ${diffHours} h`;
      if (diffDays === 1) return 'Ontem';
      if (diffDays < 7) return `Há ${diffDays} dias`;
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Recentemente';
    }
  };

  // Notificações e Avisos consolidados em tempo real
  const consolidatedAlerts = useMemo(() => {
    const list: Array<{
      id: string;
      type: 'request' | 'comment' | 'user';
      title: string;
      subtitle: string;
      date: string;
      userAvatar?: string;
      userName: string;
      profileName?: string;
      status?: string;
      posterUrl?: string;
      rawRequest?: MovieRequest;
      rawComment?: MovieComment;
      rawUser?: User;
      movie?: Movie;
    }> = [];

    // 1. Pedidos de filmes e séries
    (requests || []).forEach(req => {
      const relatedMovie = movies.find(m => m.title.toLowerCase() === (req.title || '').toLowerCase());
      list.push({
        id: req.id,
        type: 'request',
        title: `Pedido de ${req.type === 'series' ? 'Série' : 'Filme'}: ${req.title}`,
        subtitle: `${req.userName || 'Usuário'}${req.profileName ? ` (Perfil: ${req.profileName})` : ''} solicitou a inclusão no catálogo`,
        date: req.createdAt,
        userName: req.userName || 'Usuário',
        profileName: req.profileName,
        status: req.status || 'pending',
        posterUrl: req.posterUrl || relatedMovie?.posterUrl,
        rawRequest: req,
        movie: relatedMovie
      });
    });

    // 2. Comentários em filmes e séries
    (comments || []).forEach(comm => {
      const movie = movies.find(m => m.id === comm.movieId);
      list.push({
        id: comm.id,
        type: 'comment',
        title: `Comentou em "${movie?.title || 'Título do Acervo'}"`,
        subtitle: `"${comm.text}"`,
        date: comm.createdAt,
        userAvatar: comm.avatarUrl,
        userName: comm.userName || comm.profileName || 'Usuário',
        profileName: comm.profileName,
        posterUrl: movie?.posterUrl,
        rawComment: comm,
        movie: movie
      });
    });

    // 3. Usuários recém-registrados
    (users || []).forEach(u => {
      if (u.deleted) return;
      const daysLeft = getSubscriptionDaysLeft(u);
      list.push({
        id: `user_reg_${u.id}`,
        type: 'user',
        title: `Novo Usuário: ${u.name}`,
        subtitle: `${u.email} • ${u.isAdmin ? 'Administrador' : `Assinante (${daysLeft} dias restantes)`}`,
        date: u.createdAt || '2026-05-10T12:00:00Z',
        userAvatar: u.avatarUrl,
        userName: u.name,
        rawUser: u
      });
    });

    // Ordena os alertas: mais recentes no topo
    return list.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  }, [requests, comments, users, movies]);

  const pendingRequestsCount = useMemo(() => {
    return (requests || []).filter(r => r.status === 'pending').length;
  }, [requests]);

  const filteredAlerts = useMemo(() => {
    let result = consolidatedAlerts;
    if (noticeFilter !== 'all') {
      result = result.filter(a => {
        if (noticeFilter === 'requests') return a.type === 'request';
        if (noticeFilter === 'comments') return a.type === 'comment';
        if (noticeFilter === 'users') return a.type === 'user';
        return a.type === noticeFilter;
      });
    }
    if (noticeSearch.trim()) {
      const q = noticeSearch.toLowerCase().trim();
      result = result.filter(a => 
        (a.title && a.title.toLowerCase().includes(q)) || 
        (a.subtitle && a.subtitle.toLowerCase().includes(q)) || 
        (a.userName && a.userName.toLowerCase().includes(q))
      );
    }
    return result;
  }, [consolidatedAlerts, noticeFilter, noticeSearch]);

  // Estados para "Minha Conta"
  const currentUser = users.find(u => u.id === currentUserId) || { id: '', name: 'Admin', email: '', password: '' };
  const isMasterAdmin = currentUser.email === 'rafaelguaruja09@gmail.com' || currentUser.id === 'u1' || (currentUser.name && currentUser.name.toLowerCase().includes('rafael'));
  const [myAccountEmail, setMyAccountEmail] = useState(currentUser.email);
  const [myAccountPassword, setMyAccountPassword] = useState(currentUser.password || '');
  const [myAccountMessage, setMyAccountMessage] = useState('');
  const [myAccountError, setMyAccountError] = useState('');
  const [showUserFormPass, setShowUserFormPass] = useState(false);
  const [showMyAccountPass, setShowMyAccountPass] = useState(false);

  // Sincroniza campos de "Minha Conta" quando o usuário muda
  React.useEffect(() => {
    if (currentUser) {
      setMyAccountEmail(currentUser.email);
      setMyAccountPassword(currentUser.password || '');
    }
  }, [currentUserId, users]);

  // Estados para Gerenciamento de Filme (Inclusão e Edição)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null);
  
  // Form fields
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPosterUrl, setFormPosterUrl] = useState('');
  const [formBackdropUrl, setFormBackdropUrl] = useState('');
  const [formCategory, setFormCategory] = useState('Ação');
  const [formYear, setFormYear] = useState(1990);
  const [formReleaseDate, setFormReleaseDate] = useState('');
  const [formDuration, setFormDuration] = useState('1h 50m');
  const [formType, setFormType] = useState<'movie' | 'series'>('movie');
  const [formRating, setFormRating] = useState(8.0);
  const [formTrailerUrl, setFormTrailerUrl] = useState('https://www.youtube.com/embed/qvsgGtIvCBY');
  const [formVhsTapeColor, setFormVhsTapeColor] = useState('#2563eb');
  const [formTmdbId, setFormTmdbId] = useState<number | undefined>(undefined);
  const [formAbyssId, setFormAbyssId] = useState('');
  const [formEmbedUrl, setFormEmbedUrl] = useState('');
  const [formEpisodeEmbeds, setFormEpisodeEmbeds] = useState<{ [key: string]: string }>({});
  const [formSeasonsConfig, setFormSeasonsConfig] = useState<{ [season: number]: number }>({ 1: 8 });
  const [activeConfigSeason, setActiveConfigSeason] = useState(1);
  const [formIsRecommended, setFormIsRecommended] = useState(false);

  // Estados de busca do TMDB para Importação de Dados
  const [movieAddSuccessMsg, setMovieAddSuccessMsg] = useState<string | null>(null);
  const [tmdbSearchQuery, setTmdbSearchQuery] = useState('');
  const [tmdbSearchResults, setTmdbSearchResults] = useState<any[]>([]);
  const [isSearchingTMDB, setIsSearchingTMDB] = useState(false);
  const [tmdbError, setTmdbError] = useState('');

  // Estados de busca e sincronização com a API do Abyss
  const [isSearchingAbyss, setIsSearchingAbyss] = useState(false);
  const [abyssStatusMessage, setAbyssStatusMessage] = useState<{ text: string; type: 'info' | 'success' | 'warning' | 'error' } | null>(null);
  const [auditReport, setAuditReport] = useState<{
    seriesTitle: string;
    totalEps: number;
    imported: Array<{ season: number; episode: number; tag: string; playerUrl: string }>;
    failed: Array<{ season: number; episode: number; tag: string; reason: string; attempts: number; errorStack?: string }>;
  } | null>(null);

  // Limpa formulário
  const resetForm = () => {
    setFormTitle('');
    setFormDescription('');
    setFormPosterUrl('');
    setFormBackdropUrl('');
    setFormCategory('Ação');
    setFormYear(1990);
    setFormReleaseDate('');
    setFormDuration('1h 50m');
    setFormType('movie');
    setFormRating(8.0);
    setFormTrailerUrl('https://www.youtube.com/embed/qvsgGtIvCBY');
    setFormVhsTapeColor('#2563eb');
    setFormTmdbId(undefined);
    setFormAbyssId('');
    setFormEmbedUrl('');
    setFormEpisodeEmbeds({});
    setFormSeasonsConfig({ 1: 8 });
    setActiveConfigSeason(1);
    setEditingMovie(null);
    setIsSearchingAbyss(false);
    setAbyssStatusMessage(null);
    setFormIsRecommended(false);
  };

  const handleOpenCreateForm = () => {
    resetForm();
    setMovieAddSuccessMsg(null);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (movie: Movie) => {
    setMovieAddSuccessMsg(null);
    setEditingMovie(movie);
    setFormTitle(movie.title);
    setFormDescription(movie.description);
    setFormPosterUrl(movie.posterUrl);
    setFormBackdropUrl(movie.backdropUrl);
    setFormCategory(movie.category);
    setFormYear(movie.year);
    setFormReleaseDate(movie.releaseDate || '');
    setFormDuration(movie.duration);
    setFormType(movie.type);
    setFormRating(movie.rating);
    setFormTrailerUrl(movie.trailerUrl);
    setFormVhsTapeColor(movie.vhsTapeColor || '#2563eb');
    setFormTmdbId(movie.tmdbId);
    setFormAbyssId(movie.abyssId || '');
    setFormEmbedUrl(movie.embedUrl || '');
    setFormEpisodeEmbeds(movie.episodeEmbeds || {});
    setFormSeasonsConfig(movie.seasonsConfig || { 1: 8 });
    setActiveConfigSeason(1);
    setFormIsRecommended(Boolean(movie.isRecommended));
    setIsFormOpen(true);
  };

  // Detecção Inteligente e Precisa de Títulos e Séries Cadastrados no Acervo
  // Considera TMDB ID, Tipo de Mídia (Filme vs Série) e Ano de Lançamento (evitando falsos positivos entre remakes, reboots e obras homônimas como Invencível 2014 vs 2026, Mortal Kombat 1995 vs 2021)
  const findDuplicateMovie = (
    title: string, 
    tmdbId?: number, 
    currentEditId?: string,
    year?: number | string,
    type?: 'movie' | 'series'
  ): Movie | null => {
    if (!title && !tmdbId) return null;
    
    const clean = (s: string) => (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();

    const titleClean = clean(title);
    const parsedYear = year && year !== '????' ? Number(year) : undefined;

    return movies.find(m => {
      // Ignora a própria mídia quando estamos em modo de edição
      if (currentEditId && m.id === currentEditId) return false;

      // 1. Tipo de Mídia: Um filme e uma série com o mesmo nome NUNCA são a mesma mídia (ex: série Invencível vs filme Invencível)
      if (type && m.type && m.type !== type) {
        return false;
      }

      // 2. Prova Absoluta: Mesmo TMDB ID com o mesmo tipo de mídia
      if (tmdbId && m.tmdbId && Number(m.tmdbId) === Number(tmdbId)) {
        return true;
      }

      // Se ambos possuem TMDB IDs diferentes e válidos, são produções comprovadamente distintas no TMDB
      if (tmdbId && m.tmdbId && Number(m.tmdbId) !== Number(tmdbId)) {
        return false;
      }

      // 3. Comparação de Título Normalizado + Ano de Produção
      if (titleClean && titleClean.length > 1 && clean(m.title) === titleClean) {
        const mYear = m.year ? Number(m.year) : undefined;

        // Se ambos têm ano registrado:
        if (parsedYear && mYear) {
          // Diferença de 2 anos ou mais (ex: Invencível 2014 vs Invencível 2026, Mortal Kombat 1995 vs 2021):
          // SÃO PRODUÇÕES DIFERENTES! NÃO SÃO O MESMO FILME!
          if (Math.abs(parsedYear - mYear) > 1) {
            return false;
          }
          return true;
        }

        // Se um deles não tem ano informado, mas não possuem TMDB conflitante, considera como mesma mídia
        return true;
      }

      return false;
    }) || null;
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDescription.trim()) return;

    // Permite cadastrar qualquer título livremente no acervo, sem bloquear ou impedir o cadastro manual
    // Se for edição, mantém o ID original. Se for novo título, adiciona diretamente.

    // Regra: Desenhos e Animações (Disney, Pixar, etc.) entram sempre como "Animação"
    let finalCategory = formCategory;
    const lowerTitle = formTitle.toLowerCase();
    const lowerDesc = formDescription.toLowerCase();
    const isAnimation = 
      lowerTitle.includes('disney') ||
      lowerTitle.includes('pixar') ||
      lowerTitle.includes('desenho') ||
      lowerTitle.includes('animação') ||
      lowerTitle.includes('animado') ||
      lowerTitle.includes('anime') ||
      lowerTitle.includes('cartoon') ||
      lowerDesc.includes('animação') ||
      lowerDesc.includes('desenho animado') ||
      lowerDesc.includes('estúdio ghibli') ||
      lowerDesc.includes('pixar') ||
      lowerDesc.includes('walt disney');

    if (isAnimation) {
      finalCategory = 'Animação';
    }

    const movieData = {
      title: formTitle,
      description: formDescription,
      posterUrl: getCleanPosterUrl(formPosterUrl),
      backdropUrl: getCleanBackdropUrl(formBackdropUrl, formPosterUrl),
      category: finalCategory,
      year: formYear,
      releaseDate: formReleaseDate.trim() || undefined,
      duration: formType === 'series' 
        ? `${Object.keys(formSeasonsConfig).length} Temporada${Object.keys(formSeasonsConfig).length > 1 ? 's' : ''}` 
        : formDuration,
      type: formType,
      rating: formRating,
      trailerUrl: formTrailerUrl,
      vhsTapeColor: formVhsTapeColor,
      tmdbId: formTmdbId,
      embedUrl: formType === 'movie' ? (formEmbedUrl.trim() || undefined) : undefined,
      episodeEmbeds: formType === 'series' ? formEpisodeEmbeds : undefined,
      seasonsConfig: formType === 'series' ? formSeasonsConfig : undefined,
      abyssId: formType === 'movie' ? (formEmbedUrl.trim() || undefined) : undefined,
      abyssEmbedUrl: formType === 'movie' && formEmbedUrl.trim() ? (formEmbedUrl.trim().startsWith('http') ? formEmbedUrl.trim() : `https://abyssplayer.com/${formEmbedUrl.trim()}`) : undefined,
      abyssStatus: 'active',
      isRecommended: formIsRecommended
    };

    if (editingMovie) {
      onEditMovie({ ...movieData, id: editingMovie.id });
      setIsFormOpen(false);
      resetForm();
      setMovieAddSuccessMsg(null);
    } else {
      const success = onAddMovie(movieData);
      if (success !== false) {
        // Mantém na mesma página para permitir adicionar múltiplos títulos sequencialmente
        const addedTitle = movieData.title;
        resetForm();
        setMovieAddSuccessMsg(`✨ "${addedTitle}" foi adicionado(a) com sucesso! A página permanece aberta para você cadastrar mais mídias.`);
        setTimeout(() => {
          const formElem = document.getElementById('movie-form-section');
          if (formElem) {
            formElem.scrollIntoView({ behavior: 'smooth' });
          }
        }, 80);
      }
    }
  };

  // Manipulador de busca do TMDB
  const handleTMDBSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tmdbSearchQuery.trim()) return;
    setIsSearchingTMDB(true);
    setTmdbError('');
    try {
      const results = await searchMoviesTMDB(tmdbSearchQuery, tmdbApiKey);
      setTmdbSearchResults(results);
      if (results.length === 0) {
        setTmdbError('Nenhum resultado encontrado.');
      }
    } catch (err) {
      setTmdbError('Erro ao buscar do TMDB.');
    } finally {
      setIsSearchingTMDB(false);
    }
  };

  // Rotina de importação e sincronização inteligente de episódios sem loops infinitos
  const syncSeriesEpisodesWithResilience = async (
    seriesTitle: string,
    seasonsConfig: { [season: number]: number },
    apiKey: string
  ) => {
    const seasonKeys = Object.keys(seasonsConfig).map(Number).sort((a, b) => a - b);
    const totalEps = seasonKeys.reduce((acc, k) => acc + (seasonsConfig[k] || 0), 0);

    const importedList: Array<{ season: number; episode: number; tag: string; playerUrl: string }> = [];
    const failedList: Array<{ season: number; episode: number; tag: string; reason: string; attempts: number; errorStack?: string }> = [];

    let processedCount = 0;
    let missingSeasonDetected = false;
    let missingSeasonNum = 0;

    console.log(`==================================================`);
    console.log(`🚀 INICIANDO AUTOMAÇÃO INTELIGENTE DE EPISÓDIOS`);
    console.log(`Série: "${seriesTitle}" | Temporadas no TMDB: ${seasonKeys.length} | Total de Episódios: ${totalEps}`);
    console.log(`==================================================`);

    for (const sNum of seasonKeys) {
      if (missingSeasonDetected) {
        console.log(`[Import Engine] 🛑 Interrompido: Temporada ${sNum} pulada pois a Temporada ${missingSeasonNum} ainda não existe no Abyss.`);
        break;
      }

      const epCount = seasonsConfig[sNum] || 0;
      let consecutiveEpFailures = 0;

      for (let epNum = 1; epNum <= epCount; epNum++) {
        processedCount++;
        const sStr = String(sNum).padStart(2, '0');
        const eStr = String(epNum).padStart(2, '0');
        const epTag = `S${sStr}E${eStr}`;

        setAbyssStatusMessage({
          text: `🔍 Sintonizando no Abyss (${processedCount}/${totalEps}): ${epTag} de "${seriesTitle}"...`,
          type: 'info'
        });

        console.log(`[Import Engine] 🔄 Verificando ${epTag} (Temporada ${sNum}, Ep ${epNum})...`);

        const startTime = Date.now();
        let res;
        try {
          res = await AbyssService.findEpisodePlayerUrl(seriesTitle, sNum, epNum, apiKey);
        } catch (err: any) {
          res = { success: false, error: 'API_ERROR', message: err?.message || String(err) };
        }

        const reqTime = Date.now() - startTime;
        console.log(`[Import Engine] 📡 Resposta para ${epTag} em ${reqTime}ms:`, res);

        const key = `${sNum}_${epNum}`;

        if (res.success && res.playerUrl) {
          importedList.push({ season: sNum, episode: epNum, tag: epTag, playerUrl: res.playerUrl });
          setFormEpisodeEmbeds(prev => ({ ...prev, [key]: res.playerUrl }));
          consecutiveEpFailures = 0;
          console.log(`🎉 [Import Engine] SUCESSO para ${epTag}! Player URL: ${res.playerUrl}`);
        } else {
          // Se a pasta da série inteira não for encontrada no Abyss
          if (res.error === 'SERIES_FOLDER_NOT_FOUND') {
            console.warn(`🛑 [Import Engine] Pasta da série "${seriesTitle}" não localizada no Abyss. Interrompendo sincronização.`);
            missingSeasonDetected = true;
            missingSeasonNum = sNum;
            failedList.push({
              season: sNum,
              episode: epNum,
              tag: epTag,
              reason: res.message || 'Pasta da série não localizada no Abyss.',
              attempts: 1
            });
            break;
          }

          // Se a pasta da temporada específica não existir (ex: The Walking Dead só tem até a Temporada 5)
          if (res.error === 'SEASON_FOLDER_NOT_FOUND') {
            console.warn(`🛑 [Import Engine] Pasta da Temporada ${sNum} não foi encontrada no Abyss. Pausando busca para a Temporada ${sNum} e posteriores.`);
            missingSeasonDetected = true;
            missingSeasonNum = sNum;
            failedList.push({
              season: sNum,
              episode: epNum,
              tag: epTag,
              reason: `A Temporada ${sNum} ainda não foi adicionada no seu painel Abyss.`,
              attempts: 1
            });
            break; // Interrompe imediatamente esta e próximas temporadas
          }

          // Caso o episódio individual não seja encontrado dentro de uma pasta de temporada existente (ex: lançamento semanal)
          const totalFilesInSeason = (res as any).totalFilesCount;
          if (res.error === 'EPISODE_NOT_FOUND_IN_SEASON' && typeof totalFilesInSeason === 'number' && epNum > totalFilesInSeason) {
            console.warn(`🛑 [Import Engine] A pasta da Temporada ${sNum} possui ${totalFilesInSeason} arquivos. O episódio ${epNum} e os seguintes ainda não foram enviados ao Abyss. Pausando busca desta temporada.`);
            failedList.push({
              season: sNum,
              episode: epNum,
              tag: epTag,
              reason: `Episódio ${epNum} em diante aguarda envio semanal no Abyss (${totalFilesInSeason} arquivo(s) na pasta).`,
              attempts: 1
            });
            break; // Não tenta buscar episódios superiores ao total de arquivos existentes na pasta
          }

          failedList.push({
            season: sNum,
            episode: epNum,
            tag: epTag,
            reason: res.message || 'Episódio ainda não disponibilizado no Abyss.',
            attempts: 1
          });

          consecutiveEpFailures++;

          // Se 5 episódios consecutivos de uma temporada existente não forem encontrados, pausar a busca desta temporada
          if (consecutiveEpFailures >= 5) {
            console.warn(`🛑 [Import Engine] ${consecutiveEpFailures} episódios consecutivos não localizados na Temporada ${sNum}. Pausando busca desta temporada.`);
            break;
          }
        }
      }
    }

    const report = {
      seriesTitle,
      totalEps,
      imported: importedList,
      failed: failedList,
      missingSeasonDetected,
      missingSeasonNum
    };

    setAuditReport(report);
    return report;
  };

  // Importar o título selecionado do TMDB
  const handleImportTMDBMovie = async (id: number, mediaType: 'movie' | 'tv') => {
    setIsSearchingTMDB(true);
    setTmdbError('Importando informações detalhadas...');
    try {
      const imported = await getMovieDetailsTMDB(id, mediaType, tmdbApiKey);
      if (imported) {
        setFormTitle(imported.title || '');
        setFormDescription(imported.description || '');
        setFormPosterUrl(imported.posterUrl || '');
        setFormBackdropUrl(imported.backdropUrl || '');
        setFormYear(imported.year || 1990);
        setFormReleaseDate(imported.releaseDate || '');
        setFormDuration(imported.duration || '2h');
        setFormType(imported.type || 'movie');
        setFormCategory(imported.category || 'Ação');
        setFormRating(imported.rating || 8.0);
        setFormTrailerUrl(imported.trailerUrl || 'https://www.youtube.com/embed/qvsgGtIvCBY');
        setFormTmdbId(imported.tmdbId);

        if (imported.seasonsConfig) {
          setFormSeasonsConfig(imported.seasonsConfig);
        }

        setTmdbSearchResults([]);
        setTmdbSearchQuery('');
        setTmdbError('');
        setIsFormOpen(true);

        setTimeout(() => {
          const formElem = document.getElementById('movie-form-section');
          if (formElem) {
            formElem.scrollIntoView({ behavior: 'smooth' });
          }
        }, 150);

        // --- AUTOMATIZAÇÃO DA BUSCA DE PLAYER NO ABYSS EM SEGUNDO PLANO ---
        // Sincroniza automaticamente a URL do player assim que os dados do TMDB são importados
        if (imported.title) {
          const currentAbyssKey = abyssApiKey || AbyssService.getApiKey();
          setIsSearchingAbyss(true);
          setAbyssStatusMessage({
            text: `🔍 Pesquisando vídeo no Abyss para "${imported.title}"...`,
            type: 'info'
          });

          if (imported.type === 'movie') {
            AbyssService.findMoviePlayerUrl(imported.title, currentAbyssKey)
              .then(res => {
                setIsSearchingAbyss(false);
                if (res.success && res.playerUrl) {
                  setFormEmbedUrl(res.playerUrl);
                  if (res.fileId) setFormAbyssId(res.fileId);
                  setAbyssStatusMessage({
                    text: `✅ Player URL do Abyss obtido e preenchido automaticamente! (${res.playerUrl})`,
                    type: 'success'
                  });
                  console.log(`[Abyss Auto] Sucesso ao preencher Player URL: ${res.playerUrl}`);
                } else {
                  setAbyssStatusMessage({
                    text: `⚠️ O vídeo ainda não existe no Abyss. O cadastro do filme pode continuar normalmente.`,
                    type: 'warning'
                  });
                  console.log(`[Abyss Auto] ${res.message || 'Vídeo não encontrado no Abyss.'}`);
                }
              })
              .catch(err => {
                setIsSearchingAbyss(false);
                setAbyssStatusMessage({
                  text: `⚠️ O vídeo ainda não existe no Abyss. O cadastro do filme pode continuar normalmente.`,
                  type: 'warning'
                });
                console.error('[Abyss Auto Error]', err);
              });
          } else if (imported.type === 'series') {
            const seasons = imported.seasonsConfig || { 1: 10 };

            (async () => {
              setIsSearchingAbyss(true);
              const report = await syncSeriesEpisodesWithResilience(imported.title, seasons, currentAbyssKey);
              setIsSearchingAbyss(false);

              if (report.imported.length > 0) {
                setAbyssStatusMessage({
                  text: `✅ ${report.imported.length} de ${report.totalEps} episódio(s) localizados e sintonizados! (${report.failed.length} ignorados/falhas)`,
                  type: report.failed.length === 0 ? 'success' : 'warning'
                });
              } else {
                setAbyssStatusMessage({
                  text: `⚠️ Os episódios de "${imported.title}" ainda não foram localizados no Abyss. O cadastro pode continuar normalmente.`,
                  type: 'warning'
                });
              }
            })();
          }
        }

      } else {
        setTmdbError('Erro ao obter detalhes específicos.');
      }
    } catch (err) {
      setTmdbError('Erro ao importar título.');
    } finally {
      setIsSearchingTMDB(false);
    }
  };

  // Pesquisa manual de player de Filme no Abyss
  const handleManualAbyssMovieSearch = async () => {
    if (!formTitle.trim()) {
      setAbyssStatusMessage({ text: 'Por favor, informe o título do filme primeiro.', type: 'warning' });
      return;
    }
    setIsSearchingAbyss(true);
    setAbyssStatusMessage({ text: `Pesquisando "${formTitle}" no Abyss...`, type: 'info' });

    try {
      const currentAbyssKey = abyssApiKey || AbyssService.getApiKey();
      const res = await AbyssService.findMoviePlayerUrl(formTitle, currentAbyssKey);
      if (res.success && res.playerUrl) {
        setFormEmbedUrl(res.playerUrl);
        if (res.fileId) setFormAbyssId(res.fileId);
        setAbyssStatusMessage({
          text: `✅ Player URL preenchida automaticamente: ${res.playerUrl}`,
          type: 'success'
        });
      } else {
        setAbyssStatusMessage({
          text: `⚠️ O vídeo ainda não existe no Abyss.`,
          type: 'warning'
        });
      }
    } catch (err) {
      setAbyssStatusMessage({
        text: `⚠️ O vídeo ainda não existe no Abyss.`,
        type: 'warning'
      });
    } finally {
      setIsSearchingAbyss(false);
    }
  };

  // Pesquisa manual de player de Episódio no Abyss
  const handleManualAbyssEpisodeSearch = async (seasonNum: number, epNum: number) => {
    if (!formTitle.trim()) {
      setAbyssStatusMessage({ text: 'Por favor, informe o título da série primeiro.', type: 'warning' });
      return;
    }
    const sStr = String(seasonNum).padStart(2, '0');
    const eStr = String(epNum).padStart(2, '0');
    const epTag = `S${sStr}E${eStr}`;

    setIsSearchingAbyss(true);
    setAbyssStatusMessage({ text: `Pesquisando ${epTag} para "${formTitle}" no Abyss...`, type: 'info' });

    try {
      const currentAbyssKey = abyssApiKey || AbyssService.getApiKey();
      const res = await AbyssService.findEpisodePlayerUrl(formTitle, seasonNum, epNum, currentAbyssKey);
      const key = `${seasonNum}_${epNum}`;
      if (res.success && res.playerUrl) {
        setFormEpisodeEmbeds(prev => ({ ...prev, [key]: res.playerUrl }));
        setAbyssStatusMessage({
          text: `✅ Episódio ${epTag} sintonizado com sucesso! (${res.playerUrl})`,
          type: 'success'
        });
      } else {
        setAbyssStatusMessage({
          text: `⚠️ O vídeo do episódio (${epTag}) ainda não existe no Abyss.`,
          type: 'warning'
        });
      }
    } catch (err) {
      setAbyssStatusMessage({
        text: `⚠️ O vídeo do episódio (${epTag}) ainda não existe no Abyss.`,
        type: 'warning'
      });
    } finally {
      setIsSearchingAbyss(false);
    }
  };

  // Pesquisa em lote de TODOS os episódios de TODAS as temporadas da série no Abyss
  const handleSyncAllSeriesEpisodesWithAbyss = async () => {
    if (!formTitle.trim()) {
      setAbyssStatusMessage({ text: 'Por favor, informe o título da série primeiro.', type: 'warning' });
      return;
    }

    const seasons = formSeasonsConfig;
    const seasonKeys = Object.keys(seasons).map(Number).sort((a,b)=>a-b);
    if (seasonKeys.length === 0) {
      setAbyssStatusMessage({ text: 'Nenhuma temporada configurada para esta série.', type: 'warning' });
      return;
    }

    const currentAbyssKey = abyssApiKey || AbyssService.getApiKey();
    setIsSearchingAbyss(true);

    const report = await syncSeriesEpisodesWithResilience(formTitle, seasons, currentAbyssKey);

    setIsSearchingAbyss(false);

    if (report.imported.length > 0) {
      setAbyssStatusMessage({
        text: `✅ ${report.imported.length} de ${report.totalEps} episódio(s) localizados e sintonizados com o Abyss! (${report.failed.length} ignorados/falhas)`,
        type: report.failed.length === 0 ? 'success' : 'warning'
      });
    } else {
      setAbyssStatusMessage({
        text: `⚠️ Nenhum episódio de "${formTitle}" foi localizado no Abyss no momento.`,
        type: 'warning'
      });
    }
  };

  // --- IDENTIFICAÇÃO RIGOROSA DE USUÁRIOS COMUNS (EXCLUINDO ADMINISTRADOR RAFAEL) ---
  const regularUsers = useMemo(() => {
    return (users || []).filter(u => {
      if (u.isAdmin) return false;
      if (u.id === 'u1') return false;
      if (u.email && u.email.toLowerCase() === 'rafaelguaruja09@gmail.com') return false;
      if (u.name && u.name.toLowerCase().includes('rafael')) return false;
      return true;
    });
  }, [users]);

  const regularUserIds = useMemo(() => new Set(regularUsers.map(u => u.id)), [regularUsers]);

  // Perfis pertencentes exclusivamente aos espectadores (não-administradores)
  const regularProfiles = useMemo(() => {
    const list: Profile[] = [];
    Object.entries(allProfiles || {}).forEach(([uid, profs]) => {
      if (uid === 'u1' || !regularUserIds.has(uid)) return;
      (profs || []).forEach(p => {
        const pName = (p.name || '').toLowerCase();
        if (pName.includes('admin') || pName.includes('rafael')) return;
        list.push(p);
      });
    });
    return list;
  }, [allProfiles, regularUserIds]);

  // --- CÁLCULO DE ESTATÍSTICAS E MÉTRICAS RETRÔ PARA O DASHBOARD ---
  const countMovies = movies.filter(m => m.type === 'movie').length;
  const countSeries = movies.filter(m => m.type === 'series').length;
  const totalSubProfiles = regularProfiles.length > 0 ? regularProfiles.length : Object.values(allProfiles).reduce((acc, pList) => acc + pList.length, 0);
  
  // Total de itens favoritados exclusivamente pelos espectadores (ou global se novos)
  const totalMyListSoma = useMemo(() => {
    const count = regularProfiles.reduce((sum, p) => sum + (p.myList ? p.myList.length : 0), 0);
    if (count > 0) return count;
    return Object.values(allProfiles).reduce((acc, pList) => acc + pList.reduce((sum, p) => sum + (p.myList ? p.myList.length : 0), 0), 0);
  }, [regularProfiles, allProfiles]);

  // Média Geral de Avaliações
  const totalRatingSoma = movies.reduce((acc, m) => acc + (m.rating || 0), 0);
  const mediaRating = movies.length > 0 ? (totalRatingSoma / movies.length).toFixed(1) : "0.0";

  // Fitas Magnéticas em Progresso vs Finalizadas (Consumo Real dos Espectadores)
  const regularHistoryList = useMemo(() => {
    const list = regularProfiles.flatMap(p => p.watchHistory ? Object.values(p.watchHistory) : []) as any[];
    if (list.length > 0) return list;
    return Object.values(allProfiles).flatMap(pList => pList.flatMap(p => p.watchHistory ? Object.values(p.watchHistory) : [])) as any[];
  }, [regularProfiles, allProfiles]);

  const emProgresso = useMemo(() => regularHistoryList.filter(ph => ph.progress > 0 && ph.progress < 100).length, [regularHistoryList]);
  const fitasConcluidas = useMemo(() => regularHistoryList.filter(ph => ph.progress >= 100 || ph.isFinished).length, [regularHistoryList]);
  const totalSomaSegundos = useMemo(() => regularHistoryList.reduce((acc, ph) => acc + (ph.currentTime || 0), 0), [regularHistoryList]);
  const totalMinutosReproduzidos = Math.round(totalSomaSegundos / 60);

  // Funções de Selo de Recomendação Oficial VHSFLIX (Exclusivo Master Admin Rafael)
  const handleToggleRecommend = (movie: Movie) => {
    if (!isMasterAdmin) {
      alert('Apenas o Administrador Master (Rafael) tem permissão para conceder ou remover o Selo de Recomendação Oficial VHSFLIX.');
      return;
    }
    const updatedMovie: Movie = {
      ...movie,
      isRecommended: !movie.isRecommended
    };
    onEditMovie(updatedMovie);
  };

  const handleBulkRecommend = (recommend: boolean) => {
    if (!isMasterAdmin) {
      alert('Apenas o Administrador Master (Rafael) tem permissão para alterar o Selo de Recomendação.');
      return;
    }
    selectedMovieIds.forEach(id => {
      const target = movies.find(m => m.id === id);
      if (target && target.isRecommended !== recommend) {
        onEditMovie({ ...target, isRecommended: recommend });
      }
    });
    setSelectedMovieIds([]);
  };

  // Contadores dinâmicos do catálogo
  const countRecommended = useMemo(() => movies.filter(m => m.isRecommended).length, [movies]);

  // --- DETECÇÃO INTELIGENTE DE FITAS DUPLICADAS / REPETIDAS NO ACERVO ---
  // Critério rigoroso: Diferencia remakes, reboots e filmes homônimos de anos diferentes
  // (ex: Invencível 2014 vs Invencível 2026, Mortal Kombat 1995 vs 2021, O Protetor 1985 vs 2014 são obras DISTINTAS!)
  const duplicateAnalysis = useMemo(() => {
    const normalizeTitle = (str: string) => {
      return (str || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const areMoviesDuplicate = (a: any, b: any): boolean => {
      if (!a || !b) return false;
      if (a.id === b.id) return false;

      // 1. Tipo de mídia DEVE ser idêntico (Filme nunca é duplicata de Série com mesmo nome)
      const aType = a.type || 'movie';
      const bType = b.type || 'movie';
      if (aType !== bType) return false;

      // 2. Prova Absoluta: Mesmo TMDB ID com o mesmo tipo
      if (a.tmdbId && b.tmdbId) {
        return Number(a.tmdbId) === Number(b.tmdbId);
      }

      // Se ambos têm TMDB IDs válidos e são diferentes, são produções comprovadamente distintas
      if (a.tmdbId && b.tmdbId && Number(a.tmdbId) !== Number(b.tmdbId)) {
        return false;
      }

      // 3. Comparação de Título Normalizado + Ano de Lançamento
      const normA = normalizeTitle(a.title);
      const normB = normalizeTitle(b.title);

      if (!normA || !normB || normA !== normB) {
        return false;
      }

      // Se ambos têm ano registrado:
      const yearA = a.year ? Number(a.year) : undefined;
      const yearB = b.year ? Number(b.year) : undefined;

      if (yearA && yearB) {
        // Se a diferença de ano for de 2 anos ou mais (ex: 2014 vs 2026, 1995 vs 2021, 1985 vs 2014):
        // SÃO PRODUÇÕES DIFERENTES! NÃO SÃO CÓPIAS REPETIDAS!
        if (Math.abs(yearA - yearB) > 1) {
          return false;
        }
        return true;
      }

      // Se um dos dois não tem ano e nenhum tem TMDB conflitante, considera como duplicata do mesmo título
      return true;
    };

    // Agrupamento por classes de equivalência
    const groups: any[][] = [];
    const assigned = new Set<string>();

    movies.forEach(m => {
      if (!m || assigned.has(m.id)) return;
      const currentGroup: any[] = [m];
      assigned.add(m.id);

      movies.forEach(other => {
        if (!other || assigned.has(other.id)) return;
        if (areMoviesDuplicate(m, other)) {
          currentGroup.push(other);
          assigned.add(other.id);
        }
      });

      if (currentGroup.length > 1) {
        groups.push(currentGroup);
      }
    });

    const duplicateCopyIds = new Set<string>();
    const duplicateCopiesList: any[] = [];
    const copyToOriginalMap = new Map<string, { original: any; copyIndex: number; totalInGroup: number }>();

    groups.forEach(groupItems => {
      // Ordena para eleger o item ORIGINAL:
      // Prioridade 1: Tem videoUrl preenchida e válida
      // Prioridade 2: Tem tmdbId
      // Prioridade 3: Posição mais antiga no catálogo
      const sorted = [...groupItems].sort((a, b) => {
        const aHasVideo = Boolean(a.videoUrl && a.videoUrl.trim());
        const bHasVideo = Boolean(b.videoUrl && b.videoUrl.trim());
        if (aHasVideo !== bHasVideo) return aHasVideo ? -1 : 1;

        const aHasTmdb = Boolean(a.tmdbId);
        const bHasTmdb = Boolean(b.tmdbId);
        if (aHasTmdb !== bHasTmdb) return aHasTmdb ? -1 : 1;

        return 0;
      });

      const original = sorted[0];
      const copies = sorted.slice(1);

      copies.forEach((copy, idx) => {
        duplicateCopyIds.add(copy.id);
        duplicateCopiesList.push(copy);
        copyToOriginalMap.set(copy.id, {
          original,
          copyIndex: idx + 1,
          totalInGroup: sorted.length
        });
      });
    });

    return {
      totalCopiesCount: duplicateCopyIds.size, // CONTAGEM EXATA SOMENTE DAS CÓPIAS (SEM O ORIGINAL)!
      duplicateCopyIds,
      duplicateCopiesList,
      copyToOriginalMap
    };
  }, [movies]);

  // Catálogo de mídias filtrado pelo campo de busca e filtros de status no Admin
  const filteredAdminMovies = useMemo(() => {
    return movies.filter(m => {
      if (catalogFilter === 'recommended' && !m.isRecommended) return false;
      if (catalogFilter === 'pinned' && m.id !== pinnedMostDesiredId) return false;
      if (catalogFilter === 'movies' && m.type !== 'movie') return false;
      if (catalogFilter === 'series' && m.type !== 'series') return false;
      if (catalogFilter === 'duplicates' && !duplicateAnalysis.duplicateCopyIds.has(m.id)) return false;

      if (catalogSearchQuery.trim()) {
        const query = catalogSearchQuery.toLowerCase().trim();
        const match = 
          m.title.toLowerCase().includes(query) ||
          m.category.toLowerCase().includes(query) ||
          (m.description && m.description.toLowerCase().includes(query));
        if (!match) return false;
      }
      return true;
    });
  }, [movies, catalogSearchQuery, catalogFilter, pinnedMostDesiredId, duplicateAnalysis]);

  // Paginação de 50 em 50 para o Catálogo de Mídias no Painel Administrativo
  const ITEMS_PER_ADMIN_PAGE = 50;
  const [adminCatalogPage, setAdminCatalogPage] = useState(1);
  const catalogListTopRef = useRef<HTMLDivElement>(null);

  // Reseta para a página 1 ao pesquisar ou alterar filtros do catálogo
  useEffect(() => {
    setAdminCatalogPage(1);
  }, [catalogSearchQuery, catalogFilter]);

  const totalAdminPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredAdminMovies.length / ITEMS_PER_ADMIN_PAGE));
  }, [filteredAdminMovies.length]);

  // Garante que a página atual não ultrapasse o total de páginas existentes
  useEffect(() => {
    if (adminCatalogPage > totalAdminPages && totalAdminPages > 0) {
      setAdminCatalogPage(1);
    }
  }, [adminCatalogPage, totalAdminPages]);

  // Fatiamento dos filmes para renderizar de 50 em 50 itens
  const paginatedAdminMovies = useMemo(() => {
    const start = (adminCatalogPage - 1) * ITEMS_PER_ADMIN_PAGE;
    return filteredAdminMovies.slice(start, start + ITEMS_PER_ADMIN_PAGE);
  }, [filteredAdminMovies, adminCatalogPage]);

  // Função para transição de página com rolagem suave ao topo do catálogo
  const handleAdminPageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalAdminPages) return;
    setAdminCatalogPage(newPage);
    if (catalogListTopRef.current) {
      const yOffset = -70;
      const y = catalogListTopRef.current.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    }
  };

  // --- FITA OU SÉRIE MAIS DESEJADA (POPULARIDADE AUTOMÁTICA DOS USUÁRIOS) ---
  // A contabilidade vem EXCLUSIVAMENTE dos espectadores/usuários cadastrados.
  // O Administrador Rafael é 100% EXCLUÍDO de qualquer contabilidade de reprodução ou lista.
  const { popularMovie, popularStats } = useMemo(() => {
    // 1. Se o administrador fixou manualmente uma fita específica
    if (pinnedMostDesiredId) {
      const pinned = movies.find(m => m.id === pinnedMostDesiredId);
      if (pinned) {
        let viewers = 0;
        let minutes = 0;
        let saved = 0;
        regularProfiles.forEach(p => {
          if (p.myList && p.myList.includes(pinned.id)) saved++;
          if (p.watchHistory && p.watchHistory[pinned.id]) {
            const wh = p.watchHistory[pinned.id];
            if (wh.currentTime > 0 || wh.progress > 0) {
              viewers++;
              minutes += Math.round((wh.currentTime || 0) / 60);
            }
          }
        });
        return {
          popularMovie: pinned,
          popularStats: {
            viewersCount: viewers,
            minutesCount: minutes,
            savedCount: saved,
            score: 0,
            isPinned: true
          }
        };
      }
    }

    // 2. Cálculo dinâmico de audiência e desejo dos usuários para cada filme e série
    const statsMap = new Map<string, { viewersCount: number; minutesCount: number; savedCount: number; completionsCount: number; score: number }>();

    movies.forEach(m => {
      statsMap.set(m.id, {
        viewersCount: 0,
        minutesCount: 0,
        savedCount: 0,
        completionsCount: 0,
        score: (m.clicksCount || 0) * 2
      });
    });

    // Percorre perfis exclusivamente de usuários regulares (espectadores)
    regularProfiles.forEach(p => {
      // 2.a. Filmes/Séries salvos na estante (Minha Lista)
      if (Array.isArray(p.myList)) {
        p.myList.forEach(mId => {
          const stat = statsMap.get(mId);
          if (stat) {
            stat.savedCount += 1;
            stat.score += 25; // Peso forte: intenção expressa do espectador
          }
        });
      }

      // 2.b. Filmes/Séries que o usuário deu play ou assistiu
      if (p.watchHistory) {
        Object.entries(p.watchHistory).forEach(([mId, wh]: [string, any]) => {
          const stat = statsMap.get(mId);
          if (stat && (wh.currentTime > 0 || wh.progress > 0)) {
            stat.viewersCount += 1;
            const mins = Math.round((wh.currentTime || 0) / 60);
            stat.minutesCount += mins;
            stat.score += 30 + Math.min(mins, 60);
            if (wh.progress >= 90 || wh.isFinished) {
              stat.completionsCount += 1;
              stat.score += 20; // Bônus fita assistida
            }
          }
        });
      }
    });

    // 2.c. Comentários deixados por espectadores regulares
    (comments || []).forEach(c => {
      if (c.userId && !regularUserIds.has(c.userId)) return;
      const stat = statsMap.get(c.movieId);
      if (stat) {
        stat.score += 15;
      }
    });

    // Elegemos o filme ou série com maior pontuação de consumo
    let bestMovie: Movie | null = null;
    let highestScore = -1;
    let bestStats = { viewersCount: 0, minutesCount: 0, savedCount: 0, completionsCount: 0, score: 0, isPinned: false };

    movies.forEach(m => {
      const stat = statsMap.get(m.id);
      if (stat && stat.score > highestScore) {
        highestScore = stat.score;
        bestMovie = m;
        bestStats = { ...stat, isPinned: false };
      }
    });

    // Se nenhum espectador assistiu ou salvou ainda (score zerado inicial):
    // Prioriza o título de maior nota e relevância recente, alternando inteligente e dinamicamente
    if (!bestMovie || highestScore === 0) {
      const sortedByPopular = [...movies].sort((a, b) => {
        const ratingDiff = (b.rating || 0) - (a.rating || 0);
        if (Math.abs(ratingDiff) > 0.05) return ratingDiff;
        return (b.year || 0) - (a.year || 0);
      });
      const fallbackMovie = sortedByPopular[0] || (movies.length > 0 ? movies[0] : null);

      return {
        popularMovie: fallbackMovie,
        popularStats: {
          viewersCount: 0,
          minutesCount: 0,
          savedCount: 0,
          completionsCount: 0,
          score: 0,
          isPinned: false
        }
      };
    }

    return {
      popularMovie: bestMovie,
      popularStats: bestStats
    };
  }, [movies, regularProfiles, regularUserIds, comments, pinnedMostDesiredId]);

  // Stats por categoria
  const categoryStats = GENRE_CATEGORIES.filter(c => c !== 'Todos').map(category => {
    const count = movies.filter(m => m.category === category).length;
    const percentage = movies.length > 0 ? (count / movies.length) * 100 : 0;
    return { category, count, percentage };
  });

  return (
    <div className="min-h-screen bg-zinc-950 font-sans text-zinc-100 pt-28 pb-16 px-4 sm:px-8 vhs-grid-pattern">
      <div className="max-w-[1400px] mx-auto">
        
        {/* Cabeçalho do Painel com Efeitos Modernos e Animações Profissionais */}
        <motion.div 
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b border-zinc-800/80 pb-6"
        >
          <div className="relative">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-400 text-[11px] font-mono font-bold tracking-wider uppercase mb-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              Console Administrativo
            </div>
            <h1 className="text-3xl sm:text-4xl font-black font-display tracking-tight text-white flex items-center gap-3">
              <Shield className="w-8 h-8 text-rose-600 drop-shadow-[0_0_14px_rgba(225,29,72,0.65)]" /> 
              VHSFLIX <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-rose-400 to-amber-400 font-mono italic text-xl sm:text-2xl font-light">PRO PANEL</span>
            </h1>
            <p className="text-xs text-zinc-400 font-sans mt-1 tracking-normal">
              Gestão de mídias, importador inteligente TMDB/Abyss, monitoramento de usuários e controle retro.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="px-3.5 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800/90 flex items-center gap-2 text-xs font-mono shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-zinc-400">STATUS:</span>
              <span className="text-emerald-400 font-bold">ONLINE</span>
            </div>
            <div className="px-3.5 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800/90 flex items-center gap-2 text-xs font-mono text-zinc-300 shadow-sm">
              <span className="text-zinc-500">TITULAR:</span>
              <span className="text-white font-bold">{currentUser.name || 'Admin'}</span>
            </div>
          </div>
        </motion.div>

        {/* Estrutura Lateral Principal (Sidebar + Conteúdo das Abas) */}
        <div className="flex flex-col lg:flex-row gap-8 mt-2">
          
          {/* COLUNA DA ESQUERDA: SIDEBAR PROFISSIONAL */}
          <div className="w-full lg:w-64 flex-shrink-0">
            <div className="bg-zinc-900/80 border border-zinc-800/90 rounded-2xl p-4 sticky top-28 space-y-4 backdrop-blur-md shadow-xl">
              {/* Menu de Abas na Sidebar com animações de toque e hover */}
              <nav className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 gap-2 scrollbar-none">
                <button
                  onClick={() => { setActiveAdminTab('dashboard'); setIsFormOpen(false); }}
                  className={`w-full px-3.5 py-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-start gap-3 transition-all truncate whitespace-nowrap cursor-pointer hover:scale-[1.01] active:scale-[0.98] ${
                    activeAdminTab === 'dashboard'
                      ? 'bg-gradient-to-r from-rose-600 to-rose-700 text-white shadow-lg shadow-rose-600/25 font-bold translate-x-0.5 border border-rose-500/40'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                  }`}
                >
                  <LayoutDashboard className={`w-4.5 h-4.5 ${activeAdminTab === 'dashboard' ? 'text-white' : 'text-rose-500'}`} />
                  <span>Dashboard Principal</span>
                </button>

                <button
                  onClick={() => { setActiveAdminTab('catalog'); setIsFormOpen(false); }}
                  className={`w-full px-3.5 py-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-start gap-3 transition-all truncate whitespace-nowrap cursor-pointer hover:scale-[1.01] active:scale-[0.98] ${
                    activeAdminTab === 'catalog'
                      ? 'bg-gradient-to-r from-rose-600 to-rose-700 text-white shadow-lg shadow-rose-600/25 font-bold translate-x-0.5 border border-rose-500/40'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                  }`}
                  id="sidebar-btn-catalog"
                >
                  <Library className={`w-4.5 h-4.5 ${activeAdminTab === 'catalog' ? 'text-white' : 'text-rose-500'}`} />
                  <span>Catálogo de Mídias</span>
                  <span className={`ml-auto text-[10px] font-mono px-2 py-0.5 rounded-full ${activeAdminTab === 'catalog' ? 'bg-white/20 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                    {movies.length}
                  </span>
                </button>

                <button
                  onClick={() => { setActiveAdminTab('notifications'); setIsFormOpen(false); }}
                  className={`w-full px-3.5 py-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-start gap-3 transition-all truncate whitespace-nowrap cursor-pointer hover:scale-[1.01] active:scale-[0.98] ${
                    activeAdminTab === 'notifications'
                      ? 'bg-gradient-to-r from-rose-600 to-rose-700 text-white shadow-lg shadow-rose-600/25 font-bold translate-x-0.5 border border-rose-500/40'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                  }`}
                  id="sidebar-btn-notifications"
                >
                  <Bell className={`w-4.5 h-4.5 ${activeAdminTab === 'notifications' ? 'text-white' : 'text-rose-500'}`} />
                  <span>Central de Avisos</span>
                  {(pendingRequestsCount + comments.length) > 0 && (
                    <span className={`ml-auto text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${activeAdminTab === 'notifications' ? 'bg-white/20 text-white' : 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-600/50'}`}>
                      {pendingRequestsCount + comments.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => { setActiveAdminTab('promotion'); setIsFormOpen(false); }}
                  className={`w-full px-3.5 py-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-start gap-3 transition-all truncate whitespace-nowrap cursor-pointer hover:scale-[1.01] active:scale-[0.98] ${
                    activeAdminTab === 'promotion'
                      ? 'bg-gradient-to-r from-rose-600 to-rose-700 text-white shadow-lg shadow-rose-600/25 font-bold translate-x-0.5 border border-rose-500/40'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                  }`}
                  id="sidebar-btn-promotion"
                >
                  <Megaphone className={`w-4.5 h-4.5 ${activeAdminTab === 'promotion' ? 'text-white' : 'text-rose-500'}`} />
                  <span>Central de Divulgação</span>
                </button>

                <button
                  onClick={() => { setActiveAdminTab('users'); setIsFormOpen(false); }}
                  className={`w-full px-3.5 py-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-start gap-3 transition-all truncate whitespace-nowrap cursor-pointer hover:scale-[1.01] active:scale-[0.98] ${
                    activeAdminTab === 'users'
                      ? 'bg-gradient-to-r from-rose-600 to-rose-700 text-white shadow-lg shadow-rose-600/25 font-bold translate-x-0.5 border border-rose-500/40'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                  }`}
                  id="sidebar-btn-users"
                >
                  <Users className={`w-4.5 h-4.5 ${activeAdminTab === 'users' ? 'text-white' : 'text-rose-500'}`} />
                  <span>Usuários</span>
                  <span className={`ml-auto text-[10px] font-mono px-2 py-0.5 rounded-full ${activeAdminTab === 'users' ? 'bg-white/20 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                    {users.length}
                  </span>
                </button>

                <button
                  onClick={() => { setActiveAdminTab('myaccount'); setIsFormOpen(false); }}
                  className={`w-full px-3.5 py-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-start gap-3 transition-all truncate whitespace-nowrap cursor-pointer hover:scale-[1.01] active:scale-[0.98] ${
                    activeAdminTab === 'myaccount'
                      ? 'bg-gradient-to-r from-rose-600 to-rose-700 text-white shadow-lg shadow-rose-600/25 font-bold translate-x-0.5 border border-rose-500/40'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                  }`}
                  id="sidebar-btn-myaccount"
                >
                  <UserIcon className={`w-4.5 h-4.5 ${activeAdminTab === 'myaccount' ? 'text-white' : 'text-rose-500'}`} />
                  <span>Minha Conta</span>
                </button>

                <button
                  onClick={() => { setActiveAdminTab('settings'); setIsFormOpen(false); }}
                  className={`w-full px-3.5 py-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-start gap-3 transition-all truncate whitespace-nowrap cursor-pointer hover:scale-[1.01] active:scale-[0.98] ${
                    activeAdminTab === 'settings'
                      ? 'bg-gradient-to-r from-rose-600 to-rose-700 text-white shadow-lg shadow-rose-600/25 font-bold translate-x-0.5 border border-rose-500/40'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                  }`}
                  id="sidebar-btn-settings"
                >
                  <Settings className={`w-4.5 h-4.5 ${activeAdminTab === 'settings' ? 'text-white' : 'text-rose-500'}`} />
                  <span>Configurações</span>
                </button>
              </nav>

              {/* Informações Técnicas Retro */}
              <div className="hidden lg:block border-t border-zinc-800/80 pt-3 px-2 space-y-2 text-[10px] text-zinc-400 font-mono leading-none">
                <div className="flex justify-between items-center py-1">
                  <span className="text-zinc-500">SISTEMA:</span>
                  <span className="text-emerald-400 font-bold uppercase flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> ATIVO
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-zinc-500">TMDB API:</span>
                  <span className={tmdbApiKey ? "text-emerald-400 font-bold" : "text-amber-400 font-semibold"}>
                    {tmdbApiKey ? 'OPERANTE' : 'ESTÁTICO'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-zinc-500">CANAL VHS:</span>
                  <span className="text-rose-400 font-bold">CH 03 STEREO</span>
                </div>
              </div>
            </div>
          </div>

          {/* COLUNA DA DIREITA: CONTEÚDO PRINCIPAL DINÂMICO */}
          <div className="flex-1 space-y-6">

            {/* --- ABA 0: DASHBOARD STATS GERAIS (EXECUTIVO, RESUMIDO E COM ANIMAÇÕES PROFISSIONAIS) --- */}
            {activeAdminTab === 'dashboard' && (
              <motion.div 
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="space-y-6"
              >
                
                {/* HUD Resumido de Alta Visibilidade com Stagger Motion */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  
                  {/* Card 1: Catálogo */}
                  <motion.div 
                    whileHover={{ y: -3, transition: { duration: 0.2 } }}
                    className="bg-gradient-to-b from-zinc-900 via-zinc-900/90 to-zinc-950 border border-zinc-800/90 hover:border-rose-500/40 p-5 rounded-2xl shadow-xl relative overflow-hidden group transition-all"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-rose-600/10 rounded-full blur-xl pointer-events-none group-hover:bg-rose-600/20 transition-all" />
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] text-zinc-400 font-mono uppercase font-bold tracking-wider">Total de Mídias</span>
                        <p className="text-3xl font-black font-display text-white mt-1.5 tracking-tight">{movies.length}</p>
                        <p className="text-xs text-rose-400/90 font-mono mt-0.5 font-semibold">Fitas no Acervo</p>
                      </div>
                      <div className="p-2.5 bg-rose-500/15 border border-rose-500/30 text-rose-500 rounded-xl shadow-inner">
                        <Film className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-zinc-800/70 flex justify-between items-center text-[11px] font-mono">
                      <span className="text-emerald-400 font-bold flex items-center gap-1"><Play className="w-3 h-3 fill-emerald-400" /> {countMovies} Filmes</span>
                      <span className="text-sky-400 font-bold flex items-center gap-1"><Tv className="w-3 h-3" /> {countSeries} Séries</span>
                    </div>
                  </motion.div>

                  {/* Card 2: Usuários e Perfis */}
                  <motion.div 
                    whileHover={{ y: -3, transition: { duration: 0.2 } }}
                    className="bg-gradient-to-b from-zinc-900 via-zinc-900/90 to-zinc-950 border border-zinc-800/90 hover:border-emerald-500/40 p-5 rounded-2xl shadow-xl relative overflow-hidden group transition-all"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-600/10 rounded-full blur-xl pointer-events-none group-hover:bg-emerald-600/20 transition-all" />
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] text-zinc-400 font-mono uppercase font-bold tracking-wider">Espectadores</span>
                        <p className="text-3xl font-black font-display text-emerald-400 mt-1.5 tracking-tight">{users.length}</p>
                        <p className="text-xs text-emerald-400/80 font-mono mt-0.5 font-semibold">Contas Registradas</p>
                      </div>
                      <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-xl shadow-inner">
                        <Users className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-zinc-800/70 flex justify-between items-center text-[11px] font-mono text-zinc-400">
                      <span>👥 {totalSubProfiles} Subperfis</span>
                      <span className="text-emerald-400 font-bold">100% Conectados</span>
                    </div>
                  </motion.div>

                  {/* Card 3: Saves e Avaliações */}
                  <motion.div 
                    whileHover={{ y: -3, transition: { duration: 0.2 } }}
                    className="bg-gradient-to-b from-zinc-900 via-zinc-900/90 to-zinc-950 border border-zinc-800/90 hover:border-amber-500/40 p-5 rounded-2xl shadow-xl relative overflow-hidden group transition-all"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-600/10 rounded-full blur-xl pointer-events-none group-hover:bg-amber-600/20 transition-all" />
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] text-zinc-400 font-mono uppercase font-bold tracking-wider">Favoritos</span>
                        <p className="text-3xl font-black font-display text-amber-400 mt-1.5 tracking-tight">{totalMyListSoma}</p>
                        <p className="text-xs text-amber-400/80 font-mono mt-0.5 font-semibold">Itens em Minha Lista</p>
                      </div>
                      <div className="p-2.5 bg-amber-500/15 border border-amber-500/30 text-amber-400 rounded-xl shadow-inner">
                        <Star className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-zinc-800/70 flex justify-between items-center text-[11px] font-mono text-zinc-400">
                      <span>Nota Média:</span>
                      <span className="text-amber-400 font-bold flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {mediaRating} / 10</span>
                    </div>
                  </motion.div>

                  {/* Card 4: Execuções / Minutos */}
                  <motion.div 
                    whileHover={{ y: -3, transition: { duration: 0.2 } }}
                    className="bg-gradient-to-b from-zinc-900 via-zinc-900/90 to-zinc-950 border border-zinc-800/90 hover:border-cyan-500/40 p-5 rounded-2xl shadow-xl relative overflow-hidden group transition-all"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-600/10 rounded-full blur-xl pointer-events-none group-hover:bg-cyan-600/20 transition-all" />
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] text-zinc-400 font-mono uppercase font-bold tracking-wider">Minutos Rodados</span>
                        <p className="text-3xl font-black font-display text-cyan-400 mt-1.5 tracking-tight">{totalMinutosReproduzidos}</p>
                        <p className="text-xs text-cyan-400/80 font-mono mt-0.5 font-semibold">Tempo de Play</p>
                      </div>
                      <div className="p-2.5 bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 rounded-xl shadow-inner">
                        <Clock className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-zinc-800/70 flex justify-between items-center text-[11px] font-mono text-zinc-400">
                      <span className="text-cyan-300 font-bold">{emProgresso} em Progresso</span>
                      <span className="text-emerald-400 font-bold">{fitasConcluidas} Concluídas</span>
                    </div>
                  </motion.div>

                </div>

                {/* Card de Fita Destaque Resumido & Compacto */}
                {popularMovie && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="bg-gradient-to-r from-zinc-950 via-rose-950/20 to-zinc-950 border border-rose-500/30 p-5 sm:p-6 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-5 relative overflow-hidden"
                  >
                    <div className="flex-1 space-y-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        {popularMovie.type === 'series' ? (
                          <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1.5 shadow-sm">
                            <Tv className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> Série Mais Desejada
                          </span>
                        ) : (
                          <span className="bg-rose-500/15 border border-rose-500/30 text-rose-400 font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1.5 shadow-sm">
                            <Flame className="w-3.5 h-3.5 text-rose-500 animate-pulse" /> Filme Mais Desejado
                          </span>
                        )}

                        {pinnedMostDesiredId ? (
                          <span className="text-[10px] font-mono bg-rose-500 text-white px-2 py-0.5 rounded-md font-bold uppercase flex items-center gap-1">
                            <Pin className="w-3 h-3 fill-current" /> Fixada Manualmente
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-md font-bold uppercase flex items-center gap-1">
                            <Flame className="w-3 h-3 text-amber-400 fill-current" /> Popularidade Automática
                          </span>
                        )}

                        <span className="text-[10px] font-mono bg-zinc-900/90 text-zinc-400 border border-zinc-800 px-2 py-0.5 rounded-md">
                          Audiência Exclusiva dos Usuários
                        </span>

                        <span className="text-xs text-zinc-400 font-mono">
                          {popularMovie.category} • {popularMovie.year}
                        </span>
                      </div>

                      <h4 className="text-xl sm:text-2xl font-black text-white font-display uppercase tracking-tight flex items-center gap-2">
                        {popularMovie.title}
                        {popularMovie.type === 'series' && (
                          <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                            Série
                          </span>
                        )}
                      </h4>

                      <p className="text-xs text-zinc-400 line-clamp-2 max-w-2xl leading-relaxed font-sans">
                        {popularMovie.description}
                      </p>

                      <div className="pt-2 flex flex-wrap items-center gap-3 text-xs font-mono text-zinc-400">
                        <span className="flex items-center gap-1.5 text-rose-400 font-bold bg-rose-950/30 border border-rose-500/20 px-2 py-0.5 rounded-lg">
                          <TrendingUp className="w-3.5 h-3.5 text-rose-500" /> Salvo em {popularStats.savedCount} listas
                        </span>

                        <span className="flex items-center gap-1.5 text-sky-400 font-bold bg-sky-950/30 border border-sky-500/20 px-2 py-0.5 rounded-lg">
                          <Users className="w-3.5 h-3.5 text-sky-400" /> {popularStats.viewersCount} espectadores
                        </span>

                        <span className="flex items-center gap-1.5 text-cyan-400 font-bold bg-cyan-950/30 border border-cyan-500/20 px-2 py-0.5 rounded-lg">
                          <Clock className="w-3.5 h-3.5 text-cyan-400" /> {popularStats.minutesCount} min assistidos
                        </span>

                        <span className="text-amber-400 font-bold flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {popularMovie.rating} Nota
                        </span>

                        <button
                          onClick={() => {
                            setActiveAdminTab('catalog');
                            setIsFormOpen(false);
                          }}
                          className="text-rose-400 hover:text-white underline cursor-pointer font-bold ml-auto"
                        >
                          Gerenciar no Catálogo &rarr;
                        </button>
                      </div>
                    </div>

                    <div className="w-24 sm:w-28 aspect-[2/3] rounded-xl overflow-hidden border border-rose-500/40 shadow-2xl shrink-0 group">
                      <img
                        src={popularMovie.posterUrl}
                        alt={popularMovie.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </motion.div>
                )}

                {/* --- CENTRAL DE AVISOS EM TEMPO REAL NO DASHBOARD --- */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-gradient-to-b from-zinc-900/95 via-zinc-900/90 to-zinc-950 border border-zinc-800/90 hover:border-rose-500/40 p-5 sm:p-6 rounded-2xl shadow-2xl relative overflow-hidden space-y-4"
                  id="dashboard-notifications-widget"
                >
                  {/* Cabeçalho da Central de Avisos */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-zinc-800/80 pb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="bg-rose-500/15 border border-rose-500/30 text-rose-400 font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1.5">
                          <Bell className="w-3.5 h-3.5 text-rose-500 animate-pulse" /> Central de Avisos & Atividades
                        </span>
                        <span className="text-[10px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-md font-bold uppercase flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> Tempo Real
                        </span>
                      </div>
                      <h3 className="font-bold text-lg text-white font-display tracking-tight flex items-center gap-2">
                        Pedidos de Filmes & Séries e Comentários Recentes
                      </h3>
                      <p className="text-xs text-zinc-400 font-sans">
                        Fique por dentro das solicitações de novos títulos e opiniões postadas pelos espectadores.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveAdminTab('notifications');
                          setIsFormOpen(false);
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-mono font-bold uppercase tracking-wider rounded-xl transition-all shadow-md shadow-rose-950/40 flex items-center gap-2 cursor-pointer active:scale-95"
                      >
                        <span>Abrir Central de Avisos Completa</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Pílulas de Resumo Métrico */}
                  <div className="grid grid-cols-1 xs:grid-cols-3 gap-2.5 pt-1">
                    <div className="p-3 bg-zinc-950/70 border border-zinc-800/80 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-sky-500/15 text-sky-400 border border-sky-500/30 flex items-center justify-center">
                          <Film className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[10px] text-zinc-400 font-mono uppercase">Pedidos de Filmes/Séries</p>
                          <p className="text-sm font-bold text-white font-mono">{requests.length} pedidos ({pendingRequestsCount} pendentes)</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-zinc-950/70 border border-zinc-800/80 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                          <MessageSquare className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[10px] text-zinc-400 font-mono uppercase">Comentários nos Títulos</p>
                          <p className="text-sm font-bold text-white font-mono">{comments.length} comentários</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-zinc-950/70 border border-zinc-800/80 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/15 text-purple-400 border border-purple-500/30 flex items-center justify-center">
                          <Users className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[10px] text-zinc-400 font-mono uppercase">Usuários Cadastrados</p>
                          <p className="text-sm font-bold text-white font-mono">{users.length} contas</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Filtros Rápidos */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
                    <button
                      type="button"
                      onClick={() => setNoticeFilter('all')}
                      className={`px-3 py-1.5 rounded-lg font-mono font-semibold transition-all cursor-pointer ${
                        noticeFilter === 'all'
                          ? 'bg-rose-600 text-white shadow-md'
                          : 'bg-zinc-800/70 text-zinc-400 hover:text-white hover:bg-zinc-800'
                      }`}
                    >
                      Todos os Avisos ({consolidatedAlerts.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setNoticeFilter('requests')}
                      className={`px-3 py-1.5 rounded-lg font-mono font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                        noticeFilter === 'requests'
                          ? 'bg-sky-600 text-white shadow-md'
                          : 'bg-zinc-800/70 text-zinc-400 hover:text-white hover:bg-zinc-800'
                      }`}
                    >
                      <span>🎬 Pedidos ({requests.length})</span>
                      {pendingRequestsCount > 0 && (
                        <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[9px]">
                          {pendingRequestsCount}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setNoticeFilter('comments')}
                      className={`px-3 py-1.5 rounded-lg font-mono font-semibold transition-all cursor-pointer ${
                        noticeFilter === 'comments'
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'bg-zinc-800/70 text-zinc-400 hover:text-white hover:bg-zinc-800'
                      }`}
                    >
                      💬 Comentários ({comments.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setNoticeFilter('users')}
                      className={`px-3 py-1.5 rounded-lg font-mono font-semibold transition-all cursor-pointer ${
                        noticeFilter === 'users'
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'bg-zinc-800/70 text-zinc-400 hover:text-white hover:bg-zinc-800'
                      }`}
                    >
                      👤 Novos Usuários ({users.length})
                    </button>
                  </div>

                  {/* Lista de Alertas Recentes (mostra os primeiros 6) */}
                  <div className="space-y-2.5 pt-1">
                    {filteredAlerts.length === 0 ? (
                      <div className="p-8 text-center bg-zinc-950/50 border border-zinc-850 rounded-2xl">
                        <Bell className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                        <p className="text-zinc-400 font-medium text-sm">Nenhum aviso ou notificação no momento.</p>
                        <p className="text-zinc-500 text-xs mt-0.5">Quando os usuários solicitarem títulos ou comentarem em filmes/séries, eles aparecerão aqui instantaneamente.</p>
                      </div>
                    ) : (
                      filteredAlerts.slice(0, 6).map((alert) => (
                        <div
                          key={alert.id}
                          className="p-3.5 sm:p-4 bg-zinc-950/80 hover:bg-zinc-900/90 border border-zinc-850 hover:border-zinc-700 rounded-xl transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 group"
                        >
                          <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                            {/* Avatar ou Poster */}
                            <div className="relative shrink-0">
                              {alert.type === 'request' ? (
                                <div className="w-11 h-14 rounded-lg bg-zinc-900 border border-sky-500/40 overflow-hidden shadow-md flex items-center justify-center">
                                  {alert.posterUrl ? (
                                    <img src={alert.posterUrl} alt="Poster" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  ) : (
                                    <Film className="w-5 h-5 text-sky-400" />
                                  )}
                                </div>
                              ) : alert.type === 'comment' ? (
                                <div className="w-11 h-14 rounded-lg bg-zinc-900 border border-emerald-500/40 overflow-hidden shadow-md flex items-center justify-center">
                                  {alert.posterUrl ? (
                                    <img src={alert.posterUrl} alt="Poster" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  ) : (
                                    <MessageSquare className="w-5 h-5 text-emerald-400" />
                                  )}
                                </div>
                              ) : (
                                <div className="w-11 h-11 rounded-full bg-zinc-900 border border-purple-500/40 overflow-hidden shadow-md flex items-center justify-center">
                                  {alert.userAvatar ? (
                                    <img src={alert.userAvatar} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  ) : (
                                    <Users className="w-5 h-5 text-purple-400" />
                                  )}
                                </div>
                              )}

                              {/* Badge de tipo de alerta */}
                              <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow-sm ${
                                alert.type === 'request'
                                  ? 'bg-sky-500 text-white'
                                  : alert.type === 'comment'
                                  ? 'bg-emerald-500 text-black'
                                  : 'bg-purple-500 text-white'
                              }`}>
                                {alert.type === 'request' ? '🎬' : alert.type === 'comment' ? '💬' : '👤'}
                              </div>
                            </div>

                            {/* Conteúdo do Alerta */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-bold uppercase ${
                                  alert.type === 'request'
                                    ? alert.status === 'fulfilled'
                                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                      : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                    : alert.type === 'comment'
                                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                                }`}>
                                  {alert.type === 'request'
                                    ? (alert.status === 'fulfilled' ? 'Pedido Atendido ✅' : 'Pedido Pendente ⏳')
                                    : alert.type === 'comment'
                                    ? 'Comentário em Mídia'
                                    : 'Novo Cadastro'}
                                </span>
                                <span className="text-[11px] font-mono text-zinc-500">
                                  {formatAlertTime(alert.date)}
                                </span>
                              </div>

                              <h4 className="text-sm font-bold text-white truncate mt-1">
                                {alert.title}
                              </h4>
                              <p className="text-xs text-zinc-300 font-sans line-clamp-2 mt-0.5">
                                {alert.subtitle}
                              </p>
                            </div>
                          </div>

                          {/* Ações Rápidas por Tipo */}
                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            {alert.type === 'request' && alert.rawRequest && (
                              <>
                                {alert.status === 'pending' && onFulfillRequest && (
                                  <button
                                    type="button"
                                    onClick={() => onFulfillRequest(alert.rawRequest!.id)}
                                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-mono font-bold transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                                    title="Marcar pedido como atendido"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Atender</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTmdbSearchQuery(alert.rawRequest!.title);
                                    setActiveAdminTab('catalog');
                                    setIsFormOpen(true);
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-mono transition-all flex items-center gap-1 cursor-pointer"
                                  title="Buscar título no TMDB para adicionar ao catálogo"
                                >
                                  <Search className="w-3.5 h-3.5 text-sky-400" />
                                  <span>Buscar TMDB</span>
                                </button>
                                {onDeleteRequest && (
                                  <button
                                    type="button"
                                    onClick={() => onDeleteRequest(alert.rawRequest!.id)}
                                    className="p-1.5 rounded-lg bg-zinc-900 hover:bg-rose-900/50 text-zinc-400 hover:text-rose-400 border border-zinc-800 transition-colors cursor-pointer"
                                    title="Excluir pedido"
                                  >
                                    <Trash className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </>
                            )}

                            {alert.type === 'comment' && alert.rawComment && (
                              <>
                                {alert.movie && onSelectMovie && (
                                  <button
                                    type="button"
                                    onClick={() => onSelectMovie(alert.movie!)}
                                    className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-mono transition-all flex items-center gap-1 cursor-pointer"
                                    title="Abrir detalhes e reprodução da fita"
                                  >
                                    <Play className="w-3.5 h-3.5 text-emerald-400 fill-current" />
                                    <span>Ver Mídia</span>
                                  </button>
                                )}
                                {onDeleteComment && (
                                  <button
                                    type="button"
                                    onClick={() => onDeleteComment(alert.rawComment!.id)}
                                    className="p-1.5 rounded-lg bg-zinc-900 hover:bg-rose-900/50 text-zinc-400 hover:text-rose-400 border border-zinc-800 transition-colors cursor-pointer"
                                    title="Excluir este comentário"
                                  >
                                    <Trash className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </>
                            )}

                            {alert.type === 'user' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveAdminTab('users');
                                  setIsFormOpen(false);
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-mono transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <Users className="w-3.5 h-3.5 text-purple-400" />
                                <span>Ver Contas</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {filteredAlerts.length > 6 && (
                    <div className="pt-2 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveAdminTab('notifications');
                          setIsFormOpen(false);
                        }}
                        className="text-xs font-mono font-bold text-rose-400 hover:text-white underline cursor-pointer"
                      >
                        Ver todos os {filteredAlerts.length} avisos na Central de Avisos &rarr;
                      </button>
                    </div>
                  )}
                </motion.div>

                {/* Grid Duplo Resumido: Distribuição de Prateleiras e Integridade Operacional */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Top 5 Gêneros Mais Expressivos do Catálogo */}
                  <div className="bg-zinc-900/90 border border-zinc-800 p-6 rounded-2xl shadow-xl space-y-4">
                    <div className="flex justify-between items-center border-b border-zinc-800/80 pb-3">
                      <h3 className="font-bold text-sm text-white font-display uppercase tracking-tight flex items-center gap-2">
                        <Activity className="w-4 h-4 text-rose-500" /> Principais Gêneros do Acervo
                      </h3>
                      <span className="text-[10px] text-rose-400 bg-rose-500/10 border border-rose-500/25 px-2 py-0.5 rounded-full font-mono font-bold uppercase">
                        {movies.length} Títulos
                      </span>
                    </div>

                    <div className="space-y-3 pt-1">
                      {categoryStats.slice(0, 5).map((stat, idx) => (
                        <div key={stat.category} className="space-y-1.5">
                          <div className="flex justify-between font-mono text-xs text-zinc-300">
                            <span className="font-semibold flex items-center gap-2">
                              <span className="text-[10px] text-zinc-500 font-bold">#{idx + 1}</span>
                              {stat.category}
                            </span>
                            <span className="text-zinc-400 font-bold">
                              {stat.count} {stat.count === 1 ? 'Volume' : 'Volumes'} ({Math.round(stat.percentage)}%)
                            </span>
                          </div>
                          <div className="w-full bg-zinc-950 rounded-full h-2 border border-zinc-800 overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${stat.percentage}%` }}
                              transition={{ duration: 0.6, delay: idx * 0.08 }}
                              className="h-full rounded-full bg-gradient-to-r from-rose-600 to-rose-500"
                            />
                          </div>
                        </div>
                      ))}
                      {categoryStats.length > 5 && (
                        <p className="text-[11px] font-mono text-zinc-500 pt-1 text-center">
                          + {categoryStats.length - 5} outros gêneros catalogados
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Status Geral de Conectividade e Ações Rápidas Resumidas */}
                  <div className="bg-zinc-900/90 border border-zinc-800 p-6 rounded-2xl shadow-xl flex flex-col justify-between space-y-5">
                    <div>
                      <div className="flex justify-between items-center border-b border-zinc-800/80 pb-3 mb-4">
                        <h3 className="font-bold text-sm text-white font-display uppercase tracking-tight flex items-center gap-2">
                          <Shield className="w-4 h-4 text-rose-500" /> Diagnóstico do Sistema
                        </h3>
                        <span className="bg-emerald-500/15 font-mono text-[9px] text-emerald-400 font-bold border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> OPERACIONAL
                        </span>
                      </div>

                      <div className="space-y-2.5 font-mono text-[11px]">
                        <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800/90 flex justify-between items-center">
                          <span className="text-zinc-400 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" /> TMDB ENGINE:
                          </span>
                          <span className={tmdbApiKey ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                            {tmdbApiKey ? "API V3 CONECTADA ✅" : "CONTINGÊNCIA ⚠️"}
                          </span>
                        </div>
                        <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800/90 flex justify-between items-center">
                          <span className="text-zinc-400 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" /> PLAYER ABYSS:
                          </span>
                          <span className={abyssApiKey ? "text-emerald-400 font-bold" : "text-zinc-300 font-semibold"}>
                            {abyssApiKey ? "AUTO EMBED ATIVO ✅" : "PADRÃO DISPONÍVEL"}
                          </span>
                        </div>
                        <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800/90 flex justify-between items-center">
                          <span className="text-zinc-400 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-rose-500" /> PERSISTÊNCIA:
                          </span>
                          <span className="text-rose-400 font-bold">LOCALSTORAGE + FIRESTORE</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-zinc-800/80 flex flex-wrap gap-2 justify-between items-center text-[11px] text-zinc-400 font-mono">
                      <span>SINAL: 100% ESTÁVEL</span>
                      <button 
                        onClick={() => alert('Plataforma sincronizada e catálogo verificado em tempo real!')}
                        className="flex items-center gap-2 px-4 py-2 bg-zinc-950 hover:bg-rose-600 hover:text-white border border-zinc-800 rounded-xl text-zinc-300 transition-all cursor-pointer font-bold active:scale-95 shadow-md"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-rose-500 group-hover:text-white" /> Sincronizar Fitas
                      </button>
                    </div>
                  </div>

                </div>

                {/* Banner de Acesso Rápido à Central de Divulgação */}
                <motion.div
                  whileHover={{ y: -2 }}
                  className="bg-gradient-to-r from-rose-950/40 via-zinc-900 to-zinc-950 border border-rose-500/30 p-5 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-rose-600/20 border border-rose-500/40 text-rose-400 flex items-center justify-center shrink-0 shadow-inner">
                      <Megaphone className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white uppercase tracking-wide flex items-center gap-2">
                        Central de Divulgação VHSFLIX
                        <span className="text-[10px] font-mono bg-rose-600 text-white px-2 py-0.5 rounded-full font-bold">
                          NOVO
                        </span>
                      </h4>
                      <p className="text-xs text-zinc-400 mt-0.5 font-sans">
                        Gere postagens completas com notas do TMDB, elenco e link de compartilhamento para WhatsApp, Telegram e redes sociais em segundos.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveAdminTab('promotion')}
                    className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-mono font-bold uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-rose-950/40 cursor-pointer shrink-0 flex items-center gap-2 active:scale-95"
                  >
                    <span>Abrir Central de Divulgação</span>
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                </motion.div>

              </motion.div>
            )}

            {/* --- ABA DEDICADA: CENTRAL DE AVISOS E ATIVIDADES DOS USUÁRIOS --- */}
            {activeAdminTab === 'notifications' && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="space-y-6"
                id="central-de-avisos-full-page"
              >
                {/* Banner de Cabeçalho da Central de Avisos */}
                <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-rose-950/30 border border-zinc-800 p-6 rounded-2xl shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono bg-rose-500/20 text-rose-400 border border-rose-500/40 px-2.5 py-0.5 rounded-full font-bold uppercase flex items-center gap-1.5">
                        <Bell className="w-3.5 h-3.5 text-rose-500 animate-pulse" /> Central de Avisos
                      </span>
                      <span className="text-zinc-500 font-mono text-xs">•</span>
                      <span className="text-xs text-emerald-400 font-mono font-bold flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" /> Sincronização em Tempo Real
                      </span>
                    </div>
                    <h2 className="text-2xl font-black text-white font-display uppercase tracking-tight">
                      Avisos de Pedidos e Comentários
                    </h2>
                    <p className="text-xs text-zinc-400 max-w-2xl font-sans leading-relaxed">
                      Gerencie e atenda os pedidos de filmes e séries enviados pelos espectadores, modere comentários e acompanhe os novos usuários cadastrados na plataforma.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-stretch sm:self-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveAdminTab('dashboard');
                      }}
                      className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-mono font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 w-full sm:w-auto"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Voltar ao Dashboard</span>
                    </button>
                  </div>
                </div>

                {/* Métricas e Estatísticas Rápidas da Central de Avisos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 bg-gradient-to-b from-zinc-900 to-zinc-950 border border-amber-500/30 rounded-2xl shadow-lg relative overflow-hidden">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] text-amber-400 font-mono uppercase font-bold tracking-wider">Aguardando Inclusão</span>
                        <p className="text-3xl font-black font-display text-white mt-1">{pendingRequestsCount}</p>
                        <p className="text-xs text-amber-400/90 font-mono mt-0.5">Pedidos Pendentes</p>
                      </div>
                      <div className="p-2.5 bg-amber-500/15 border border-amber-500/30 text-amber-400 rounded-xl">
                        <Clock className="w-5 h-5" />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-gradient-to-b from-zinc-900 to-zinc-950 border border-sky-500/30 rounded-2xl shadow-lg relative overflow-hidden">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] text-sky-400 font-mono uppercase font-bold tracking-wider">Total de Pedidos</span>
                        <p className="text-3xl font-black font-display text-white mt-1">{requests.length}</p>
                        <p className="text-xs text-sky-400/90 font-mono mt-0.5">Filmes e Séries</p>
                      </div>
                      <div className="p-2.5 bg-sky-500/15 border border-sky-500/30 text-sky-400 rounded-xl">
                        <Film className="w-5 h-5" />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-gradient-to-b from-zinc-900 to-zinc-950 border border-emerald-500/30 rounded-2xl shadow-lg relative overflow-hidden">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] text-emerald-400 font-mono uppercase font-bold tracking-wider">Interações e Opiniões</span>
                        <p className="text-3xl font-black font-display text-white mt-1">{comments.length}</p>
                        <p className="text-xs text-emerald-400/90 font-mono mt-0.5">Comentários Postados</p>
                      </div>
                      <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-xl">
                        <MessageSquare className="w-5 h-5" />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-gradient-to-b from-zinc-900 to-zinc-950 border border-purple-500/30 rounded-2xl shadow-lg relative overflow-hidden">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] text-purple-400 font-mono uppercase font-bold tracking-wider">Espectadores Registrados</span>
                        <p className="text-3xl font-black font-display text-white mt-1">{users.length}</p>
                        <p className="text-xs text-purple-400/90 font-mono mt-0.5">Contas de Acesso</p>
                      </div>
                      <div className="p-2.5 bg-purple-500/15 border border-purple-500/30 text-purple-400 rounded-xl">
                        <Users className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Barra de Filtros e Busca de Avisos */}
                <div className="p-4 bg-zinc-900/90 border border-zinc-800 rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
                  {/* Busca */}
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Pesquisar aviso por nome de usuário, filme ou texto..."
                      value={noticeSearch}
                      onChange={(e) => setNoticeSearch(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-rose-500 transition-colors"
                    />
                    {noticeSearch && (
                      <button
                        type="button"
                        onClick={() => setNoticeSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Filtro por categoria */}
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
                    <button
                      type="button"
                      onClick={() => setNoticeFilter('all')}
                      className={`px-3 py-2 rounded-xl font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
                        noticeFilter === 'all'
                          ? 'bg-rose-600 text-white shadow-md'
                          : 'bg-zinc-800/80 text-zinc-400 hover:text-white'
                      }`}
                    >
                      Todos ({consolidatedAlerts.length})
                    </button>

                    <button
                      type="button"
                      onClick={() => setNoticeFilter('requests')}
                      className={`px-3 py-2 rounded-xl font-mono font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                        noticeFilter === 'requests'
                          ? 'bg-sky-600 text-white shadow-md'
                          : 'bg-zinc-800/80 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <span>🎬 Pedidos ({requests.length})</span>
                      {pendingRequestsCount > 0 && (
                        <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[9px]">
                          {pendingRequestsCount}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setNoticeFilter('comments')}
                      className={`px-3 py-2 rounded-xl font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
                        noticeFilter === 'comments'
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'bg-zinc-800/80 text-zinc-400 hover:text-white'
                      }`}
                    >
                      💬 Comentários ({comments.length})
                    </button>

                    <button
                      type="button"
                      onClick={() => setNoticeFilter('users')}
                      className={`px-3 py-2 rounded-xl font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
                        noticeFilter === 'users'
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'bg-zinc-800/80 text-zinc-400 hover:text-white'
                      }`}
                    >
                      👤 Usuários ({users.length})
                    </button>
                  </div>
                </div>

                {/* Lista Completa de Alertas */}
                <div className="space-y-3">
                  {filteredAlerts.length === 0 ? (
                    <div className="p-12 text-center bg-zinc-900/60 border border-zinc-800 rounded-2xl">
                      <Bell className="w-12 h-12 text-zinc-700 mx-auto mb-3 animate-bounce" />
                      <h4 className="text-white font-bold text-base font-display uppercase tracking-wide">
                        Nenhum registro encontrado
                      </h4>
                      <p className="text-zinc-400 text-xs mt-1 max-w-md mx-auto">
                        Não encontramos nenhum aviso para o filtro selecionado. Quando houver novos pedidos ou comentários, eles aparecerão aqui em tempo real.
                      </p>
                    </div>
                  ) : (
                    filteredAlerts.map((alert) => (
                      <motion.div
                        key={alert.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 sm:p-5 bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-950 border border-zinc-800/90 hover:border-zinc-700 rounded-2xl shadow-xl transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
                      >
                        <div className="flex items-start sm:items-center gap-4 min-w-0 flex-1">
                          {/* Thumbnail / Foto */}
                          <div className="relative shrink-0">
                            {alert.type === 'request' ? (
                              <div className="w-14 h-18 rounded-xl bg-zinc-950 border border-sky-500/40 overflow-hidden shadow-lg flex items-center justify-center">
                                {alert.posterUrl ? (
                                  <img src={alert.posterUrl} alt="Poster" className="w-full h-full object-cover group-hover:scale-105 transition-transform" referrerPolicy="no-referrer" />
                                ) : (
                                  <Film className="w-6 h-6 text-sky-400" />
                                )}
                              </div>
                            ) : alert.type === 'comment' ? (
                              <div className="w-14 h-18 rounded-xl bg-zinc-950 border border-emerald-500/40 overflow-hidden shadow-lg flex items-center justify-center">
                                {alert.posterUrl ? (
                                  <img src={alert.posterUrl} alt="Poster" className="w-full h-full object-cover group-hover:scale-105 transition-transform" referrerPolicy="no-referrer" />
                                ) : (
                                  <MessageSquare className="w-6 h-6 text-emerald-400" />
                                )}
                              </div>
                            ) : (
                              <div className="w-14 h-14 rounded-2xl bg-zinc-950 border border-purple-500/40 overflow-hidden shadow-lg flex items-center justify-center">
                                {alert.userAvatar ? (
                                  <img src={alert.userAvatar} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  <Users className="w-6 h-6 text-purple-400" />
                                )}
                              </div>
                            )}

                            <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-md ${
                              alert.type === 'request'
                                ? 'bg-sky-500 text-white'
                                : alert.type === 'comment'
                                ? 'bg-emerald-500 text-black'
                                : 'bg-purple-500 text-white'
                            }`}>
                              {alert.type === 'request' ? '🎬' : alert.type === 'comment' ? '💬' : '👤'}
                            </div>
                          </div>

                          {/* Textos e Detalhes */}
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold uppercase ${
                                alert.type === 'request'
                                  ? alert.status === 'fulfilled'
                                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                  : alert.type === 'comment'
                                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                              }`}>
                                {alert.type === 'request'
                                  ? (alert.status === 'fulfilled' ? 'Pedido Atendido ✅' : 'Pedido Pendente ⏳')
                                  : alert.type === 'comment'
                                  ? 'Comentário em Filme/Série'
                                  : 'Novo Usuário na Plataforma'}
                              </span>

                              <span className="text-xs font-mono text-zinc-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatAlertTime(alert.date)}
                              </span>

                              <span className="text-[11px] font-mono text-zinc-400">
                                Por: <strong className="text-zinc-200">{alert.userName}</strong>
                                {alert.profileName && <span className="text-zinc-400"> (Perfil: {alert.profileName})</span>}
                              </span>
                            </div>

                            <h3 className="text-base font-bold text-white tracking-tight">
                              {alert.title}
                            </h3>

                            {alert.type === 'comment' ? (
                              <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-850 text-xs text-zinc-300 font-sans italic leading-relaxed">
                                {alert.subtitle}
                              </div>
                            ) : (
                              <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                                {alert.subtitle}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Botões de Ação na Direita */}
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          {alert.type === 'request' && alert.rawRequest && (
                            <>
                              {alert.status === 'pending' && onFulfillRequest && (
                                <button
                                  type="button"
                                  onClick={() => onFulfillRequest(alert.rawRequest!.id)}
                                  className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-950/40"
                                  title="Marcar pedido como atendido"
                                >
                                  <Check className="w-4 h-4" />
                                  <span>Marcar como Atendido</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setCatalogSearchQuery(alert.rawRequest!.title);
                                  setTmdbSearchQuery(alert.rawRequest!.title);
                                  setActiveAdminTab('catalog');
                                  setIsFormOpen(false);
                                }}
                                className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer border border-zinc-700"
                                title="Buscar título no TMDB para adicionar ao catálogo"
                              >
                                <Search className="w-4 h-4 text-sky-400" />
                                <span>Buscar no TMDB</span>
                              </button>
                              {onDeleteRequest && (
                                <button
                                  type="button"
                                  onClick={() => onDeleteRequest(alert.rawRequest!.id)}
                                  className="p-2 rounded-xl bg-zinc-900 hover:bg-rose-900/50 text-zinc-400 hover:text-rose-400 border border-zinc-800 transition-colors cursor-pointer"
                                  title="Excluir pedido"
                                >
                                  <Trash className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}

                          {alert.type === 'comment' && alert.rawComment && (
                            <>
                              {alert.movie && onSelectMovie && (
                                <button
                                  type="button"
                                  onClick={() => onSelectMovie(alert.movie!)}
                                  className="px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                                  title="Abrir detalhes e assistir"
                                >
                                  <Play className="w-4 h-4 fill-current" />
                                  <span>Ver Mídia / Detalhes</span>
                                </button>
                              )}
                              {onDeleteComment && (
                                <button
                                  type="button"
                                  onClick={() => onDeleteComment(alert.rawComment!.id)}
                                  className="p-2 rounded-xl bg-zinc-900 hover:bg-rose-900/50 text-zinc-400 hover:text-rose-400 border border-zinc-800 transition-colors cursor-pointer"
                                  title="Excluir este comentário"
                                >
                                  <Trash className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}

                          {alert.type === 'user' && (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveAdminTab('users');
                                setIsFormOpen(false);
                              }}
                              className="px-3 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/40 text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <Users className="w-4 h-4" />
                              <span>Gerenciar Conta</span>
                            </button>
                          )}
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

        {/* --- ABA 1: CATÁLOGO DE MÍDIAS --- */}
        {activeAdminTab === 'catalog' && (
          <div className="space-y-6 animate-fade-in">
            {!isFormOpen ? (
              <>
                {/* HUD de Operações do Catálogo Modernizado */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-950 border border-zinc-800 shadow-xl px-6 py-5 rounded-2xl gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="font-bold text-xl text-white font-display tracking-tight flex items-center gap-2">
                        <Library className="w-5 h-5 text-rose-500" />
                        Catálogo de Mídias
                      </h3>
                      <span className="text-[11px] font-mono font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 px-2.5 py-0.5 rounded-full">
                        {movies.length} Títulos Cadastrados
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 font-mono">
                      Acervo ativo • {countMovies} Filmes • {countSeries} Séries
                    </p>
                  </div>
                  <button
                    onClick={handleOpenCreateForm}
                    className="bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-xs sm:text-sm font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-rose-600/20 hover:shadow-rose-600/35 active:scale-95 cursor-pointer shrink-0"
                    id="btn-admin-add-movie"
                  >
                    <Plus className="w-4.5 h-4.5" /> 
                    <span>Adicionar Filme ou Série</span>
                  </button>
                </div>

                {/* PAINEL DE CONTROLE DA FITA VHS MAIS DESEJADA */}
                <div className="bg-gradient-to-r from-zinc-950 via-rose-950/20 to-zinc-950 border border-rose-500/30 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-500 shadow-inner">
                        <Flame className="w-5 h-5 animate-pulse" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white font-display uppercase tracking-wide flex items-center gap-2 flex-wrap">
                          Fita VHS Mais Desejada
                          {pinnedMostDesiredId ? (
                            <span className="text-[10px] font-mono bg-rose-500 text-white px-2 py-0.5 rounded-md font-black uppercase flex items-center gap-1 shadow-sm">
                              <Pin className="w-3 h-3 fill-current" />
                              Fixada Manualmente
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md font-bold uppercase flex items-center gap-1">
                              <Flame className="w-3 h-3 text-amber-400 fill-current" />
                              Seleção Automática (Destaques)
                            </span>
                          )}
                        </h4>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          {pinnedMostDesiredId
                            ? "Você fixou um título específico do acervo para ser a Fita VHS Mais Desejada no topo da tela inicial."
                            : "A fita é selecionada automaticamente em tempo real cruzando acessos, curtidas e estatísticas de popularidade."}
                        </p>
                      </div>
                    </div>

                    {/* Botão de Desfixar se houver fixado */}
                    {pinnedMostDesiredId && (
                      <button
                        type="button"
                        onClick={() => onTogglePinMostDesired?.(null)}
                        className="text-xs font-mono font-bold bg-zinc-900 hover:bg-zinc-800 text-rose-400 border border-rose-500/30 px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto shadow-sm"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Voltar ao Modo Automático</span>
                      </button>
                    )}
                  </div>

                  {/* Fita Atualmente Fixada */}
                  {currentlyPinnedMovie && (
                    <div className="bg-rose-950/25 border border-rose-500/40 rounded-xl p-3.5 flex items-center justify-between gap-3 my-2 backdrop-blur-xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <img 
                          src={currentlyPinnedMovie.posterUrl} 
                          alt={currentlyPinnedMovie.title} 
                          className="w-11 h-15 object-cover rounded-lg border border-rose-500/50 shrink-0 shadow-md" 
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-white uppercase font-sans truncate">{currentlyPinnedMovie.title}</span>
                            <span className="text-[10px] font-mono text-zinc-400">({currentlyPinnedMovie.year})</span>
                            <span className="text-[9px] font-mono text-rose-400 bg-rose-500/20 px-1.5 py-0.5 rounded uppercase font-bold">
                              {currentlyPinnedMovie.category}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400 line-clamp-1 mt-1">{currentlyPinnedMovie.description}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onTogglePinMostDesired?.(null)}
                        className="text-xs font-mono font-bold text-rose-400 hover:text-white bg-zinc-900 hover:bg-rose-600 border border-rose-500/30 px-3 py-1.5 rounded-lg transition-all shrink-0 cursor-pointer flex items-center gap-1 shadow-sm"
                        title="Desfixar Fita"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Desfixar</span>
                      </button>
                    </div>
                  )}

                  {/* Seletor com Ampola/Lupa de Pesquisa para Fixar Fita Específica */}
                  <div className="pt-2 border-t border-zinc-850 relative">
                    <label className="block text-xs font-mono text-zinc-300 font-bold mb-1.5 flex items-center gap-1.5">
                      <Search className="w-3.5 h-3.5 text-rose-400" />
                      <span>Pesquisar Filme ou Série para Fixar em Destaque:</span>
                    </label>

                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                        <Search className="w-4 h-4 text-rose-500" />
                      </div>
                      <input
                        type="text"
                        value={pinSearchQuery}
                        onChange={(e) => {
                          setPinSearchQuery(e.target.value);
                          setIsPinPickerOpen(true);
                        }}
                        onFocus={() => setIsPinPickerOpen(true)}
                        placeholder="Digite o nome do filme ou série para pesquisar..."
                        className="w-full pl-9 pr-8 py-2.5 bg-zinc-900 border border-zinc-750 focus:border-rose-500 rounded-xl text-xs font-mono text-white placeholder-zinc-500 focus:outline-none transition-all shadow-inner"
                        id="input-pin-search"
                      />
                      {pinSearchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setPinSearchQuery('');
                            setIsPinPickerOpen(false);
                          }}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-white cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Dropdown de Resultados da Pesquisa por Lupa */}
                    {isPinPickerOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-zinc-900 border border-zinc-750 rounded-xl shadow-2xl z-30 max-h-60 overflow-y-auto divide-y divide-zinc-800 animate-fade-in">
                        <div className="p-2.5 bg-zinc-950/95 text-[10px] font-mono text-zinc-400 uppercase tracking-wider flex justify-between items-center sticky top-0 z-10 backdrop-blur-md">
                          <span>Resultados ({filteredPinMovies.length})</span>
                          <button
                            type="button"
                            onClick={() => setIsPinPickerOpen(false)}
                            className="text-zinc-400 hover:text-white text-[10px] font-bold underline cursor-pointer"
                          >
                            Fechar
                          </button>
                        </div>

                        {filteredPinMovies.length === 0 ? (
                          <div className="p-4 text-center text-xs text-zinc-500 font-mono">
                            Nenhum filme ou série encontrado com "{pinSearchQuery}".
                          </div>
                        ) : (
                          filteredPinMovies.map(m => {
                            const isPinned = pinnedMostDesiredId === m.id;
                            return (
                              <div
                                key={m.id}
                                onClick={() => {
                                  onTogglePinMostDesired?.(isPinned ? null : m.id);
                                  setIsPinPickerOpen(false);
                                  setPinSearchQuery('');
                                }}
                                className={`p-2.5 flex items-center justify-between gap-3 hover:bg-rose-950/30 cursor-pointer transition-colors ${
                                  isPinned ? 'bg-rose-900/20' : ''
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <img 
                                    src={m.posterUrl} 
                                    alt={m.title} 
                                    className="w-8 h-11 object-cover rounded-lg border border-zinc-800 shrink-0" 
                                  />
                                  <div className="min-w-0">
                                    <div className="text-xs font-bold text-white truncate font-sans">{m.title}</div>
                                    <div className="text-[10px] font-mono text-zinc-400 flex items-center gap-1.5">
                                      <span>{m.year}</span>
                                      <span>•</span>
                                      <span className="text-rose-400">{m.category}</span>
                                      <span>•</span>
                                      <span className="text-yellow-400 flex items-center gap-0.5">
                                        <Star className="w-3 h-3 fill-current" /> {m.rating}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider shrink-0 cursor-pointer transition-all flex items-center gap-1 ${
                                    isPinned 
                                      ? 'bg-rose-600 text-white shadow' 
                                      : 'bg-zinc-800 hover:bg-rose-600 text-zinc-300 hover:text-white border border-zinc-700'
                                  }`}
                                >
                                  <Pin className="w-3 h-3 fill-current" />
                                  <span>{isPinned ? 'Fixada' : 'Fixar'}</span>
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Pílulas de Filtro de Mídia Rápidas e Dinâmicas */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => setCatalogFilter('all')}
                    className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap border font-bold ${
                      catalogFilter === 'all'
                        ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/30'
                        : 'bg-zinc-900/80 text-zinc-400 hover:text-white border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <span>Todos os Títulos</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 font-mono">{movies.length}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCatalogFilter('recommended')}
                    className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap border font-bold ${
                      catalogFilter === 'recommended'
                        ? 'bg-amber-500 text-black border-amber-400 shadow-lg shadow-amber-500/30'
                        : 'bg-zinc-900/80 text-amber-400 hover:text-amber-300 border-amber-500/30 hover:border-amber-500/60'
                    }`}
                  >
                    <Award className="w-3.5 h-3.5 fill-current" />
                    <span>Indicados pelo Rafael</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 font-mono">{countRecommended}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCatalogFilter('pinned')}
                    className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap border font-bold ${
                      catalogFilter === 'pinned'
                        ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/30'
                        : 'bg-zinc-900/80 text-zinc-400 hover:text-white border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5 text-rose-500 fill-current" />
                    <span>Fita Mais Desejada</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCatalogFilter('movies')}
                    className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap border font-bold ${
                      catalogFilter === 'movies'
                        ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/30'
                        : 'bg-zinc-900/80 text-zinc-400 hover:text-white border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <Film className="w-3.5 h-3.5" />
                    <span>Filmes</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 font-mono">{countMovies}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCatalogFilter('series')}
                    className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap border font-bold ${
                      catalogFilter === 'series'
                        ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/30'
                        : 'bg-zinc-900/80 text-zinc-400 hover:text-white border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <Tv className="w-3.5 h-3.5" />
                    <span>Séries</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 font-mono">{countSeries}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCatalogFilter('duplicates')}
                    className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap border font-bold ${
                      catalogFilter === 'duplicates'
                        ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/30'
                        : duplicateAnalysis.totalCopiesCount > 0
                        ? 'bg-rose-950/40 text-rose-300 hover:text-white border-rose-500/40 hover:border-rose-500/70'
                        : 'bg-zinc-900/80 text-zinc-400 hover:text-white border-zinc-800 hover:border-zinc-700'
                    }`}
                    title="Exibir fitas duplicadas e repetidas adicionadas no catálogo"
                    id="btn-filter-duplicates"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Fitas Duplicadas</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                      duplicateAnalysis.totalCopiesCount > 0 
                        ? 'bg-rose-600 text-white shadow-sm' 
                        : 'bg-black/40 text-zinc-400'
                    }`}>
                      {duplicateAnalysis.totalCopiesCount}
                    </span>
                  </button>
                </div>

                {/* Barra de Seleção, Pesquisa e Ações em Lote */}
                <div ref={catalogListTopRef} className="flex flex-col md:flex-row justify-between items-center bg-zinc-900/70 border border-zinc-800/80 px-5 py-3.5 rounded-2xl gap-3 shadow-md scroll-mt-20">
                  <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full md:w-auto">
                    <label className="flex items-center gap-2 text-xs font-mono text-zinc-300 cursor-pointer select-none shrink-0 bg-zinc-950/60 px-3 py-1.5 rounded-lg border border-zinc-850">
                      <input
                        type="checkbox"
                        checked={filteredAdminMovies.length > 0 && selectedMovieIds.length === filteredAdminMovies.length}
                        onChange={() => {
                          if (selectedMovieIds.length === filteredAdminMovies.length) {
                            setSelectedMovieIds([]);
                          } else {
                            setSelectedMovieIds(filteredAdminMovies.map(m => m.id));
                          }
                        }}
                        className="rounded border-zinc-800 bg-zinc-950 text-rose-600 focus:ring-0 w-4 h-4 cursor-pointer"
                      />
                      <span>Selecionar Todos ({filteredAdminMovies.length})</span>
                    </label>
                    {selectedMovieIds.length > 0 && (
                      <span className="text-xs font-mono text-rose-400 font-bold shrink-0 bg-rose-500/10 border border-rose-500/30 px-2.5 py-1 rounded-lg">
                        {selectedMovieIds.length} selecionados
                      </span>
                    )}

                    {/* Campo de Pesquisa no Catálogo */}
                    <div className="relative flex-1 max-w-xs sm:max-w-md w-full">
                      <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Pesquisar filme ou série no catálogo..."
                        value={catalogSearchQuery}
                        onChange={e => setCatalogSearchQuery(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 focus:border-rose-500 text-xs font-mono pl-9 pr-8 py-2 rounded-xl text-white placeholder-zinc-500 focus:outline-none transition-colors shadow-inner"
                        id="input-admin-catalog-search"
                      />
                      {catalogSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setCatalogSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs font-bold font-mono px-1 cursor-pointer"
                          title="Limpar busca"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto justify-end">
                    {/* Indicador e Controle Rápido de Página Superior */}
                    {totalAdminPages > 1 && (
                      <div className="flex items-center gap-1.5 bg-zinc-950/80 border border-zinc-800 px-2.5 py-1 rounded-xl text-xs font-mono text-zinc-400">
                        <span>Pág. <strong className="text-white">{adminCatalogPage}</strong>/<strong className="text-zinc-300">{totalAdminPages}</strong></span>
                        <div className="flex items-center gap-0.5 ml-1">
                          <button
                            type="button"
                            onClick={() => handleAdminPageChange(adminCatalogPage - 1)}
                            disabled={adminCatalogPage === 1}
                            className={`p-1 rounded transition-all ${
                              adminCatalogPage === 1
                                ? 'opacity-30 cursor-not-allowed text-zinc-600'
                                : 'cursor-pointer hover:bg-zinc-800 text-zinc-300 hover:text-white'
                            }`}
                            title="Página Anterior"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAdminPageChange(adminCatalogPage + 1)}
                            disabled={adminCatalogPage === totalAdminPages}
                            className={`p-1 rounded transition-all ${
                              adminCatalogPage === totalAdminPages
                                ? 'opacity-30 cursor-not-allowed text-zinc-600'
                                : 'cursor-pointer hover:bg-zinc-800 text-zinc-300 hover:text-white'
                            }`}
                            title="Próxima Página"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}

                    {selectedMovieIds.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2">
                        {isMasterAdmin && (
                          <>
                            <button
                              onClick={() => handleBulkRecommend(true)}
                              className="text-amber-300 hover:text-black bg-amber-500/20 hover:bg-amber-400 border border-amber-500/40 font-bold font-mono text-[11px] px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                              title="Conceder Selo Oficial do Rafael a todos os selecionados"
                            >
                              <Award className="w-3.5 h-3.5 fill-current" />
                              <span>Indicar ({selectedMovieIds.length})</span>
                            </button>
                            <button
                              onClick={() => handleBulkRecommend(false)}
                              className="text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 font-mono text-[11px] px-3 py-2 rounded-xl transition-all cursor-pointer"
                              title="Remover indicação dos selecionados"
                            >
                              Desmarcar Selo
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => setSelectedMovieIds([])}
                          className="text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 font-semibold font-mono text-[11px] px-3 py-2 rounded-xl transition-all cursor-pointer shadow-sm"
                        >
                          Limpar
                        </button>
                        <button
                          onClick={() => setShowBulkDeleteConfirm(true)}
                          className="text-white bg-rose-600 hover:bg-rose-500 font-bold font-mono text-[11px] px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-rose-600/20"
                          id="btn-bulk-delete-movies"
                        >
                          <Trash className="w-3.5 h-3.5" /> Excluir ({selectedMovieIds.length})
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Banner de Controle e Ação em Lote Exclusivo da Aba de Fitas Duplicadas */}
                {catalogFilter === 'duplicates' && (
                  <div className="bg-gradient-to-r from-rose-950/60 via-zinc-900 to-rose-950/40 border border-rose-500/40 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0 mt-0.5">
                        <Copy className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-white font-bold text-sm sm:text-base">
                            {duplicateAnalysis.totalCopiesCount > 0
                              ? `${duplicateAnalysis.totalCopiesCount} ${duplicateAnalysis.totalCopiesCount === 1 ? 'Cópia Duplicada Encontrada' : 'Cópias Duplicadas Encontradas'}`
                              : 'Nenhuma Fita Duplicada Encontrada'}
                          </h3>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                            Contagem exclusiva de cópias • Original preservado
                          </span>
                        </div>
                        <p className="text-zinc-400 text-xs mt-1 leading-relaxed max-w-2xl font-sans">
                          {duplicateAnalysis.totalCopiesCount > 0
                            ? 'Esta aba lista exclusivamente as cópias adicionadas repetidamente. O título original de cada filme e série é blindado e nunca será apagado por este processo.'
                            : 'Excelente! Todas as fitas do catálogo são únicas. Nenhuma duplicata foi identificada.'}
                        </p>
                      </div>
                    </div>

                    {duplicateAnalysis.totalCopiesCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowDeleteAllDuplicatesConfirm(true)}
                        className="w-full md:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-mono text-xs font-bold transition-all shadow-lg shadow-rose-600/30 border border-rose-500/50 flex items-center justify-center gap-2 cursor-pointer shrink-0 hover:scale-[1.02] active:scale-[0.98]"
                        id="btn-delete-all-duplicates"
                        title="Excluir todas as cópias duplicadas mantendo os originais intactos"
                      >
                        <Trash className="w-4 h-4" />
                        <span>Excluir Todas as {duplicateAnalysis.totalCopiesCount} Cópias</span>
                      </button>
                    )}
                  </div>
                )}

                {filteredAdminMovies.length === 0 && (
                  <div className="p-12 text-center bg-zinc-900/30 border border-zinc-850 rounded-2xl space-y-3 font-mono">
                    {catalogFilter === 'duplicates' ? (
                      <>
                        <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                        <p className="text-sm text-zinc-200 font-bold">Nenhuma fita duplicada no acervo</p>
                        <p className="text-xs text-zinc-500">
                          Seu catálogo de filmes e séries está 100% limpo, sem cópias repetidas.
                        </p>
                      </>
                    ) : (
                      <>
                        <Search className="w-10 h-10 text-rose-500 mx-auto opacity-60" />
                        <p className="text-sm text-zinc-200 font-bold">Nenhum título encontrado</p>
                        <p className="text-xs text-zinc-500">
                          {catalogSearchQuery 
                            ? `Nenhum filme ou série corresponde à busca "${catalogSearchQuery}".`
                            : 'Nenhuma mídia corresponde ao filtro selecionado.'}
                        </p>
                      </>
                    )}
                  </div>
                )}

                {/* Grid Moderno, Animado e Amplo de Mídias Cadastradas (Paginado de 50 em 50) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {paginatedAdminMovies.map(movie => {
                    const isSelected = selectedMovieIds.includes(movie.id);
                    const isPinned = pinnedMostDesiredId === movie.id;
                    const isRec = Boolean(movie.isRecommended);
                    const isDuplicateCopy = duplicateAnalysis.duplicateCopyIds.has(movie.id);
                    const dupInfo = isDuplicateCopy ? duplicateAnalysis.copyToOriginalMap.get(movie.id) : null;

                    return (
                      <div 
                        key={movie.id}
                        className={`rounded-2xl border overflow-hidden flex shadow-lg transition-all duration-300 group hover:-translate-y-1 hover:shadow-2xl ${
                          isSelected 
                            ? 'border-rose-500 bg-zinc-900/90 ring-2 ring-rose-500/40 shadow-rose-950/40' 
                            : isDuplicateCopy
                            ? 'bg-gradient-to-br from-zinc-950 via-zinc-950 to-rose-950/30 border-rose-500/50 hover:border-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.1)] ring-1 ring-rose-500/20'
                            : isRec
                            ? 'bg-gradient-to-br from-zinc-950 via-zinc-950 to-amber-950/20 border-amber-500/40 hover:border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.08)]'
                            : isPinned
                            ? 'bg-gradient-to-br from-zinc-950 via-zinc-950 to-rose-950/20 border-rose-500/40 hover:border-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.1)]'
                            : 'bg-zinc-950 border-zinc-850/80 hover:border-zinc-700 hover:shadow-xl'
                        }`}
                      >
                        <div className="w-32 flex-shrink-0 bg-zinc-900 relative overflow-hidden">
                          <img 
                            src={movie.posterUrl} 
                            alt={movie.title} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                            referrerPolicy="no-referrer"
                            onError={handlePosterError}
                          />

                          {/* Checkbox Overlay */}
                          <div className="absolute top-2 right-2 z-10 bg-black/70 p-1 rounded-lg backdrop-blur-md border border-white/10">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                if (isSelected) {
                                  setSelectedMovieIds(prev => prev.filter(id => id !== movie.id));
                                } else {
                                  setSelectedMovieIds(prev => [...prev, movie.id]);
                                }
                              }}
                              className="rounded border-zinc-750 bg-zinc-950 text-rose-600 focus:ring-0 w-4 h-4 cursor-pointer"
                              title="Selecionar esta mídia"
                            />
                          </div>

                          {/* Badge de Cópia Duplicada no Poster */}
                          {isDuplicateCopy && (
                            <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-rose-600 text-white px-1.5 py-0.5 rounded-md text-[9px] font-black font-mono uppercase tracking-wider shadow-md backdrop-blur-sm border border-rose-400/50">
                              <Copy className="w-3 h-3" />
                              <span>Cópia #{dupInfo?.copyIndex}</span>
                            </div>
                          )}

                          {/* Selo de Recomendação Oficial Rafael no Poster */}
                          {!isDuplicateCopy && isRec && (
                            <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-amber-500/90 text-black px-1.5 py-0.5 rounded-md text-[9px] font-black font-sans uppercase tracking-wider shadow-md backdrop-blur-sm">
                              <Award className="w-3 h-3 fill-black" />
                              <span>Indicado</span>
                            </div>
                          )}

                          {/* Badge de Fita Mais Desejada no Poster */}
                          {!isDuplicateCopy && isPinned && !isRec && (
                            <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-rose-600/95 text-white px-1.5 py-0.5 rounded-md text-[9px] font-black font-sans uppercase tracking-wider shadow-md backdrop-blur-sm">
                              <Flame className="w-3 h-3 fill-white" />
                              <span>Fixada</span>
                            </div>
                          )}

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
                                className="absolute bottom-2 left-2 w-3.5 h-3.5 rounded-full border-2 border-zinc-950 shadow-md" 
                                style={{ backgroundColor: finalTapeColor }}
                                title={`Cor do VHS / Categoria: ${movie.category}`}
                              />
                            );
                          })()}
                        </div>

                        <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-[9px] font-mono border px-1.5 py-0.5 rounded-md uppercase font-bold ${
                                movie.type === 'movie' 
                                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' 
                                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              }`}>
                                {movie.type === 'movie' ? 'Filme' : 'Série'}
                              </span>
                              <span className="text-[10px] text-zinc-300 font-mono font-bold uppercase">{movie.category}</span>
                            </div>
                            <h4 className="font-bold text-sm text-white mt-1.5 line-clamp-1 font-sans">{movie.title}</h4>
                            <p className="text-zinc-400 text-[11px] font-mono mt-0.5">{movie.year} • {movie.duration}</p>

                            {/* Destaque de Fita Duplicada / Cópia */}
                            {isDuplicateCopy && dupInfo && (
                              <div className="mt-2 bg-rose-500/15 border border-rose-500/35 text-rose-300 px-2.5 py-1.5 rounded-lg text-[10px] font-mono flex flex-col gap-0.5 shadow-sm">
                                <div className="flex items-center justify-between font-bold">
                                  <span className="flex items-center gap-1 text-rose-400">
                                    <Copy className="w-3 h-3" />
                                    Cópia Duplicada ({dupInfo.copyIndex} de {dupInfo.totalInGroup - 1})
                                  </span>
                                  <span className="text-[9px] bg-rose-600/30 border border-rose-500/40 px-1 py-0.2 rounded text-rose-200">
                                    Repetida
                                  </span>
                                </div>
                                <span className="text-[9px] text-zinc-400 truncate">
                                  Original seguro: <strong className="text-zinc-200 font-sans">{dupInfo.original.title}</strong>
                                </span>
                              </div>
                            )}

                            <p className="text-zinc-400 text-xs mt-2 line-clamp-2 leading-relaxed">{movie.description}</p>
                          </div>

                          {/* Ações Rápidas com Botão de Selo de Recomendação Oficial */}
                          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-zinc-850/80 font-mono text-[11px]">
                            <span className="text-yellow-400 font-bold flex items-center gap-1">
                              <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" /> {movie.rating}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {/* Botão de Selo de Recomendação do Administrador Rafael */}
                              <button
                                type="button"
                                onClick={() => handleToggleRecommend(movie)}
                                className={`px-2 py-1 rounded-lg transition-all text-[10px] font-mono flex items-center gap-1 cursor-pointer border ${
                                  movie.isRecommended
                                    ? 'text-amber-300 bg-amber-500/25 border-amber-400/60 font-bold shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                                    : 'text-zinc-400 hover:text-amber-300 border-zinc-800 hover:border-amber-500/40 bg-zinc-900/60'
                                }`}
                                title={movie.isRecommended ? "Remover Selo de Recomendação do Rafael" : "Conceder Selo de Recomendação Oficial (Rafael)"}
                                id={`btn-recommend-movie-${movie.id}`}
                              >
                                <Award className={`w-3 h-3 ${movie.isRecommended ? 'fill-current text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.8)]' : ''}`} />
                                <span>{movie.isRecommended ? 'Indicado' : 'Indicar'}</span>
                              </button>

                              {/* Botão de Fixar / Desfixar como Fita Mais Desejada */}
                              <button
                                type="button"
                                onClick={() => onTogglePinMostDesired?.(pinnedMostDesiredId === movie.id ? null : movie.id)}
                                className={`px-2 py-1 rounded-lg transition-all text-[10px] font-mono flex items-center gap-1 cursor-pointer border ${
                                  pinnedMostDesiredId === movie.id
                                    ? 'text-rose-300 bg-rose-500/20 border-rose-500/50 font-bold shadow-sm'
                                    : 'text-zinc-400 hover:text-rose-400 border-zinc-800 hover:border-zinc-700 bg-zinc-900/60'
                                }`}
                                title={pinnedMostDesiredId === movie.id ? "Desfixar Fita Mais Desejada" : "Fixar como Fita VHS Mais Desejada"}
                              >
                                <Flame className={`w-3 h-3 ${pinnedMostDesiredId === movie.id ? 'fill-current text-rose-500 animate-pulse' : ''}`} />
                                <span>{pinnedMostDesiredId === movie.id ? 'Fixada' : 'Fixar'}</span>
                              </button>

                              <button
                                onClick={() => handleOpenEditForm(movie)}
                                className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-850 transition-colors border border-transparent hover:border-zinc-750 cursor-pointer"
                                title="Editar mídias"
                                id={`btn-edit-movie-${movie.id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </button>

                              {isDuplicateCopy ? (
                                <button
                                  type="button"
                                  onClick={() => setMovieToDelete(movie)}
                                  className="text-white bg-rose-600 hover:bg-rose-700 font-bold px-2 py-1 rounded-lg text-[10px] font-mono flex items-center gap-1 cursor-pointer shadow-md shadow-rose-600/30 transition-all hover:scale-[1.02] border border-rose-500/50"
                                  title="Excluir esta cópia duplicada (o original continuará salvo)"
                                  id={`btn-delete-duplicate-copy-${movie.id}`}
                                >
                                  <Trash className="w-3.5 h-3.5" />
                                  <span>Excluir Cópia</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => setMovieToDelete(movie)}
                                  className="text-zinc-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-950/30 transition-colors border border-transparent hover:border-rose-500/30 cursor-pointer"
                                  title="Excluir do catálogo"
                                  id={`btn-delete-movie-${movie.id}`}
                                >
                                  <Trash className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Controles de Paginação Moderna de 50 em 50 para o Catálogo de Mídias */}
                {totalAdminPages > 1 && (
                  <div className="mt-8 pt-6 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 font-sans bg-zinc-900/40 p-4 sm:p-5 rounded-2xl border border-zinc-850">
                    <div className="text-xs text-zinc-400 font-mono text-center sm:text-left">
                      Exibindo <span className="text-white font-bold">{(adminCatalogPage - 1) * ITEMS_PER_ADMIN_PAGE + 1}–{Math.min(adminCatalogPage * ITEMS_PER_ADMIN_PAGE, filteredAdminMovies.length)}</span> de <span className="text-rose-400 font-bold">{filteredAdminMovies.length}</span> títulos
                      <span className="mx-2 text-zinc-700">•</span>
                      Página <span className="text-white font-bold">{adminCatalogPage}</span> de <span className="text-zinc-400 font-bold">{totalAdminPages}</span>
                      <span className="ml-2 text-[10px] text-zinc-500 font-mono hidden md:inline">(50 títulos por página)</span>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-center">
                      {/* Botão Anterior */}
                      <button
                        type="button"
                        onClick={() => handleAdminPageChange(adminCatalogPage - 1)}
                        disabled={adminCatalogPage === 1}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border select-none font-mono ${
                          adminCatalogPage === 1
                            ? 'opacity-30 cursor-not-allowed bg-zinc-950/60 border-zinc-900 text-zinc-600'
                            : 'cursor-pointer bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border-zinc-800 hover:border-zinc-700 shadow-sm'
                        }`}
                        id="btn-admin-prev-page"
                        title="Página Anterior"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span className="hidden xs:inline">Anterior</span>
                      </button>

                      {/* Botões Numéricos de Páginas */}
                      {(() => {
                        const pages: (number | 'ellipsis-prev' | 'ellipsis-next')[] = [];
                        if (totalAdminPages <= 7) {
                          for (let i = 1; i <= totalAdminPages; i++) pages.push(i);
                        } else {
                          pages.push(1);
                          if (adminCatalogPage > 3) {
                            pages.push('ellipsis-prev');
                          }
                          const start = Math.max(2, adminCatalogPage - 1);
                          const end = Math.min(totalAdminPages - 1, adminCatalogPage + 1);
                          for (let i = start; i <= end; i++) {
                            if (!pages.includes(i)) pages.push(i);
                          }
                          if (adminCatalogPage < totalAdminPages - 2) {
                            pages.push('ellipsis-next');
                          }
                          if (!pages.includes(totalAdminPages)) {
                            pages.push(totalAdminPages);
                          }
                        }

                        return pages.map((p, idx) => {
                          if (typeof p === 'string') {
                            return (
                              <span key={`ell-admin-${idx}`} className="px-1.5 sm:px-2 py-1 text-zinc-600 font-mono text-xs select-none">
                                •••
                              </span>
                            );
                          }

                          const isActive = p === adminCatalogPage;
                          return (
                            <button
                              key={p}
                              type="button"
                              onClick={() => handleAdminPageChange(p)}
                              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center border cursor-pointer select-none ${
                                isActive
                                  ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/30 font-black'
                                  : 'bg-zinc-950/80 hover:bg-zinc-800 border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white'
                              }`}
                              id={`btn-admin-page-${p}`}
                              aria-label={`Ir para a página ${p}`}
                            >
                              {p}
                            </button>
                          );
                        });
                      })()}

                      {/* Botão Próxima */}
                      <button
                        type="button"
                        onClick={() => handleAdminPageChange(adminCatalogPage + 1)}
                        disabled={adminCatalogPage === totalAdminPages}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border select-none font-mono ${
                          adminCatalogPage === totalAdminPages
                            ? 'opacity-30 cursor-not-allowed bg-zinc-950/60 border-zinc-900 text-zinc-600'
                            : 'cursor-pointer bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border-zinc-800 hover:border-zinc-700 shadow-sm'
                        }`}
                        id="btn-admin-next-page"
                        title="Próxima Página"
                      >
                        <span className="hidden xs:inline">Próxima</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* FORMULÁRIO DE EDIÇÃO / ADIÇÃO ESTILO ESTUDIO RETRO MODERNIZADO */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Lado Esquerdo: Buscador e Importador de Metadados do TMDB */}
                <div className="lg:col-span-5 bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-5 md:p-6 space-y-5 shadow-xl">
                  <div className="border-b border-zinc-800 pb-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-base text-rose-500 font-display flex items-center gap-2 uppercase tracking-tight">
                        <Download className="w-4.5 h-4.5" /> Importar do TMDB API
                      </h3>
                      <span className="text-[9px] font-mono uppercase bg-rose-500/15 border border-rose-500/30 text-rose-400 px-2 py-0.5 rounded-full font-bold">
                        Auto Reconhecimento
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                      Pesquise filmes, séries ou animes. O sistema detectará automaticamente se o título já consta no acervo para evitar duplicações.
                    </p>
                  </div>

                  {/* Input de Busca TMDB */}
                  <form onSubmit={handleTMDBSearch} className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder="Ex: Matrix, Jurassic Park, Breaking Bad..."
                        value={tmdbSearchQuery}
                        onChange={e => setTmdbSearchQuery(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 rounded-xl text-xs text-white placeholder-zinc-500 focus:ring-1 focus:ring-rose-500 focus:outline-none font-sans shadow-inner"
                      />
                      {tmdbSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setTmdbSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={isSearchingTMDB}
                      className="bg-rose-600 hover:bg-rose-500 font-semibold text-xs text-white px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-rose-600/20 active:scale-95 cursor-pointer shrink-0"
                    >
                      {isSearchingTMDB ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                      <span>Buscar</span>
                    </button>
                  </form>

                  {/* Lista de Resultados da Busca para Importar com Detecção de Duplicidade */}
                  <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1.5 custom-scrollbar">
                    {tmdbError && <p className="text-rose-400 text-xs font-semibold text-center font-mono py-2">{tmdbError}</p>}
                    {isSearchingTMDB && (
                      <div className="flex justify-center items-center py-8 font-mono text-xs text-zinc-400">
                        <RefreshCw className="w-4 h-4 text-rose-500 animate-spin mr-2" />
                        <span>Carregando dados e consultando acervo...</span>
                      </div>
                    )}
                    
                    {tmdbSearchResults.map((result, idx) => {
                      const name = result.title || result.name || 'Título Sem Nome';
                      const year = result.release_date ? result.release_date.split('-')[0] : (result.first_air_date ? result.first_air_date.split('-')[0] : '????');
                      const mediaType: 'movie' | 'series' = (result.media_type === 'tv' || Boolean(result.first_air_date)) ? 'series' : 'movie';
                      const existingDup = findDuplicateMovie(name, result.id, editingMovie?.id, year !== '????' ? year : undefined, mediaType);
                      
                      return (
                        <div 
                          key={result.id || idx}
                          className={`p-3 rounded-xl border flex justify-between items-center gap-3 transition-all ${
                            existingDup 
                              ? 'bg-amber-950/20 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.06)]' 
                              : 'bg-zinc-950/80 border-zinc-800/80 hover:border-rose-500/50 hover:bg-zinc-950'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {result.poster_path ? (
                              <img 
                                src={getCleanPosterUrl(result.poster_path)} 
                                alt={name} 
                                className="w-9 h-13 object-cover rounded-lg border border-zinc-800 shrink-0 shadow"
                                referrerPolicy="no-referrer"
                                onError={handlePosterError}
                              />
                            ) : (
                              <div className="w-9 h-13 bg-zinc-900 rounded-lg flex items-center justify-center text-[8px] font-mono text-zinc-500 shrink-0">SEM CAPA</div>
                            )}
                            <div className="min-w-0 text-[11px] leading-tight space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-zinc-100 truncate block text-xs">{name}</span>
                                {existingDup && (
                                  <span className="text-[8px] font-mono font-bold bg-amber-500/25 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded uppercase flex items-center gap-0.5 shadow-xs">
                                    <Check className="w-2.5 h-2.5 text-amber-400" /> No Acervo ({existingDup.year})
                                  </span>
                                )}
                              </div>
                              <span className="text-zinc-400 font-mono text-[10px] block">
                                {year} • ★ {result.vote_average ? result.vote_average.toFixed(1) : 'N/D'} • {result.media_type === 'tv' ? 'Série' : 'Filme'}
                              </span>
                              {existingDup && (
                                <span className="text-[9px] text-amber-400/90 font-mono block">
                                  Cadastrado no catálogo como: "{existingDup.title}" ({existingDup.year})
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => handleImportTMDBMovie(result.id, result.media_type || 'movie')}
                            className={`text-[10px] font-bold px-3 py-2 rounded-xl transition-all font-mono uppercase flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm ${
                              existingDup
                                ? 'bg-amber-950/40 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/40'
                                : 'bg-zinc-900 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30'
                            }`}
                            title={existingDup ? "Título já existe no acervo. Clique para reimportar/atualizar campos" : "Importar ficha do TMDB"}
                          >
                            <Import className="w-3.5 h-3.5" />
                            <span>{existingDup ? 'Atualizar' : 'AutoFill'}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Lado Direito: Formulário Principal de Edição / Cadastro Manual */}
                <div id="movie-form-section" className="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 md:p-7 shadow-xl">
                  <div className="border-b border-zinc-800 pb-4 mb-5 flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-base text-white font-display uppercase tracking-tight flex items-center gap-2">
                        <Film className="w-4.5 h-4.5 text-rose-500" />
                        {editingMovie ? 'Editar Dados da Fita' : 'Cadastrar Registro Manual'}
                      </h3>
                      <p className="text-xs text-zinc-400 font-mono mt-0.5">
                        {editingMovie ? `Modificando fita #${editingMovie.id}` : 'Preencha os campos abaixo para cadastrar nova fita no acervo.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsFormOpen(false)}
                      className="text-xs font-mono text-zinc-400 hover:text-white bg-zinc-950 border border-zinc-800 hover:border-zinc-700 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer"
                    >
                      Voltar ao catálogo
                    </button>
                  </div>

                  {/* RECONHECIMENTO INFORMATIVO DO TÍTULO NO ACERVO */}
                  {(() => {
                    const existingDup = findDuplicateMovie(formTitle, formTmdbId, editingMovie?.id);
                    if (!existingDup || !formTitle.trim()) return null;
                    return (
                      <div className="mb-5 p-3.5 bg-blue-950/30 border border-blue-500/40 rounded-2xl text-blue-300 text-xs flex items-start gap-3 shadow-lg animate-fade-in backdrop-blur-md">
                        <div className="p-1.5 rounded-xl bg-blue-500/20 text-blue-400 shrink-0 mt-0.5 border border-blue-500/30">
                          <Check className="w-4 h-4" />
                        </div>
                        <div className="flex-1 space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-blue-200 text-xs">Identificado no Catálogo</span>
                            <span className="text-[9px] font-mono bg-blue-500/20 px-2 py-0.2 rounded-full text-blue-300 font-bold border border-blue-500/30">
                              {existingDup.type === 'series' ? 'SÉRIE' : 'FILME'}
                            </span>
                          </div>
                          <p className="text-zinc-300 text-[11px] leading-relaxed">
                            "{existingDup.title}" ({existingDup.year}). Você pode salvar para atualizar episódios/links ou gravar uma nova versão normalmente.
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Notificação de Sucesso ao Adicionar */}
                  {movieAddSuccessMsg && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-5 p-4 bg-emerald-950/90 border border-emerald-500/60 rounded-2xl text-emerald-200 text-xs flex items-center justify-between gap-3 shadow-xl backdrop-blur-md"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                          <Check className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div>
                          <p className="font-bold text-white text-xs">{movieAddSuccessMsg}</p>
                          <p className="text-[10px] text-emerald-300/80 font-mono mt-0.5">O formulário foi limpo automaticamente para você cadastrar a próxima fita.</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setMovieAddSuccessMsg(null)}
                        className="text-emerald-400 hover:text-white text-xs font-bold px-2.5 py-1 bg-emerald-900/60 rounded-lg border border-emerald-500/30 transition-colors cursor-pointer shrink-0"
                      >
                        ✕
                      </button>
                    </motion.div>
                  )}

                  <form onSubmit={handleSubmitForm} className="space-y-4 text-xs font-mono">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Título */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-zinc-300 font-bold uppercase tracking-wider text-[10px]">Título do Filme ou Série</label>
                        <input
                          type="text"
                          required
                          value={formTitle}
                          onChange={e => setFormTitle(e.target.value)}
                          placeholder="Ex: De Volta Para o Futuro"
                          className="w-full bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-rose-500 text-white font-sans"
                        />
                      </div>

                      {/* Categoria do VHSFLIX */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-zinc-300 font-bold uppercase tracking-wider text-[10px]">Categoria / Prateleira</label>
                        <select
                          value={formCategory}
                          onChange={e => setFormCategory(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-rose-500 text-white cursor-pointer"
                        >
                          {GENRE_CATEGORIES.filter(c => c !== 'Todos').map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Descrição Sinopse */}
                    <div className="flex flex-col gap-1.5 font-sans">
                      <label className="text-zinc-300 font-mono font-bold uppercase tracking-wider text-[10px]">Sinopse / Descrição Completa</label>
                      <textarea
                        required
                        rows={3}
                        value={formDescription}
                        onChange={e => setFormDescription(e.target.value)}
                        placeholder="Narre a incrível trama histórica do filme ou série..."
                        className="w-full bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-rose-500 text-sm font-sans text-white leading-relaxed"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Tipo */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-zinc-300 font-bold uppercase tracking-wider text-[10px]">Tipo de Mídia</label>
                        <div className="flex bg-zinc-950 p-1.5 rounded-xl border border-zinc-800 items-center justify-around">
                          <label className="flex items-center gap-1.5 cursor-pointer select-none font-sans font-semibold text-xs text-zinc-300">
                            <input
                              type="radio"
                              name="media_type"
                              checked={formType === 'movie'}
                              onChange={() => setFormType('movie')}
                              className="accent-rose-600 cursor-pointer"
                            />
                            Filme (VHS)
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer select-none font-sans font-semibold text-xs text-zinc-300">
                            <input
                              type="radio"
                              name="media_type"
                              checked={formType === 'series'}
                              onChange={() => setFormType('series')}
                              className="accent-rose-600 cursor-pointer"
                            />
                            Série (VCR)
                          </label>
                        </div>
                      </div>

                      {/* Ano */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-zinc-300 font-bold uppercase tracking-wider text-[10px]">Ano de Lançamento</label>
                        <input
                          type="number"
                          required
                          value={formYear}
                          onChange={e => setFormYear(parseInt(e.target.value) || 1990)}
                          className="w-full bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 rounded-xl text-center focus:outline-none focus:border-rose-500 text-white font-mono"
                        />
                      </div>

                      {/* Duração */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-zinc-300 font-bold uppercase tracking-wider text-[10px]">Duração / Extensão</label>
                        <input
                          type="text"
                          required
                          value={formDuration}
                          onChange={e => setFormDuration(e.target.value)}
                          placeholder="Ex: 1h 50m ou 3 Temporadas"
                          className="w-full bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 rounded-xl text-center focus:outline-none focus:border-rose-500 text-white font-mono"
                        />
                      </div>
                    </div>

                    {/* Capas e Backdrops */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* URL Poster */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-zinc-300 font-bold uppercase tracking-wider text-[10px]">URL Capa Poster (Retrato 2:3)</label>
                        <input
                          type="text"
                          value={formPosterUrl}
                          onChange={e => setFormPosterUrl(e.target.value)}
                          placeholder="https://image.tmdb.org/..."
                          className="w-full bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-rose-500 text-white font-mono text-xs"
                        />
                      </div>

                      {/* URL Backdrop */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-zinc-300 font-bold uppercase tracking-wider text-[10px]">URL Fundo Backdrop (Widescreen 16:9)</label>
                        <input
                          type="text"
                          value={formBackdropUrl}
                          onChange={e => setFormBackdropUrl(e.target.value)}
                          placeholder="https://image.tmdb.org/..."
                          className="w-full bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-rose-500 text-white font-mono text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Nota Rating */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-zinc-300 font-bold uppercase tracking-wider text-[10px]">Nota de Avaliação (0 a 10)</label>
                        <input
                          type="number"
                          step="0.1"
                          required
                          value={formRating}
                          onChange={e => setFormRating(parseFloat(e.target.value) || 7.0)}
                          className="w-full bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 rounded-xl text-center focus:outline-none focus:border-rose-500 text-white font-mono"
                        />
                      </div>

                      {/* Link Trailer Youtube */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-zinc-300 font-bold uppercase tracking-wider text-[10px]">Embed YouTube Trailer URL</label>
                        <input
                          type="text"
                          required
                          value={formTrailerUrl}
                          onChange={e => setFormTrailerUrl(e.target.value)}
                          placeholder="https://www.youtube.com/embed/..."
                          className="w-full bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-rose-500 text-white font-mono text-xs"
                        />
                      </div>
                    </div>

                    {/* GERENCIADOR DE TEMPORADAS & EPISÓDIOS (APENAS PARA SÉRIE) */}
                    {formType === 'series' && (
                      <div className="flex flex-col gap-3.5 bg-zinc-950/60 p-4 border border-zinc-800 rounded-2xl">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-2.5 gap-2">
                          <label className="text-zinc-300 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span> Gerenciador de Temporadas & Episódios ({Object.keys(formSeasonsConfig).length} Temporadas)
                          </label>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleSyncAllSeriesEpisodesWithAbyss}
                              disabled={isSearchingAbyss || !formTitle.trim()}
                              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-[10px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow"
                              title="Sintonizar e buscar links de todos os episódios de todas as temporadas no Abyss"
                            >
                              {isSearchingAbyss ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 fill-current" />}
                              <span>Sintonizar Todas as Temporadas no Abyss</span>
                            </button>
                            <span className="text-[9px] text-rose-400 font-mono font-bold bg-rose-950/50 border border-rose-500/20 px-2 py-0.5 rounded-full">ABYSS AUTO</span>
                          </div>
                        </div>

                        {/* Abas das Temporadas */}
                        <div className="flex flex-wrap gap-2 border-b border-zinc-850/60 pb-2.5">
                          {Object.keys(formSeasonsConfig).map(Number).sort((a,b)=>a-b).map(sNum => (
                            <button
                              key={sNum}
                              type="button"
                              onClick={() => setActiveConfigSeason(sNum)}
                              className={`px-3 py-1.5 text-[10px] font-bold rounded-xl cursor-pointer transition-all uppercase tracking-wider font-mono ${
                                activeConfigSeason === sNum
                                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/25 border border-rose-500/35'
                                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                              }`}
                            >
                              Temp {sNum}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              const nextSeason = Math.max(...Object.keys(formSeasonsConfig).map(Number), 0) + 1;
                              setFormSeasonsConfig(prev => ({ ...prev, [nextSeason]: 8 }));
                              setActiveConfigSeason(nextSeason);
                            }}
                            className="px-3 py-1.5 text-[10px] font-mono font-bold rounded-xl bg-zinc-900 border border-zinc-800 text-rose-400 hover:bg-zinc-850 hover:text-rose-300 cursor-pointer transition-all flex items-center gap-1 uppercase tracking-wider"
                          >
                            + Add Temp
                          </button>
                          {Object.keys(formSeasonsConfig).length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const keys = Object.keys(formSeasonsConfig).map(Number).sort((a,b)=>a-b);
                                const last = keys[keys.length - 1];
                                const updated = { ...formSeasonsConfig };
                                delete updated[last];
                                setFormSeasonsConfig(updated);
                                if (activeConfigSeason === last) {
                                  setActiveConfigSeason(keys[keys.length - 2]);
                                }
                              }}
                              className="px-3 py-1.5 text-[10px] font-mono font-bold rounded-xl bg-zinc-950 border border-zinc-850 text-zinc-500 hover:text-rose-400 hover:bg-zinc-900 cursor-pointer transition-all uppercase tracking-wider"
                            >
                              - Excluir Última Temp
                            </button>
                          )}
                        </div>

                        {/* Configuração da Temporada Ativa */}
                        <div className="space-y-3 bg-zinc-950/80 p-3.5 rounded-xl border border-zinc-850">
                          <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono font-bold uppercase tracking-wider">
                            <span>Temporada {activeConfigSeason}: {(formSeasonsConfig[activeConfigSeason] || 0)} Episódios</span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] text-zinc-500">Mudar Total:</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const currentEps = formSeasonsConfig[activeConfigSeason] || 0;
                                  if (currentEps > 1) {
                                    setFormSeasonsConfig(prev => ({ ...prev, [activeConfigSeason]: currentEps - 1 }));
                                  }
                                }}
                                className="w-6 h-6 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-rose-500 flex items-center justify-center font-bold text-sm cursor-pointer transition-colors"
                              >
                                -
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const currentEps = formSeasonsConfig[activeConfigSeason] || 0;
                                  setFormSeasonsConfig(prev => ({ ...prev, [activeConfigSeason]: currentEps + 1 }));
                                }}
                                className="w-6 h-6 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-rose-500 flex items-center justify-center font-bold text-sm cursor-pointer transition-colors"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* Listagem de Episódios com Inputs para Embed URL */}
                          <div className="max-h-[300px] overflow-y-auto pr-1 space-y-2.5 divide-y divide-zinc-900/60 custom-scrollbar">
                            {Array.from({ length: formSeasonsConfig[activeConfigSeason] || 0 }, (_, i) => i + 1).map(epNum => {
                              const key = `${activeConfigSeason}_${epNum}`;
                              return (
                                <div key={epNum} className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2.5 first:pt-0 border-zinc-900/40">
                                  <span className="text-[10px] font-mono font-bold text-zinc-400 min-w-[100px] uppercase tracking-wider">
                                    Episódio {epNum.toString().padStart(2, '0')}
                                  </span>
                                  <div className="flex items-center gap-1.5 flex-1">
                                    <input
                                      type="text"
                                      value={formEpisodeEmbeds[key] || ''}
                                      onChange={e => {
                                        const val = e.target.value;
                                        setFormEpisodeEmbeds(prev => ({ ...prev, [key]: val }));
                                      }}
                                      placeholder="https://..."
                                      className="flex-1 bg-zinc-950 border border-zinc-850 px-3 py-1.5 rounded-lg focus:outline-none focus:border-rose-500 text-xs text-zinc-100 font-mono placeholder-zinc-700"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleManualAbyssEpisodeSearch(activeConfigSeason, epNum)}
                                      disabled={isSearchingAbyss || !formTitle.trim()}
                                      className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-rose-400 hover:text-rose-300 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0"
                                      title="Pesquisar episódio no Abyss"
                                    >
                                      <Search className="w-2.5 h-2.5" />
                                      <span>Abyss</span>
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Selo de Recomendação Oficial do Administrador Rafael */}
                    <div className="bg-gradient-to-r from-amber-950/30 via-zinc-950 to-amber-950/20 border border-amber-500/40 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
                      <div className="flex items-start gap-3">
                        <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-400/50 text-amber-400 shrink-0 mt-0.5 shadow-[0_0_12px_rgba(245,158,11,0.3)]">
                          <Award className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-black uppercase tracking-wider text-amber-300 font-sans flex items-center gap-1.5">
                              Selo de Recomendação Oficial VHSFLIX
                            </h4>
                            <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                              Exclusivo Rafael
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                            Destaca este título com o selo dourado de garantia em todas as capas, na Minha Lista e no banner principal.
                          </p>
                        </div>
                      </div>

                      <label className="flex items-center gap-2.5 cursor-pointer bg-zinc-900/90 hover:bg-zinc-900 px-4 py-2.5 rounded-xl border border-amber-500/40 shrink-0 transition-all shadow-sm">
                        <input
                          type="checkbox"
                          checked={formIsRecommended}
                          disabled={!isMasterAdmin}
                          onChange={e => {
                            if (!isMasterAdmin) {
                              alert('Apenas o Administrador Master (Rafael Gusmão) tem permissão para conceder o Selo de Recomendação.');
                              return;
                            }
                            setFormIsRecommended(e.target.checked);
                          }}
                          className="rounded border-amber-500/60 bg-zinc-950 text-amber-500 focus:ring-amber-400 w-4 h-4 cursor-pointer"
                        />
                        <span className="text-xs font-bold font-mono text-amber-300 select-none">
                          {formIsRecommended ? 'Selo Concedido ⭐' : 'Sem Selo'}
                        </span>
                      </label>
                    </div>

                    {/* Botões de Ação do Forms */}
                    <div className="flex gap-3 justify-end pt-5 border-t border-zinc-800">
                      <button
                        type="button"
                        onClick={resetForm}
                        className="px-4 py-2.5 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer border border-zinc-800 font-mono text-xs"
                      >
                        Limpar Campos
                      </button>
                      <button
                        type="submit"
                        className="bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-rose-950/40 cursor-pointer text-xs font-mono flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        <span>{editingMovie ? 'Salvar Alterações' : 'Gravar no Acervo'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- ABA CENTRAL DE DIVULGAÇÃO VHSFLIX --- */}
        {activeAdminTab === 'promotion' && (
          <motion.div 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="space-y-6"
          >
            <PromotionCenter movies={movies} tmdbApiKey={tmdbApiKey} />
          </motion.div>
        )}

        {/* --- ABA 2: USUÁRIOS REGISTRADOS (ANIMAÇÕES PROFISSIONAIS E TIPOGRAFIA DE ALTO CONTRASTE) --- */}
        {activeAdminTab === 'users' && (
          <motion.div 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="space-y-6"
          >
            
            {/* Lista Completa de Usuários e Estatísticas Gerais com Stagger Hover */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <motion.div 
                whileHover={{ y: -3, transition: { duration: 0.2 } }}
                className="bg-gradient-to-b from-zinc-900 via-zinc-900/90 to-zinc-950 border border-zinc-800/90 hover:border-rose-500/40 p-5 rounded-2xl shadow-xl relative overflow-hidden group transition-all"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-rose-600/10 rounded-full blur-xl pointer-events-none group-hover:bg-rose-600/20 transition-all" />
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-zinc-400 font-mono uppercase font-bold tracking-wider">Total de Contas</span>
                    <p className="text-3xl font-black font-display text-white mt-1.5 tracking-tight">{users.length}</p>
                    <p className="text-xs text-rose-400 font-mono mt-1 font-semibold">Titulares Registrados</p>
                  </div>
                  <div className="p-2.5 bg-rose-500/15 border border-rose-500/30 text-rose-500 rounded-xl shadow-inner">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
              </motion.div>

              <motion.div 
                whileHover={{ y: -3, transition: { duration: 0.2 } }}
                className="bg-gradient-to-b from-zinc-900 via-zinc-900/90 to-zinc-950 border border-zinc-800/90 hover:border-emerald-500/40 p-5 rounded-2xl shadow-xl relative overflow-hidden group transition-all"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-600/10 rounded-full blur-xl pointer-events-none group-hover:bg-emerald-600/20 transition-all" />
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-zinc-400 font-mono uppercase font-bold tracking-wider">Subperfis Ativos</span>
                    <p className="text-3xl font-black font-display text-emerald-400 mt-1.5 tracking-tight">
                      {Object.values(allProfiles).reduce((acc, pList) => acc + pList.length, 0)}
                    </p>
                    <p className="text-xs text-emerald-400/80 font-mono mt-1 font-semibold">Navegando independentemente</p>
                  </div>
                  <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-xl shadow-inner">
                    <Shield className="w-5 h-5" />
                  </div>
                </div>
              </motion.div>

              <motion.div 
                whileHover={{ y: -3, transition: { duration: 0.2 } }}
                className="bg-gradient-to-b from-zinc-900 via-zinc-900/90 to-zinc-950 border border-zinc-800/90 hover:border-amber-500/40 p-5 rounded-2xl shadow-xl relative overflow-hidden group transition-all"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-600/10 rounded-full blur-xl pointer-events-none group-hover:bg-amber-600/20 transition-all" />
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-zinc-400 font-mono uppercase font-bold tracking-wider">Fitas Salvas</span>
                    <p className="text-3xl font-black font-display text-amber-400 mt-1.5 tracking-tight">
                      {Object.values(allProfiles).reduce((acc, pList) => acc + pList.reduce((accP, p) => accP + p.myList.length, 0), 0)}
                    </p>
                    <p className="text-xs text-amber-400/80 font-mono mt-1 font-semibold">Favoritos nos perfis</p>
                  </div>
                  <div className="p-2.5 bg-amber-500/15 border border-amber-500/30 text-amber-400 rounded-xl shadow-inner">
                    <Star className="w-5 h-5" />
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Container Principal da Tabela de Usuários com Barra de Pesquisa */}
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
              <div className="px-6 py-5 border-b border-zinc-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-zinc-950/50">
                <div>
                  <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-400 text-[10px] font-mono font-bold tracking-wider uppercase mb-1">
                    Gerenciamento de Assinantes
                  </div>
                  <h3 className="font-bold text-xl text-white font-display flex items-center gap-2">
                    <Users className="w-5 h-5 text-rose-500" /> Banco de Contas & Espectadores
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5 font-sans">Gerencie os acessos, senhas, tempos de expiração e subperfis de cada família.</p>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                  {/* Campo de Busca Rápida de Usuários */}
                  <div className="relative flex-1 md:w-64">
                    <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Buscar por nome, email ou ID..."
                      value={userSearchQuery}
                      onChange={e => setUserSearchQuery(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 pl-9 pr-7 py-2.5 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 font-mono transition-all shadow-inner"
                    />
                    {userSearchQuery && (
                      <button
                        onClick={() => setUserSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs font-bold"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setEditingUser(null);
                      setUserFormName('');
                      setUserFormEmail('');
                      setUserFormPassword('');
                      setUserFormIsAdmin(false);
                      setUserFormAvatarUrl('');
                      setUserFormSelectedAvatarIdx(0);
                      setUserFormError('');
                      setIsUserFormOpen(true);
                    }}
                    className="bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-rose-600/20 cursor-pointer active:scale-95 whitespace-nowrap shrink-0"
                  >
                    <Plus className="w-4 h-4" /> Criar Novo Usuário
                  </motion.button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-950/80 text-zinc-400 text-[10px] uppercase font-mono tracking-wider border-b border-zinc-800">
                      <th className="py-4 px-6 font-bold">Conta / Titular</th>
                      <th className="py-4 px-6 font-bold">ID</th>
                      <th className="py-4 px-6 font-bold">Privilégios</th>
                      <th className="py-4 px-6 font-bold">Assinatura / Acesso</th>
                      <th className="py-4 px-6 font-bold">Subperfis da Família</th>
                      <th className="py-4 px-6 font-bold">Data Registro</th>
                      <th className="py-4 px-6 font-bold text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-sm">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-zinc-500">
                          <Users className="w-8 h-8 text-zinc-600 mx-auto mb-2 opacity-50" />
                          <p className="text-sm font-semibold text-zinc-400 font-sans">Nenhum usuário encontrado</p>
                          <p className="text-xs text-zinc-600 font-mono mt-1">Tente pesquisar por outro termo ou cadastre um novo usuário.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map(u => {
                        const listProfiles = allProfiles[u.id] || [];
                        const isMasterAdmin = u.email === 'rafaelguaruja09@gmail.com' || u.id === 'u1';
                        
                        return (
                          <tr key={u.id} className="hover:bg-zinc-800/30 transition-colors group">
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-600/20 to-zinc-900 border border-rose-500/30 text-rose-400 flex items-center justify-center font-black font-display uppercase font-mono shadow-inner shrink-0 group-hover:scale-105 transition-transform">
                                  {u.name.substring(0, 2)}
                                </div>
                                <div>
                                  <span className="font-semibold block text-zinc-100 font-sans">{u.name}</span>
                                  <span className="text-xs text-zinc-400 font-mono block">{u.email}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6 font-mono text-xs text-zinc-400">{u.id}</td>
                            <td className="py-4 px-6">
                              {isMasterAdmin ? (
                                <span className="bg-rose-500/15 text-rose-400 border border-rose-500/30 px-2.5 py-1 rounded-full font-mono text-[10px] font-bold uppercase inline-flex items-center gap-1.5">
                                  <Shield className="w-3 h-3 text-rose-500" /> Master Admin
                                </span>
                              ) : u.isAdmin ? (
                                <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2.5 py-1 rounded-full font-mono text-[10px] font-bold uppercase inline-flex items-center gap-1.5">
                                  <Shield className="w-3 h-3 text-rose-500" /> Administrador
                                </span>
                              ) : (
                                <span className="bg-zinc-800/80 text-zinc-300 border border-zinc-750 px-2.5 py-1 rounded-full font-mono text-[10px] uppercase font-semibold">
                                  Assinante
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-6 font-mono text-xs">
                              {isMasterAdmin || u.isAdmin ? (
                                <span className="text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Acesso Vitalício
                                </span>
                              ) : (
                                <div className="flex flex-col gap-1">
                                  <span className={`font-bold ${getSubscriptionDaysLeft(u) <= 5 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                    {getSubscriptionDaysLeft(u)} {getSubscriptionDaysLeft(u) === 1 ? 'dia restante' : 'dias restantes'}
                                  </span>
                                  {getSubscriptionDaysLeft(u) === 0 ? (
                                    <span className="bg-rose-500/15 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full text-[9px] uppercase text-center font-bold font-mono">Expirado ⚠️</span>
                                  ) : getSubscriptionDaysLeft(u) <= 5 ? (
                                    <span className="bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full text-[9px] uppercase text-center font-bold font-mono">Vence logo ⏳</span>
                                  ) : (
                                    <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[9px] uppercase text-center font-bold font-mono">Ativo ✅</span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center -space-x-2 overflow-hidden">
                                {listProfiles.map(p => (
                                  <img
                                    key={p.id}
                                    src={p.avatarUrl}
                                    alt={p.name}
                                    title={`${p.name} (${p.myList.length} salvos, ${Object.keys(p.watchHistory).length} assistidos)`}
                                    className="w-7 h-7 rounded-lg object-cover border-2 border-zinc-900 group inline-block hover:scale-125 hover:z-30 transition-transform cursor-help shadow"
                                    referrerPolicy="no-referrer"
                                  />
                                ))}
                                {listProfiles.length === 0 && <span className="text-xs text-zinc-500 italic">Sem perfis</span>}
                              </div>
                            </td>
                            <td className="py-4 px-6 text-xs text-zinc-400 font-mono">
                              {new Date(u.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="py-4 px-6 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => {
                                    setEditingUser(u);
                                    setUserFormName(u.name);
                                    setUserFormEmail(u.email);
                                    setUserFormPassword(u.password || '');
                                    setUserFormIsAdmin(!!u.isAdmin);
                                    setUserFormAvatarUrl(u.avatarUrl || '');
                                    const matchingIdx = PROFILE_AVATARS.findIndex(avatar => avatar.url === u.avatarUrl);
                                    setUserFormSelectedAvatarIdx(matchingIdx !== -1 ? matchingIdx : 0);
                                    setUserFormError('');
                                    setUserFormSubscriptionExpiresAt(u.subscriptionExpiresAt);
                                    setIsUserFormOpen(true);
                                  }}
                                  className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-rose-600 hover:text-white transition-all text-zinc-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
                                  title="Editar Usuário"
                                >
                                  <Edit className="w-3.5 h-3.5" /> <span>Editar</span>
                                </motion.button>
                                
                                {!isMasterAdmin && (
                                  <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => {
                                      setUserToDelete(u);
                                    }}
                                    className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white transition-all border border-rose-500/20 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
                                    title="Excluir Usuário"
                                  >
                                    <Trash className="w-3.5 h-3.5" /> <span>Excluir</span>
                                  </motion.button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal de Criar ou Editar Usuário Modernizado */}
            {isUserFormOpen && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0, y: 10 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl"
                >
                  <div className="px-6 py-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/80">
                    <div>
                      <span className="text-[10px] text-rose-500 font-mono font-bold tracking-widest uppercase">Formulário de Conta</span>
                      <h3 className="font-bold text-lg text-white font-display">
                        {editingUser ? 'Alterar Dados do Usuário' : 'Cadastrar Novo Usuário'}
                      </h3>
                    </div>
                    <button
                      onClick={() => setIsUserFormOpen(false)}
                      className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors flex items-center justify-center font-bold text-base"
                    >
                      &times;
                    </button>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      setUserFormError('');

                      const name = userFormName.trim();
                      const email = userFormEmail.trim().toLowerCase();
                      const password = userFormPassword;

                      if (!name || !email) {
                        setUserFormError('Nome completo e e-mail são obrigatórios!');
                        return;
                      }

                      if (!editingUser && !password) {
                        setUserFormError('A senha é obrigatória para novos usuários!');
                        return;
                      }

                      if (password && password.length < 6) {
                        setUserFormError('A senha deve conter no mínimo 6 dígitos/caracteres!');
                        return;
                      }

                      if (editingUser) {
                        const res = onEditUser(editingUser.id, name, email, password || undefined, userFormIsAdmin, userFormAvatarUrl, userFormSubscriptionExpiresAt);
                        if (res) {
                          setUserFormError(res);
                        } else {
                          setIsUserFormOpen(false);
                          setShowUserFormPass(false);
                        }
                      } else {
                        // Criar
                        const res = onAddUser(name, email, password, userFormIsAdmin, userFormAvatarUrl);
                        if (res) {
                          setUserFormError(res);
                        } else {
                          setIsUserFormOpen(false);
                          setShowUserFormPass(false);
                        }
                      }
                    }}
                    className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto"
                  >
                    {userFormError && (
                      <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl flex items-center gap-2 font-mono">
                        <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                        <span>{userFormError}</span>
                      </div>
                    )}

                    <div className="flex flex-col gap-1.5">
                      <label className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">Nome Completo</label>
                      <input
                        type="text"
                        required
                        value={userFormName}
                        onChange={(e) => setUserFormName(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 rounded-xl text-sm text-white focus:outline-none focus:border-rose-500"
                        placeholder="Ex: Rafael Gusmão"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">E-mail de Acesso</label>
                      <input
                        type="email"
                        required
                        disabled={editingUser?.email === 'rafaelguaruja09@gmail.com' || editingUser?.id === 'u1'}
                        value={userFormEmail}
                        onChange={(e) => setUserFormEmail(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 rounded-xl text-sm text-white focus:outline-none focus:border-rose-500 disabled:opacity-50"
                        placeholder="usuario@email.com"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                        Senha {editingUser ? '(Preencha/visualize a senha do usuário)' : '(Obrigatória)'}
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type={showUserFormPass ? "text" : "password"}
                          required={!editingUser}
                          value={userFormPassword}
                          onChange={(e) => setUserFormPassword(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 pl-3.5 pr-10 py-2.5 rounded-xl text-sm text-white focus:outline-none focus:border-rose-500 font-mono"
                          placeholder={editingUser ? "Senha do usuário" : "Senha secreta de acesso"}
                        />
                        <button
                          type="button"
                          onClick={() => setShowUserFormPass(!showUserFormPass)}
                          className="absolute right-3.5 text-zinc-400 hover:text-white p-1 focus:outline-none focus:text-white flex items-center justify-center transition-colors rounded"
                          title={showUserFormPass ? "Ocultar senha" : "Mostrar senha"}
                        >
                          {showUserFormPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Opções extras de senha / Esquecimento / Troca de senha */}
                      <div className="flex flex-wrap items-center gap-2 mt-2 font-mono text-[11px] select-none">
                        {editingUser && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setUserFormPassword(editingUser.password || 'vhsflix123');
                                setShowUserFormPass(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-400 hover:text-amber-300 font-bold cursor-pointer flex items-center gap-1 transition-all"
                              title="Esqueceu a senha? Clique para revelar a senha inicial que foi salva para este usuário"
                            >
                              <span>🔑 Revelar Senha Inicial</span>
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            const randomNum = Math.floor(1000 + Math.random() * 9000);
                            const newPass = `VHS-${randomNum}`;
                            setUserFormPassword(newPass);
                            setShowUserFormPass(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-400 hover:text-rose-300 font-bold cursor-pointer flex items-center gap-1 transition-all"
                          title="Gera uma nova senha aleatória segura para o usuário"
                        >
                          <span>⚙️ Gerar Nova Senha Aleatória</span>
                        </button>
                      </div>
                    </div>

                    {/* Seção de Assinatura / Tempo de Acesso (Apenas para Usuários Normais) */}
                    {editingUser && !userFormIsAdmin && (
                      <div className="p-4 bg-zinc-950/90 border border-zinc-800 rounded-2xl space-y-3">
                        <div className="flex justify-between items-center">
                          <label className="text-zinc-400 font-bold uppercase tracking-wider text-[10px] block">
                            Assinatura / Tempo de Acesso
                          </label>
                          <span className="font-mono text-[10px] bg-rose-500/15 text-rose-400 border border-rose-500/30 px-2.5 py-0.5 rounded-full font-bold uppercase">
                            {getSubscriptionDaysLeft({ ...editingUser, subscriptionExpiresAt: userFormSubscriptionExpiresAt })} {getSubscriptionDaysLeft({ ...editingUser, subscriptionExpiresAt: userFormSubscriptionExpiresAt }) === 1 ? 'dia restante' : 'dias restantes'}
                          </span>
                        </div>
                        
                        <div className="text-xs text-zinc-300 font-sans flex flex-col gap-2">
                          <p className="leading-relaxed">
                            O usuário tem atualmente <strong className="text-white">{getSubscriptionDaysLeft({ ...editingUser, subscriptionExpiresAt: userFormSubscriptionExpiresAt })} {getSubscriptionDaysLeft({ ...editingUser, subscriptionExpiresAt: userFormSubscriptionExpiresAt }) === 1 ? 'dia' : 'dias'}</strong> de acesso restantes ao VHSFLIX.
                          </p>
                          <div className="flex gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                const newExpiry = renewSubscription({ ...editingUser, subscriptionExpiresAt: userFormSubscriptionExpiresAt });
                                setUserFormSubscriptionExpiresAt(newExpiry);
                              }}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-2 rounded-xl text-[11px] font-mono transition-colors cursor-pointer flex-1 text-center shadow"
                              title="Adiciona +30 dias ao tempo restante atual do usuário"
                            >
                              🚀 Renovar +30 Dias (Soma)
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const thirtyDaysFromNow = new Date();
                                thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
                                setUserFormSubscriptionExpiresAt(thirtyDaysFromNow.toISOString());
                              }}
                              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold px-3 py-2 rounded-xl text-[11px] font-mono transition-colors cursor-pointer flex-1 text-center border border-zinc-700"
                              title="Redefine o acesso para exatamente 30 dias a partir de hoje"
                            >
                              🔄 Reiniciar (30 Dias)
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Controlo de privilégios de Administrador */}
                    {editingUser?.email !== 'rafaelguaruja09@gmail.com' && editingUser?.id !== 'u1' && (
                      <div className="pt-2">
                        <label className="flex items-center gap-2.5 cursor-pointer text-xs text-zinc-300 select-none">
                          <input
                            type="checkbox"
                            checked={userFormIsAdmin}
                            onChange={(e) => setUserFormIsAdmin(e.target.checked)}
                            className="accent-rose-600 rounded-md cursor-pointer w-4 h-4"
                          />
                          <span className="font-semibold">Privilégios de Administrador (Acesso ao Painel Admin)</span>
                        </label>
                        <p className="text-[11px] text-zinc-400 ml-6.5 mt-0.5">
                          Permite ao usuário acessar e alterar as configurações do console de administração.
                        </p>
                      </div>
                    )}

                    {/* Opção para alterar a foto de perfil */}
                    <div className="flex flex-col gap-2 pt-3 border-t border-zinc-800">
                      <label className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                        Foto de Perfil do Usuário
                      </label>
                      <div className="flex items-center gap-4 bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800">
                        {/* Preview */}
                        <div className="w-14 h-14 rounded-xl bg-zinc-900 border border-zinc-700 overflow-hidden shrink-0 shadow-lg">
                          <img
                            src={userFormAvatarUrl || DEFAULT_USER_AVATAR}
                            alt="Avatar"
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-zinc-400 font-medium">Selecione um avatar clássico ou envie uma foto:</p>
                          
                          {/* Carrossel de presets */}
                          <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-zinc-900 rounded-xl no-scrollbar mt-2">
                            {PROFILE_AVATARS.map((avatar, idx) => (
                              <button
                                key={avatar.id}
                                type="button"
                                onClick={() => {
                                  setUserFormAvatarUrl(avatar.url);
                                  setUserFormSelectedAvatarIdx(idx);
                                }}
                                className={`w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 transition-all cursor-pointer ${
                                  userFormAvatarUrl === avatar.url
                                    ? 'ring-2 ring-rose-500 scale-105 shadow-md'
                                    : 'opacity-60 hover:opacity-100'
                                }`}
                                title={avatar.name}
                              >
                                <img src={avatar.url} alt={avatar.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* URL Personalizada ou upload de arquivo */}
                      <div className="grid grid-cols-1 gap-2 mt-1">
                        <div>
                          <input
                            type="url"
                            placeholder="URL personalizada da foto (https://...)"
                            value={userFormAvatarUrl}
                            onChange={(e) => {
                              setUserFormAvatarUrl(e.target.value);
                            }}
                            className="w-full bg-zinc-950 border border-zinc-800 px-3.5 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                          />
                        </div>
                        <div className="bg-zinc-950/70 p-2 px-3 rounded-xl border border-zinc-800 flex items-center justify-between">
                          <span className="text-[11px] text-zinc-400">Ou envie uma foto local:</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = async () => {
                                  if (typeof reader.result === 'string') {
                                    try {
                                      const compressed = await compressImage(reader.result);
                                      setUserFormAvatarUrl(compressed);
                                    } catch (err) {
                                      console.error('Erro comprimindo imagem:', err);
                                      setUserFormAvatarUrl(reader.result);
                                    }
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="text-xs text-zinc-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700 cursor-pointer max-w-[160px] overflow-hidden"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 justify-end pt-4 border-t border-zinc-800">
                      <button
                        type="button"
                        onClick={() => setIsUserFormOpen(false)}
                        className="px-4 py-2.5 hover:bg-zinc-800 rounded-xl text-xs text-zinc-400 font-semibold cursor-pointer transition-colors border border-zinc-800"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-rose-600/20 active:scale-95 cursor-pointer font-mono"
                      >
                        {editingUser ? 'Salvar Usuário' : 'Cadastrar Usuário'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </motion.div>
        )}

        {/* --- ABA: MINHA CONTA (PROFISSIONAL, ANIMAÇÕES FLUIDAS E ALTO CONTRASTE) --- */}
        {activeAdminTab === 'myaccount' && (
          <motion.div 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="max-w-2xl bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl backdrop-blur-md"
          >
            <div className="border-b border-zinc-800 pb-5">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-400 text-[10px] font-mono font-bold tracking-wider uppercase mb-1">
                Credenciais Master
              </div>
              <h3 className="font-bold text-2xl text-white font-display tracking-tight flex items-center gap-2.5">
                <Shield className="w-6 h-6 text-rose-500" /> Minha Conta Administrativa
              </h3>
              <p className="text-xs text-zinc-400 mt-1 font-sans">
                Gerencie suas credenciais de acesso, e-mail do titular e senha de segurança master.
              </p>
            </div>

            {(() => {
              const adminActiveProfile = allProfiles[currentUserId]?.find(p => p.id === currentProfileId) || allProfiles[currentUserId]?.[0];
              if (!adminActiveProfile) return null;
              return (
                <div className="flex flex-col sm:flex-row items-center gap-5 bg-zinc-950/60 p-5 rounded-2xl border border-zinc-800/80 shadow-inner">
                  <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-rose-500 shadow-xl shrink-0 group">
                    <img src={adminActiveProfile.avatarUrl} alt="Foto de perfil" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" referrerPolicy="no-referrer" />
                  </div>
                  <div className="text-center sm:text-left flex-1">
                    <span className="text-[10px] font-mono text-rose-400 uppercase tracking-widest font-bold">Perfil em Uso</span>
                    <p className="text-base font-black text-white mt-0.5 font-display">{adminActiveProfile.name}</p>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={() => {
                        setAdminCustomAvatarUrl(adminActiveProfile.avatarUrl);
                        const matchingIdx = PROFILE_AVATARS.findIndex(avatar => avatar.url === adminActiveProfile.avatarUrl);
                        setAdminSelectedAvatarIdx(matchingIdx !== -1 ? matchingIdx : 0);
                        setShowAdminAvatarModal(true);
                      }}
                      className="text-xs text-rose-400 hover:text-white font-mono font-bold uppercase tracking-wider mt-3 cursor-pointer flex items-center justify-center sm:justify-start gap-1.5 p-2 bg-zinc-900 hover:bg-rose-600 border border-zinc-800 rounded-xl px-3 transition-all shadow"
                    >
                      <Edit className="w-3.5 h-3.5" /> Alterar Minha Foto de Perfil
                    </motion.button>
                  </div>
                </div>
              );
            })()}

            <div className="space-y-3 py-3 rounded-2xl bg-zinc-950/60 p-5 border border-zinc-800/80 font-mono text-xs shadow-inner">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">NOME TITULAR:</span>
                <span className="text-zinc-100 font-bold">{currentUser.name || 'Rafael Guzmão'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">NÍVEL DE PERMISSÃO:</span>
                <span className="text-rose-400 uppercase font-black bg-rose-500/10 border border-rose-500/25 px-2.5 py-0.5 rounded-full text-[10px] flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Master Admin
                </span>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setMyAccountMessage('');
                setMyAccountError('');

                if (!myAccountEmail.trim() || !myAccountEmail.includes('@')) {
                  setMyAccountError('E-mail inválido');
                  return;
                }
                if (!myAccountPassword.trim()) {
                  setMyAccountError('Senha é obrigatória');
                  return;
                }
                if (myAccountPassword.trim().length < 6) {
                  setMyAccountError('A senha deve conter no mínimo 6 dígitos/caracteres!');
                  return;
                }

                // Salva utilizando callback
                const res = onEditUser(currentUserId, currentUser.name, myAccountEmail.trim(), myAccountPassword);
                if (res) {
                  setMyAccountError(res);
                } else {
                  setMyAccountMessage('Dados atualizados com sucesso!');
                  setTimeout(() => setMyAccountMessage(''), 4000);
                }
              }}
              className="space-y-4.5 pt-2"
            >
              {myAccountError && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl flex items-center gap-2 font-mono">
                  <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                  <span>{myAccountError}</span>
                </div>
              )}

              {myAccountMessage && (
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl flex items-center gap-2 font-mono">
                  <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>{myAccountMessage}</span>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-zinc-400 font-bold uppercase tracking-wider text-[10px] font-mono">Endereço de E-mail</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500 text-xs uppercase font-mono">@</span>
                  <input
                    type="email"
                    required
                    value={myAccountEmail}
                    onChange={(e) => setMyAccountEmail(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-rose-500 rounded-xl py-3 pl-9 pr-4 text-sm text-white focus:outline-none transition-colors font-mono shadow-inner"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-zinc-400 font-bold uppercase tracking-wider text-[10px] font-mono">Alterar Senha Administrativa</label>
                <div className="relative flex items-center">
                  <LockIcon className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-500 pointer-events-none" />
                  <input
                    type={showMyAccountPass ? "text" : "password"}
                    required
                    placeholder="Sua nova senha"
                    value={myAccountPassword}
                    onChange={(e) => setMyAccountPassword(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-rose-500 rounded-xl py-3 pl-10 pr-12 text-sm text-white focus:outline-none transition-colors font-mono shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMyAccountPass(!showMyAccountPass)}
                    className="absolute right-3.5 top-3 text-zinc-400 hover:text-white p-1 focus:outline-none focus:text-white flex items-center justify-center transition-colors rounded-md"
                    title={showMyAccountPass ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showMyAccountPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="w-full bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold py-3.5 rounded-xl text-xs font-mono uppercase tracking-wider transition-all shadow-lg shadow-rose-600/20 cursor-pointer"
              >
                Salvar Alterações da Conta
              </motion.button>
            </form>
          </motion.div>
        )}

        {/* --- ABA 3: CONFIGURAÇÕES E CREDENCIAIS TMDB (MODERNIZADO E RESUMIDO) --- */}
        {activeAdminTab === 'settings' && (
          <motion.div 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            
            {/* Bloco TMDB Config */}
            <motion.div 
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className="bg-zinc-900/90 border border-zinc-800 hover:border-rose-500/40 rounded-2xl p-6 space-y-5 shadow-xl backdrop-blur-md transition-all"
            >
              <div className="border-b border-zinc-800 pb-4">
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-400 text-[10px] font-mono font-bold tracking-wider uppercase mb-1">
                  TMDB Live Engine
                </div>
                <h3 className="font-bold text-lg text-white font-display uppercase tracking-tight flex items-center gap-2">
                  <Settings className="w-5 h-5 text-rose-500" /> API de Busca do TMDB
                </h3>
                <p className="text-xs text-zinc-400 mt-1 font-sans">Insira suas chaves de API do The Movie Database para buscas mundiais com metadados e posters em alta resolução.</p>
              </div>

              <div className="space-y-4 text-xs font-mono">
                <div className="flex flex-col gap-1.5">
                  <label className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">TMDB API KEY v3</label>
                  <input
                    type="password"
                    placeholder="Cole aqui sua api_key do TMDB v3"
                    value={tmdbApiKey}
                    onChange={e => onUpdateTmdbApiKey(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 px-3.5 py-3 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500 shadow-inner"
                    id="input-tmdb-key-entry"
                  />
                  <p className="text-[11px] text-zinc-400 mt-1.5 leading-relaxed font-sans">
                    Obtenha gratuitamente em <a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer" className="text-rose-400 underline hover:text-rose-300 font-bold">themoviedb.org</a> sob a seção de Desenvolvedores.
                  </p>
                </div>

                <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800 flex items-start gap-3 shadow-inner">
                  <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-zinc-200 block font-sans">Status da Conexão TMDB</span>
                    <span className="text-[11px] text-zinc-400 mt-1 block leading-relaxed font-mono">
                      {tmdbApiKey ? 'Chave personalizada conectada. Buscas live ativas com preenchimento em lote!' : 'Utilizando banco de dados retro local de contingência.'}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Bloco Abyss API Config */}
            <motion.div 
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className="bg-zinc-900/90 border border-zinc-800 hover:border-rose-500/40 rounded-2xl p-6 space-y-5 shadow-xl backdrop-blur-md transition-all"
            >
              <div className="border-b border-zinc-800 pb-4">
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-400 text-[10px] font-mono font-bold tracking-wider uppercase mb-1">
                  Abyss Stream Player
                </div>
                <h3 className="font-bold text-lg text-white font-display uppercase tracking-tight flex items-center gap-2">
                  <Play className="w-5 h-5 text-rose-500" /> API do Player Abyss (GET /v1/resources)
                </h3>
                <p className="text-xs text-zinc-400 mt-1 font-sans">Sintonizador automático de player de mídia embutido (https://play.abyssplayer.com/&#123;id&#125;).</p>
              </div>

              <div className="space-y-4 text-xs font-mono">
                <div className="flex flex-col gap-1.5">
                  <label className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">ABYSS API KEY</label>
                  <input
                    type="password"
                    placeholder="Cole aqui sua chave de API do Abyss"
                    value={abyssApiKey}
                    onChange={e => {
                      if (onUpdateAbyssApiKey) onUpdateAbyssApiKey(e.target.value);
                      AbyssService.setApiKey(e.target.value);
                    }}
                    className="w-full bg-zinc-950 border border-zinc-800 px-3.5 py-3 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500 shadow-inner"
                    id="input-abyss-key-entry"
                  />
                  <p className="text-[11px] text-zinc-400 mt-1.5 leading-relaxed font-sans">
                    Com esta chave ativa, ao buscar no TMDB o campo Embed URL é preenchido automaticamente com o player correspondente.
                  </p>
                </div>

                <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800 flex items-start gap-3 shadow-inner">
                  <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-zinc-200 block font-sans">Sintonização Automática</span>
                    <span className="text-[11px] text-zinc-400 mt-1 block leading-relaxed font-mono">
                      {abyssApiKey ? 'Chave do Abyss ativa! Preenchimento automático ativado.' : 'Utilizando chave padrão do servidor para automação.'}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Bloco de Versionamento e Sincronização Global */}
            <motion.div 
              whileHover={{ y: -2, transition: { duration: 0.2 } }}
              className="bg-zinc-900/90 border border-zinc-800 hover:border-emerald-500/40 rounded-2xl p-6 space-y-5 col-span-1 md:col-span-2 shadow-xl backdrop-blur-md transition-all"
            >
              <div className="border-b border-zinc-800 flex justify-between items-start gap-4 flex-wrap pb-4">
                <div>
                  <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] font-mono font-bold tracking-wider uppercase mb-1">
                    Rede Global & Cache
                  </div>
                  <h3 className="font-bold text-lg text-emerald-400 font-display uppercase tracking-tight flex items-center gap-2">
                    <RefreshCw className="w-5 h-5" /> Sincronização e Versionamento Global
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 font-sans">
                    Força todos os aparelhos conectados (Smart TVs, Celulares, Tablets, PCs) a limparem o cache local e atualizarem o acervo.
                  </p>
                </div>
                <div className="bg-zinc-950 px-3.5 py-1.5 rounded-xl border border-zinc-800 font-mono text-xs text-zinc-400 shadow-inner">
                  Sinal de Versão: <span className="text-white font-bold">{localStorage.getItem('vhsflix_system_version') || '1.0.0'}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4.5 bg-zinc-950 rounded-2xl border border-zinc-800 flex flex-col justify-between shadow-inner">
                  <div>
                    <span className="text-xs font-bold text-zinc-200 block font-sans">Como Funciona a Propagação?</span>
                    <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed font-sans">
                      Quando novas fitas ou capas são adicionadas, ao disparar este comando os navegadores ativos recebem a nova assinatura de versão e recarregam suavemente os dados atualizados.
                    </p>
                  </div>
                </div>

                <div className="p-5 bg-emerald-950/20 rounded-2xl border border-emerald-500/30 flex flex-col justify-center items-stretch gap-4">
                  <div className="text-center font-sans">
                    <span className="text-sm font-bold text-emerald-400 block">Forçar Atualização de Sinal</span>
                    <span className="text-xs text-zinc-400 mt-1 block leading-relaxed">
                      Clique abaixo para propagar as alterações instantaneamente para todos os aparelhos ativos.
                    </span>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      if (onPublishUpdate) {
                        onPublishUpdate();
                        alert('Sinal de atualização enviado com sucesso! Todos os aparelhos sintonizados no VHSFLIX serão reiniciados e atualizados nos próximos segundos.');
                      }
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl text-xs font-mono uppercase transition-all tracking-wider text-center cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95"
                    id="btn-publish-global-update"
                  >
                    <RefreshCw className="w-4 h-4" /> Enviar Sinal de Atualização Geral
                  </motion.button>
                </div>
              </div>
            </motion.div>

            {/* Bloco Configurações de Fábrica e Reset GERAL */}
            <motion.div 
              whileHover={{ y: -2, transition: { duration: 0.2 } }}
              className="bg-zinc-900/90 border border-zinc-800 hover:border-rose-500/40 rounded-2xl p-6 space-y-5 col-span-1 md:col-span-2 shadow-xl backdrop-blur-md transition-all"
            >
              <div className="border-b border-zinc-800 pb-4">
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-400 text-[10px] font-mono font-bold tracking-wider uppercase mb-1">
                  Segurança Crítica
                </div>
                <h3 className="font-bold text-lg text-rose-500 font-display uppercase tracking-tight flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5" /> Zona de Risco Administrativa
                </h3>
                <p className="text-xs text-zinc-400 mt-1 font-sans">Efetue restaurações do acervo ou reinicializações completas do catálogo.</p>
              </div>

              <div className="space-y-4">
                <div className="bg-rose-500/5 p-5 rounded-2xl border border-rose-500/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-inner">
                  <div className="flex gap-3 items-start">
                    <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-zinc-200 font-sans leading-none">Restaurar Catálogo Padrão Original</p>
                      <p className="text-xs text-zinc-400 font-sans mt-1.5 leading-relaxed max-w-xl">
                        Esta operação restabelece o catálogo inicial retrô do VHSFLIX (clássicos como *De Volta para o Futuro*, *Alien*, *Stranger Things*, etc.).
                      </p>
                    </div>
                  </div>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setShowCatalogResetConfirm(true);
                    }}
                    className="bg-zinc-950 hover:bg-rose-600 hover:text-white border border-rose-500/40 text-rose-400 px-5 py-2.5 rounded-xl text-xs font-mono font-bold uppercase transition-all tracking-wider text-center cursor-pointer active:scale-95 shadow shrink-0"
                    id="btn-hard-reset-catalog"
                  >
                    Resetar Catálogo
                  </motion.button>
                </div>
              </div>
            </motion.div>

          </motion.div>
        )}

        </div> {/* Fim do flex-1 */}
      </div> {/* Fim do flex-col lg:flex-row dual alignment */}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE USUÁRIO */}
      <AnimatePresence>
        {userToDelete && (
          <div className="fixed inset-0 bg-black/85 flex justify-center items-center p-4 z-50 modal-backdrop-blur">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 max-w-sm w-full rounded-xl p-6 text-center shadow-2xl"
            >
              <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2 font-display">Excluir Usuário?</h3>
              <p className="text-xs text-zinc-400 mb-6 leading-relaxed font-sans">
                Tem certeza que deseja excluir permanentemente o usuário <strong className="text-zinc-200">"{userToDelete.name}"</strong>? Esta ação removerá sua conta e todos os perfis associados.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => setUserToDelete(null)}
                  className="px-4 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs font-semibold hover:text-white transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteUser(userToDelete.id);
                    setUserToDelete(null);
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-5 py-2 rounded transition-all shadow-lg cursor-pointer"
                >
                  Excluir Conta
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE FILME */}
      <AnimatePresence>
        {showBulkDeleteConfirm && (
          <div className="fixed inset-0 bg-black/85 flex justify-center items-center p-4 z-50 modal-backdrop-blur">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 max-w-sm w-full rounded-xl p-6 text-center shadow-2xl"
            >
              <Trash className="w-12 h-12 text-rose-500 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white mb-2 font-display">Remover em Lote?</h3>
              <p className="text-xs text-zinc-400 mb-6 leading-relaxed font-sans">
                Deseja realmente excluir os <strong className="text-zinc-200">{selectedMovieIds.length} títulos selecionados</strong> permanentemente do acervo VHSFLIX?
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => setShowBulkDeleteConfirm(false)}
                  className="px-4 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs font-semibold hover:text-white transition-all cursor-pointer font-sans"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onBulkDeleteMovies) {
                      onBulkDeleteMovies(selectedMovieIds);
                    } else {
                      selectedMovieIds.forEach(id => onDeleteMovie(id));
                    }
                    setSelectedMovieIds([]);
                    setShowBulkDeleteConfirm(false);
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-5 py-2 rounded transition-all shadow-lg cursor-pointer font-sans"
                >
                  Confirmar Exclusão
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE TODAS AS CÓPIAS DUPLICADAS */}
      <AnimatePresence>
        {showDeleteAllDuplicatesConfirm && (
          <div className="fixed inset-0 bg-black/90 flex justify-center items-center p-4 z-50 modal-backdrop-blur">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-rose-500/50 max-w-md w-full rounded-2xl p-6 text-center shadow-2xl space-y-4"
            >
              <div className="w-14 h-14 rounded-2xl bg-rose-600/20 border border-rose-500/40 text-rose-500 flex items-center justify-center mx-auto">
                <Trash className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white font-display uppercase tracking-tight">
                  Excluir Todas as {duplicateAnalysis.totalCopiesCount} Cópias Duplicadas?
                </h3>
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed font-sans">
                  Esta ação excluirá exclusivamente as <strong className="text-rose-400">{duplicateAnalysis.totalCopiesCount} cópias repetidas</strong> do catálogo.
                  <br />
                  <span className="text-emerald-400 font-semibold mt-1.5 inline-block">
                    ✓ A fita original de cada filme e série continuará 100% segura e salva!
                  </span>
                </p>
              </div>
              <div className="flex gap-3 justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteAllDuplicatesConfirm(false)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold hover:text-white transition-all cursor-pointer font-sans"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const idsToDelete: string[] = Array.from(duplicateAnalysis.duplicateCopyIds);
                    if (idsToDelete.length > 0) {
                      if (onBulkDeleteMovies) {
                        onBulkDeleteMovies(idsToDelete);
                      } else {
                        idsToDelete.forEach((id: string) => onDeleteMovie(id));
                      }
                      setSelectedMovieIds(prev => prev.filter(id => !idsToDelete.includes(id)));
                    }
                    setShowDeleteAllDuplicatesConfirm(false);
                  }}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold font-mono px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-rose-600/30 cursor-pointer flex items-center gap-2"
                >
                  <Trash className="w-4 h-4" />
                  <span>Excluir {duplicateAnalysis.totalCopiesCount} Cópias</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE FILME */}
      <AnimatePresence>
        {movieToDelete && (
          <div className="fixed inset-0 bg-black/85 flex justify-center items-center p-4 z-50 modal-backdrop-blur">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 max-w-sm w-full rounded-xl p-6 text-center shadow-2xl"
            >
              <Trash className="w-12 h-12 text-rose-500 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white mb-2 font-display">
                {duplicateAnalysis.duplicateCopyIds.has(movieToDelete.id) ? 'Excluir Cópia Duplicada?' : 'Remover do Catálogo?'}
              </h3>
              <p className="text-xs text-zinc-400 mb-6 leading-relaxed font-sans">
                {duplicateAnalysis.duplicateCopyIds.has(movieToDelete.id) ? (
                  <>
                    Deseja realmente apagar esta cópia repetida de <strong className="text-zinc-200">"{movieToDelete.title}"</strong>?
                    <br />
                    <span className="text-emerald-400 font-semibold mt-1 inline-block">
                      O título original continuará salvo no seu acervo.
                    </span>
                  </>
                ) : (
                  <>
                    Deseja realmente excluir <strong className="text-zinc-200">"{movieToDelete.title}"</strong> permanentemente do acervo VHSFLIX?
                  </>
                )}
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => setMovieToDelete(null)}
                  className="px-4 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs font-semibold hover:text-white transition-all cursor-pointer font-sans"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteMovie(movieToDelete.id);
                    setMovieToDelete(null);
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-5 py-2 rounded transition-all shadow-lg cursor-pointer font-sans"
                >
                  {duplicateAnalysis.duplicateCopyIds.has(movieToDelete.id) ? 'Excluir Cópia' : 'Remover Mídia'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DE RECONFORMAÇÃO DO CATALOG RESET */}
      <AnimatePresence>
        {showCatalogResetConfirm && (
          <div className="fixed inset-0 bg-black/90 flex justify-center items-center p-4 z-50 modal-backdrop-blur">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 max-w-sm w-full rounded-xl p-6 text-center shadow-2xl"
            >
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white mb-2 font-display">Restaurar Catálogo?</h3>
              <p className="text-xs text-zinc-400 mb-6 leading-relaxed font-sans">
                Isso apagará permanentemente todos os filmes adicionados ou alterados manualmente e re-estabelecerá o acervo original da plataforma. Esta ação é irreversível.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => setShowCatalogResetConfirm(false)}
                  className="px-4 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs font-semibold hover:text-white transition-all cursor-pointer font-sans"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onResetCatalog();
                    setShowCatalogResetConfirm(false);
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-5 py-2 rounded transition-all shadow-lg cursor-pointer font-sans"
                >
                  Restaurar Agora
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL PARA ALTERAR FOTO DE PERFIL DO ADMIN */}
      <AnimatePresence>
        {showAdminAvatarModal && (
          <div className="fixed inset-0 bg-black/95 flex justify-center items-center p-4 z-50 modal-backdrop-blur">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 max-w-sm sm:max-w-md w-full rounded-xl p-6 md:p-8 text-left shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-xl font-bold font-display text-white mb-2">Sua Foto de Perfil</h3>
              <p className="text-xs text-zinc-500 mb-6 font-sans">Altere sua foto de capa do administrador escolhendo um tema pré-definido, colando um link ou enviando um arquivo local.</p>

              <form onSubmit={(e) => {
                e.preventDefault();
                const adminActiveProfile = allProfiles[currentUserId]?.find(p => p.id === currentProfileId) || allProfiles[currentUserId]?.[0];
                if (adminActiveProfile && onEditProfile) {
                  const finalAvatarUrl = adminCustomAvatarUrl.trim() !== '' ? adminCustomAvatarUrl : PROFILE_AVATARS[adminSelectedAvatarIdx].url;
                  onEditProfile(adminActiveProfile.id, adminActiveProfile.name, finalAvatarUrl);
                }
                setShowAdminAvatarModal(false);
              }}>
                {/* Preview */}
                <div className="flex flex-col items-center justify-center mb-5 bg-zinc-950 p-4 rounded-xl border border-zinc-850">
                  <div className="w-24 h-24 rounded-lg overflow-hidden border-2 border-rose-500 shadow-xl mb-4 relative bg-zinc-900">
                    <img 
                      src={adminCustomAvatarUrl.trim() !== '' ? adminCustomAvatarUrl : PROFILE_AVATARS[adminSelectedAvatarIdx].url} 
                      alt="Avatar prévia" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  
                  {/* Seletor de Carrossel de Avatares */}
                  <div className="flex items-center gap-2 max-w-full overflow-x-auto p-1.5 no-scrollbar bg-zinc-900 rounded-lg">
                    {PROFILE_AVATARS.map((avatar, idx) => (
                      <button
                        key={avatar.id}
                        type="button"
                        onClick={() => {
                          setAdminSelectedAvatarIdx(idx);
                          setAdminCustomAvatarUrl(''); // limpa customizada ao escolher predefinido
                        }}
                        className={`w-10 h-10 rounded-md overflow-hidden flex-shrink-0 transition-all ${
                          adminSelectedAvatarIdx === idx && adminCustomAvatarUrl.trim() === ''
                            ? 'ring-2 ring-rose-500 scale-110' 
                            : 'opacity-50 hover:opacity-100'
                        }`}
                      >
                        <img src={avatar.url} alt={avatar.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono mt-1.5 uppercase">
                    {adminCustomAvatarUrl.trim() !== '' ? 'Imagem Personalizada' : `Tema: ${PROFILE_AVATARS[adminSelectedAvatarIdx].name}`}
                  </span>
                </div>

                {/* Qualquer imagem no perfil */}
                <div className="mb-6 p-4 bg-zinc-950 rounded-lg border border-zinc-850 space-y-3.5">
                  <div>
                    <label className="block text-[10px] font-mono text-zinc-400 mb-1.5 uppercase tracking-wider">Cole uma URL da Web</label>
                    <input
                      type="url"
                      placeholder="https://exemplo.com/foto.jpg"
                      value={adminCustomAvatarUrl}
                      onChange={e => setAdminCustomAvatarUrl(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 text-white px-3 py-1.5 rounded text-xs focus:outline-none focus:border-rose-500 font-sans font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-zinc-400 mb-1.5 uppercase tracking-wider">Ou Envie do Seu Computador</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = async () => {
                            if (typeof reader.result === 'string') {
                              try {
                                const compressed = await compressImage(reader.result);
                                setAdminCustomAvatarUrl(compressed);
                              } catch (err) {
                                console.error('Erro comprimindo imagem de admin:', err);
                                setAdminCustomAvatarUrl(reader.result);
                              }
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="w-full text-xs text-zinc-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-zinc-850 file:text-zinc-300 hover:file:bg-zinc-800 cursor-pointer text-ellipsis overflow-hidden"
                    />
                  </div>

                  <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setAdminCustomAvatarUrl(RAFAEL_ADMIN_AVATAR);
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-rose-600/20 hover:bg-rose-600/35 border border-rose-500/50 text-rose-300 hover:text-white text-xs font-mono font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    >
                      <span>Restaurar Minha Foto Oficial (Rafael Gusmão)</span>
                    </button>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex gap-3 justify-end pt-2 border-t border-zinc-850">
                  <button
                    type="button"
                    onClick={() => setShowAdminAvatarModal(false)}
                    className="px-4 py-2 rounded text-zinc-400 text-xs hover:text-white transition-colors cursor-pointer font-sans"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-5 py-2 rounded transition-colors shadow-lg shadow-rose-600/10 cursor-pointer font-sans"
                  >
                    Confirmar Foto
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      </div>
    </div>
  );
}
