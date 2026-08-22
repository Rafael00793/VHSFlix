/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Movie, User, Profile, getSubscriptionDaysLeft, renewSubscription } from '../types';
import { GENRE_CATEGORIES, searchMoviesTMDB, getMovieDetailsTMDB, PROFILE_AVATARS } from '../data';
import { Trash, Edit, Plus, Users, Library, Settings, Search, Import, Download, Star, Shield, Film, Tv, Play, AlertTriangle, ShieldAlert, RefreshCw, Check, LayoutDashboard, Activity, Clock, TrendingUp, User as UserIcon, Lock as LockIcon, Eye, EyeOff, Flame, Sparkles, Pin, X, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { compressImage, saveMoviesToFirestore } from '../lib/firebase';
import { DEFAULT_POSTER_FALLBACK, DEFAULT_BACKDROP_FALLBACK, handlePosterError, handleBackdropError, getCleanPosterUrl, getCleanBackdropUrl } from '../lib/imageUtils';
import { AbyssService } from '../services/abyssService';

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
  onTogglePinMostDesired
}: AdminPanelProps) {
  const [activeAdminTab, setActiveAdminTab] = useState<'dashboard' | 'catalog' | 'users' | 'myaccount' | 'settings'>('dashboard');

  // Estados de Seleção em Lote e Exclusão Coletiva
  const [selectedMovieIds, setSelectedMovieIds] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [catalogSearchQuery, setCatalogSearchQuery] = useState('');

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

  // Estados para "Minha Conta"
  const currentUser = users.find(u => u.id === currentUserId) || { name: 'Admin', email: '', password: '' };
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
    setIsFormOpen(true);
  };

  // Detecção Inteligente de Títulos e Séries já Cadastrados no Acervo
  const findDuplicateMovie = (title: string, tmdbId?: number, currentEditId?: string): Movie | null => {
    if (!title && !tmdbId) return null;
    const clean = (s: string) => (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();

    const titleClean = clean(title);

    return movies.find(m => {
      if (currentEditId && m.id === currentEditId) return false;
      if (tmdbId && m.tmdbId && Number(m.tmdbId) === Number(tmdbId)) return true;
      if (titleClean && titleClean.length > 1 && clean(m.title) === titleClean) return true;
      return false;
    }) || null;
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDescription.trim()) return;

    // Verificação preventiva de duplicidade ao cadastrar novo título
    if (!editingMovie) {
      const existingDuplicate = findDuplicateMovie(formTitle, formTmdbId);
      if (existingDuplicate) {
        const confirmDuplicate = window.confirm(
          `⚠️ AVISO DE DUPLICIDADE NO ACERVO:\n\nO título "${existingDuplicate.title}" (${existingDuplicate.year} • ${existingDuplicate.category}) já consta cadastrado no catálogo do VHSFLIX.\n\nDeseja realmente cadastrar este item novamente em duplicidade?`
        );
        if (!confirmDuplicate) {
          return;
        }
      }
    }

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
      abyssStatus: 'active'
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

  // --- CÁLCULO DE ESTATÍSTICAS E MÉTRICAS RETRÔ PARA O DASHBOARD ---
  const countMovies = movies.filter(m => m.type === 'movie').length;
  const countSeries = movies.filter(m => m.type === 'series').length;
  const totalSubProfiles = Object.values(allProfiles).reduce((acc, pList) => acc + pList.length, 0);
  
  // Total de itens favoritados (nas listas de interesses de todos os perfis)
  const totalMyListSoma = Object.values(allProfiles).reduce((acc, pList) => {
    return acc + pList.reduce((sum, p) => sum + (p.myList ? p.myList.length : 0), 0);
  }, 0);

  // Média Geral de Avaliações
  const totalRatingSoma = movies.reduce((acc, m) => acc + (m.rating || 0), 0);
  const mediaRating = movies.length > 0 ? (totalRatingSoma / movies.length).toFixed(1) : "0.0";

  // Fitas Magnéticas em Progresso vs Finalizadas
  const allHistoryProgressList = Object.values(allProfiles).flatMap(pList => pList.flatMap(p => p.watchHistory ? Object.values(p.watchHistory) : [])) as any[];
  const emProgresso = allHistoryProgressList.filter(ph => ph.progress > 0 && ph.progress < 100).length;
  const fitasConcluidas = allHistoryProgressList.filter(ph => ph.progress >= 100 || ph.isFinished).length;
  const totalSomaSegundos = allHistoryProgressList.reduce((acc, ph) => acc + (ph.currentTime || 0), 0);
  const totalMinutosReproduzidos = Math.round(totalSomaSegundos / 60);

  // Catálogo de mídias filtrado pelo campo de busca no Admin
  const filteredAdminMovies = useMemo(() => {
    if (!catalogSearchQuery.trim()) return movies;
    const query = catalogSearchQuery.toLowerCase().trim();
    return movies.filter(m => 
      m.title.toLowerCase().includes(query) ||
      m.category.toLowerCase().includes(query) ||
      (m.description && m.description.toLowerCase().includes(query))
    );
  }, [movies, catalogSearchQuery]);

  // Fita VHS Mais Popular (Que mais vezes aparece em myList)
  const myListCounts: { [movieId: string]: number } = {};
  Object.values(allProfiles).forEach(pList => {
    pList.forEach(p => {
      if (p.myList) {
        p.myList.forEach(mId => {
          myListCounts[mId] = (myListCounts[mId] || 0) + 1;
        });
      }
    });
  });

  let popularMovieId = '';
  let popularMovieCount = 0;
  Object.entries(myListCounts).forEach(([mId, count]) => {
    if (count > popularMovieCount) {
      popularMovieCount = count;
      popularMovieId = mId;
    }
  });
  const popularMovie = movies.find(m => m.id === popularMovieId) || (movies.length > 0 ? movies[0] : null);

  // Stats por categoria
  const categoryStats = GENRE_CATEGORIES.filter(c => c !== 'Todos').map(category => {
    const count = movies.filter(m => m.category === category).length;
    const percentage = movies.length > 0 ? (count / movies.length) * 100 : 0;
    return { category, count, percentage };
  });

  return (
    <div className="min-h-screen bg-zinc-950 font-sans text-zinc-100 pt-28 pb-16 px-4 sm:px-8 vhs-grid-pattern">
      <div className="max-w-[1400px] mx-auto">
        
        {/* Cabeçalho do Painel com Efeitos Modernos */}
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b border-zinc-800/80 pb-6">
          <div className="relative">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-400 text-[11px] font-mono font-bold tracking-wider uppercase mb-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              Console Administrativo
            </div>
            <h1 className="text-3xl sm:text-4xl font-black font-display tracking-tight text-white flex items-center gap-3">
              <Shield className="w-8 h-8 text-rose-600 drop-shadow-[0_0_12px_rgba(225,29,72,0.6)]" /> 
              VHSFLIX <span className="text-rose-500 font-mono italic text-xl sm:text-2xl font-light">PRO PANEL</span>
            </h1>
            <p className="text-xs text-zinc-400 font-sans mt-1 tracking-normal">
              Gestão de mídias, importador inteligente TMDB/Abyss, monitoramento de usuários e controle retro.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="px-3.5 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-center gap-2 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-zinc-400">STATUS:</span>
              <span className="text-emerald-400 font-bold">ONLINE</span>
            </div>
            <div className="px-3.5 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-center gap-2 text-xs font-mono text-zinc-300">
              <span className="text-zinc-500">TITULAR:</span>
              <span className="text-white font-bold">{currentUser.name || 'Admin'}</span>
            </div>
          </div>
        </div>

        {/* Estrutura Lateral Principal (Sidebar + Conteúdo das Abas) */}
        <div className="flex flex-col lg:flex-row gap-8 mt-2">
          
          {/* COLUNA DA ESQUERDA: SIDEBAR PROFISSIONAL */}
          <div className="w-full lg:w-64 flex-shrink-0">
            <div className="bg-zinc-900/80 border border-zinc-800/90 rounded-2xl p-4 sticky top-28 space-y-4 backdrop-blur-md shadow-xl">
              <div className="px-2 py-0.5 border-b border-zinc-800/80 pb-3 flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-rose-500 font-mono font-bold tracking-widest uppercase">Navegação Rápida</span>
                  <p className="text-[11px] text-zinc-400 mt-0.5 font-sans">Controles da Plataforma</p>
                </div>
                <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              </div>

              {/* Menu de Abas na Sidebar */}
              <nav className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 gap-2 scrollbar-none">
                <button
                  onClick={() => { setActiveAdminTab('dashboard'); setIsFormOpen(false); }}
                  className={`w-full px-3.5 py-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-start gap-3 transition-all truncate whitespace-nowrap cursor-pointer ${
                    activeAdminTab === 'dashboard'
                      ? 'bg-gradient-to-r from-rose-600 to-rose-700 text-white shadow-lg shadow-rose-600/20 font-bold translate-x-0.5'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                  }`}
                >
                  <LayoutDashboard className={`w-4.5 h-4.5 ${activeAdminTab === 'dashboard' ? 'text-white' : 'text-rose-500'}`} />
                  <span>Dashboard Principal</span>
                </button>

                <button
                  onClick={() => { setActiveAdminTab('catalog'); setIsFormOpen(false); }}
                  className={`w-full px-3.5 py-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-start gap-3 transition-all truncate whitespace-nowrap cursor-pointer ${
                    activeAdminTab === 'catalog'
                      ? 'bg-gradient-to-r from-rose-600 to-rose-700 text-white shadow-lg shadow-rose-600/20 font-bold translate-x-0.5'
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
                  onClick={() => { setActiveAdminTab('users'); setIsFormOpen(false); }}
                  className={`w-full px-3.5 py-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-start gap-3 transition-all truncate whitespace-nowrap cursor-pointer ${
                    activeAdminTab === 'users'
                      ? 'bg-gradient-to-r from-rose-600 to-rose-700 text-white shadow-lg shadow-rose-600/20 font-bold translate-x-0.5'
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
                  className={`w-full px-3.5 py-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-start gap-3 transition-all truncate whitespace-nowrap cursor-pointer ${
                    activeAdminTab === 'myaccount'
                      ? 'bg-gradient-to-r from-rose-600 to-rose-700 text-white shadow-lg shadow-rose-600/20 font-bold translate-x-0.5'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                  }`}
                  id="sidebar-btn-myaccount"
                >
                  <UserIcon className={`w-4.5 h-4.5 ${activeAdminTab === 'myaccount' ? 'text-white' : 'text-rose-500'}`} />
                  <span>Minha Conta</span>
                </button>

                <button
                  onClick={() => { setActiveAdminTab('settings'); setIsFormOpen(false); }}
                  className={`w-full px-3.5 py-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-start gap-3 transition-all truncate whitespace-nowrap cursor-pointer ${
                    activeAdminTab === 'settings'
                      ? 'bg-gradient-to-r from-rose-600 to-rose-700 text-white shadow-lg shadow-rose-600/20 font-bold translate-x-0.5'
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

            {/* --- ABA 0: DASHBOARD STATS GERAIS (MODERNIZADO E RESUMIDO) --- */}
            {activeAdminTab === 'dashboard' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                
                {/* HUD Resumido de Alta Visibilidade */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  
                  {/* Card 1: Catálogo */}
                  <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800/90 p-5 rounded-2xl shadow-xl relative overflow-hidden group hover:border-rose-500/40 transition-all">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-rose-600/10 rounded-full blur-xl pointer-events-none group-hover:bg-rose-600/20 transition-all" />
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] text-zinc-400 font-mono uppercase font-bold tracking-wider">Total de Mídias</span>
                        <p className="text-3xl font-black font-display text-white mt-1.5">{movies.length}</p>
                        <p className="text-xs text-zinc-400 mt-1">Fitas no Acervo</p>
                      </div>
                      <div className="p-2.5 bg-rose-500/10 border border-rose-500/25 text-rose-500 rounded-xl">
                        <Film className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-zinc-800/70 flex justify-between items-center text-[11px] font-mono">
                      <span className="text-emerald-400 font-bold flex items-center gap-1"><Play className="w-3 h-3 fill-emerald-400" /> {countMovies} Filmes</span>
                      <span className="text-sky-400 font-bold flex items-center gap-1"><Tv className="w-3 h-3" /> {countSeries} Séries</span>
                    </div>
                  </div>

                  {/* Card 2: Usuários e Perfis */}
                  <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800/90 p-5 rounded-2xl shadow-xl relative overflow-hidden group hover:border-emerald-500/40 transition-all">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-600/10 rounded-full blur-xl pointer-events-none group-hover:bg-emerald-600/20 transition-all" />
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] text-zinc-400 font-mono uppercase font-bold tracking-wider">Espectadores</span>
                        <p className="text-3xl font-black font-display text-emerald-400 mt-1.5">{users.length}</p>
                        <p className="text-xs text-zinc-400 mt-1">Contas Registradas</p>
                      </div>
                      <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 rounded-xl">
                        <Users className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-zinc-800/70 flex justify-between items-center text-[11px] font-mono text-zinc-400">
                      <span>👥 {totalSubProfiles} Subperfis</span>
                      <span className="text-emerald-400 font-bold">100% Conectados</span>
                    </div>
                  </div>

                  {/* Card 3: Saves e Avaliações */}
                  <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800/90 p-5 rounded-2xl shadow-xl relative overflow-hidden group hover:border-amber-500/40 transition-all">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-600/10 rounded-full blur-xl pointer-events-none group-hover:bg-amber-600/20 transition-all" />
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] text-zinc-400 font-mono uppercase font-bold tracking-wider">Favoritos</span>
                        <p className="text-3xl font-black font-display text-amber-400 mt-1.5">{totalMyListSoma}</p>
                        <p className="text-xs text-zinc-400 mt-1">Itens em Minha Lista</p>
                      </div>
                      <div className="p-2.5 bg-amber-500/10 border border-amber-500/25 text-amber-400 rounded-xl">
                        <Star className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-zinc-800/70 flex justify-between items-center text-[11px] font-mono text-zinc-400">
                      <span>Nota Média:</span>
                      <span className="text-amber-400 font-bold flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {mediaRating} / 10</span>
                    </div>
                  </div>

                  {/* Card 4: Execuções / Minutos */}
                  <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800/90 p-5 rounded-2xl shadow-xl relative overflow-hidden group hover:border-cyan-500/40 transition-all">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-600/10 rounded-full blur-xl pointer-events-none group-hover:bg-cyan-600/20 transition-all" />
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] text-zinc-400 font-mono uppercase font-bold tracking-wider">Minutos Rodados</span>
                        <p className="text-3xl font-black font-display text-cyan-400 mt-1.5">{totalMinutosReproduzidos}</p>
                        <p className="text-xs text-zinc-400 mt-1">Tempo de Play</p>
                      </div>
                      <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 rounded-xl">
                        <Clock className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-zinc-800/70 flex justify-between items-center text-[11px] font-mono text-zinc-400">
                      <span className="text-cyan-300 font-bold">{emProgresso} em Progresso</span>
                      <span className="text-emerald-400 font-bold">{fitasConcluidas} Concluídas</span>
                    </div>
                  </div>

                </div>

                {/* Card de Fita Destaque Resumido & Compacto */}
                {popularMovie && (
                  <div className="bg-gradient-to-r from-zinc-900 via-zinc-900/95 to-zinc-950 border border-zinc-800 p-5 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-5 relative overflow-hidden">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="bg-rose-500/15 border border-rose-500/30 text-rose-400 font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1.5">
                          <Flame className="w-3.5 h-3.5 text-rose-500 animate-pulse" /> Fita Mais Desejada
                        </span>
                        <span className="text-xs text-zinc-400 font-mono">{popularMovie.category} • {popularMovie.year}</span>
                      </div>
                      <h4 className="text-xl font-bold text-white font-display uppercase tracking-tight">{popularMovie.title}</h4>
                      <p className="text-xs text-zinc-400 line-clamp-2 max-w-2xl leading-relaxed">
                        {popularMovie.description}
                      </p>
                      <div className="pt-2 flex items-center gap-3 text-xs font-mono text-zinc-400">
                        <span className="flex items-center gap-1.5 text-rose-400 font-bold">
                          <TrendingUp className="w-3.5 h-3.5 text-rose-500" /> Salvo em {popularMovieCount} listas
                        </span>
                        <span>•</span>
                        <span className="text-amber-400 font-bold flex items-center gap-1">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {popularMovie.rating} Nota
                        </span>
                      </div>
                    </div>

                    <div className="w-24 sm:w-28 aspect-[2/3] rounded-xl overflow-hidden border border-zinc-750 shadow-2xl shrink-0 group">
                      <img
                        src={popularMovie.posterUrl}
                        alt={popularMovie.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                )}

                {/* Grid Duplo: Distribuição de Prateleiras e Integridade Operacional */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Gráfico Visual de Categorias */}
                  <div className="bg-zinc-900/90 border border-zinc-800 p-6 rounded-2xl shadow-xl space-y-4">
                    <div className="flex justify-between items-center border-b border-zinc-800/80 pb-3">
                      <h3 className="font-bold text-sm text-white font-display uppercase tracking-tight flex items-center gap-2">
                        <Activity className="w-4 h-4 text-rose-500" /> Distribuição por Gênero
                      </h3>
                      <span className="text-[10px] text-zinc-400 font-mono font-bold uppercase">{movies.length} Títulos</span>
                    </div>

                    <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                      {categoryStats.map(stat => (
                        <div key={stat.category} className="space-y-1.5">
                          <div className="flex justify-between font-mono text-[11px] text-zinc-300">
                            <span className="font-semibold">{stat.category}</span>
                            <span className="text-zinc-400 font-bold">{stat.count} {stat.count === 1 ? 'Volume' : 'Volumes'} ({Math.round(stat.percentage)}%)</span>
                          </div>
                          <div className="w-full bg-zinc-950 rounded-full h-2 border border-zinc-800 overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all duration-700" 
                              style={{ 
                                width: `${stat.percentage}%`,
                                background: `linear-gradient(90deg, #f43f5e, #e11d48)`
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Status Geral de Conectividade e Ações Rápidas */}
                  <div className="bg-zinc-900/90 border border-zinc-800 p-6 rounded-2xl shadow-xl flex flex-col justify-between space-y-5">
                    <div>
                      <div className="flex justify-between items-center border-b border-zinc-800/80 pb-3 mb-4">
                        <h3 className="font-bold text-sm text-white font-display uppercase tracking-tight flex items-center gap-2">
                          <Shield className="w-4 h-4 text-rose-500" /> Diagnóstico do Sistema
                        </h3>
                        <span className="bg-emerald-500/15 font-mono text-[9px] text-emerald-400 font-bold border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> OPERACIONAL
                        </span>
                      </div>

                      <div className="space-y-2.5 font-mono text-[11px]">
                        <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800/90 flex justify-between items-center">
                          <span className="text-zinc-400">INTEGRAÇÃO TMDB:</span>
                          <span className={tmdbApiKey ? "text-emerald-400 font-bold flex items-center gap-1" : "text-amber-400 font-bold"}>
                            {tmdbApiKey ? "✅ API V3 CONECTADA" : "⚠️ MODO CONTINGÊNCIA"}
                          </span>
                        </div>
                        <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800/90 flex justify-between items-center">
                          <span className="text-zinc-400">PLAYER ABYSS:</span>
                          <span className={abyssApiKey ? "text-emerald-400 font-bold" : "text-zinc-400 font-semibold"}>
                            {abyssApiKey ? "✅ SINTONIA AUTOMÁTICA" : "PADRÃO DISPONÍVEL"}
                          </span>
                        </div>
                        <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800/90 flex justify-between items-center">
                          <span className="text-zinc-400">PERSISTÊNCIA LOCAL:</span>
                          <span className="text-rose-400 font-bold">LOCALSTORAGE & SYNC</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-zinc-800/80 flex justify-between items-center text-[11px] text-zinc-400 font-mono">
                      <span>ÚLTIMA SINCRONIA: AGORA</span>
                      <button 
                        onClick={() => alert('Plataforma sincronizada e catálogo verificado.')}
                        className="flex items-center gap-2 px-4 py-2 bg-zinc-950 hover:bg-rose-600 hover:text-white border border-zinc-800 rounded-xl text-zinc-300 transition-all cursor-pointer font-bold active:scale-95 shadow-md"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-rose-500 group-hover:text-white" /> Sincronizar Fitas
                      </button>
                    </div>
                  </div>

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

                {/* Barra de Seleção, Pesquisa e Ações em Lote */}
                <div className="flex flex-col md:flex-row justify-between items-center bg-zinc-900/70 border border-zinc-800/80 px-5 py-3.5 rounded-2xl gap-3 shadow-md">
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

                  {selectedMovieIds.length > 0 && (
                    <div className="flex items-center gap-2 w-full md:w-auto">
                      <button
                        onClick={() => setSelectedMovieIds([])}
                        className="flex-1 sm:flex-initial text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 font-semibold font-mono text-[11px] px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-sm"
                      >
                        Limpar Seleção
                      </button>
                      <button
                        onClick={() => setShowBulkDeleteConfirm(true)}
                        className="flex-1 sm:flex-initial text-white bg-rose-600 hover:bg-rose-500 font-bold font-mono text-[11px] px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-rose-600/20"
                        id="btn-bulk-delete-movies"
                      >
                        <Trash className="w-3.5 h-3.5" /> Excluir Selecionados ({selectedMovieIds.length})
                      </button>
                    </div>
                  )}
                </div>

                {filteredAdminMovies.length === 0 && (
                  <div className="p-12 text-center bg-zinc-900/30 border border-zinc-850 rounded-2xl space-y-3 font-mono">
                    <Search className="w-10 h-10 text-rose-500 mx-auto opacity-60" />
                    <p className="text-sm text-zinc-200 font-bold">Nenhum título encontrado</p>
                    <p className="text-xs text-zinc-500">Nenhum filme ou série corresponde à busca "{catalogSearchQuery}".</p>
                  </div>
                )}

                {/* Grid Moderno de Mídias Cadastradas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredAdminMovies.map(movie => {
                    const isSelected = selectedMovieIds.includes(movie.id);
                    return (
                      <div 
                        key={movie.id}
                        className={`rounded-2xl border overflow-hidden flex shadow-lg transition-all duration-200 ${
                          isSelected 
                            ? 'border-rose-500 bg-zinc-900/80 ring-2 ring-rose-500/30 shadow-rose-950/30' 
                            : 'bg-zinc-950 border-zinc-850/80 hover:border-zinc-750 hover:shadow-xl'
                        }`}
                      >
                        <div className="w-28 flex-shrink-0 bg-zinc-900 relative">
                          <img 
                            src={movie.posterUrl} 
                            alt={movie.title} 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer"
                            onError={handlePosterError}
                          />
                          {/* Checkbox Overlay */}
                          <div className="absolute top-2 right-2 z-10 bg-black/60 p-1 rounded-lg backdrop-blur-md border border-white/10">
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
                                className="absolute top-2 left-2 w-3.5 h-3.5 rounded-full border-2 border-zinc-950 shadow-md" 
                                style={{ backgroundColor: finalTapeColor }}
                                title={`Cor do VHS / Categoria: ${movie.category}`}
                              />
                            );
                          })()}
                        </div>

                        <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="bg-zinc-900 text-[9px] font-mono border border-zinc-800 px-1.5 py-0.5 rounded-md text-zinc-300 uppercase font-bold">
                                {movie.type === 'movie' ? 'Filme' : 'Série'}
                              </span>
                              <span className="text-[10px] text-rose-400 font-mono font-bold uppercase">{movie.category}</span>
                            </div>
                            <h4 className="font-bold text-sm text-white mt-1.5 line-clamp-1 font-sans">{movie.title}</h4>
                            <p className="text-zinc-400 text-[11px] font-mono mt-0.5">{movie.year} • {movie.duration}</p>
                            <p className="text-zinc-400 text-xs mt-2 line-clamp-2 leading-relaxed">{movie.description}</p>
                          </div>

                          {/* Ações Rápidas */}
                          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-zinc-850/80 font-mono text-[11px]">
                            <span className="text-yellow-400 font-bold flex items-center gap-1">
                              <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" /> {movie.rating}
                            </span>
                            <div className="flex items-center gap-1.5">
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
                              <button
                                onClick={() => setMovieToDelete(movie)}
                                className="text-zinc-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-950/30 transition-colors border border-transparent hover:border-rose-500/30 cursor-pointer"
                                title="Excluir do catálogo"
                                id={`btn-delete-movie-${movie.id}`}
                              >
                                <Trash className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
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

                  {/* Status do TMDB API */}
                  {!tmdbApiKey && (
                    <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/25 text-[11px] text-amber-300 font-mono flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>
                        Sem chave TMDB definida. Utilizando o <strong>banco de importação inteligente integrado</strong>. Adicione uma chave na aba "Configurações" se desejar buscar no acervo mundial live.
                      </span>
                    </div>
                  )}

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
                      const existingDup = findDuplicateMovie(name, result.id);
                      
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
                                    <Check className="w-2.5 h-2.5 text-amber-400" /> No Acervo
                                  </span>
                                )}
                              </div>
                              <span className="text-zinc-400 font-mono text-[10px] block">
                                {year} • ★ {result.vote_average ? result.vote_average.toFixed(1) : 'N/D'} • {result.media_type === 'tv' ? 'Série' : 'Filme'}
                              </span>
                              {existingDup && (
                                <span className="text-[9px] text-amber-400/90 font-mono block">
                                  Cadastrado como: "{existingDup.title}"
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

                  {/* ALERTA DE RECONHECIMENTO DE DUPLICIDADE EM TEMPO REAL */}
                  {(() => {
                    const existingDup = findDuplicateMovie(formTitle, formTmdbId, editingMovie?.id);
                    if (!existingDup || !formTitle.trim()) return null;
                    return (
                      <div className="mb-5 p-4 bg-amber-950/40 border border-amber-500/50 rounded-2xl text-amber-300 text-xs flex items-start gap-3.5 shadow-xl animate-fade-in backdrop-blur-md">
                        <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0 mt-0.5 border border-amber-500/30">
                          <AlertTriangle className="w-4.5 h-4.5" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold uppercase tracking-wider text-amber-200 text-xs">Aviso de Mídia já Cadastrada no Acervo</span>
                            <span className="text-[9px] font-mono bg-amber-500/25 px-2 py-0.5 rounded-full text-amber-200 font-bold border border-amber-500/40">
                              {existingDup.type === 'series' ? 'SÉRIE' : 'FILME'}
                            </span>
                          </div>
                          <p className="text-zinc-200 text-xs leading-relaxed">
                            O título <strong className="text-amber-200 font-bold">"{existingDup.title}"</strong> ({existingDup.year} • {existingDup.category}) já consta cadastrado no acervo do VHSFLIX. Não é necessário duplicá-lo, a não ser que deseje criar uma versão alternativa.
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

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

                      {/* Cor da Carcaça do VHS */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-zinc-300 font-bold uppercase tracking-wider text-[10px]">Cor Física VHS (Tape Case)</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={formVhsTapeColor}
                            onChange={e => setFormVhsTapeColor(e.target.value)}
                            className="bg-transparent border-0 w-11 h-10 rounded-lg cursor-pointer flex-shrink-0"
                          />
                          <input
                            type="text"
                            value={formVhsTapeColor}
                            onChange={e => setFormVhsTapeColor(e.target.value)}
                            className="bg-zinc-950 border border-zinc-800 px-2 py-2.5 rounded-xl text-center w-full focus:outline-none focus:border-rose-500 uppercase font-mono text-xs text-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* ALERTA E STATUS DE AUTOMAÇÃO COM O ABYSS */}
                    {abyssStatusMessage && (
                      <div className={`p-3.5 rounded-xl border text-xs font-mono flex items-center justify-between gap-2 transition-all ${
                        abyssStatusMessage.type === 'success' 
                          ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' 
                          : abyssStatusMessage.type === 'warning' 
                          ? 'bg-amber-950/40 border-amber-500/30 text-amber-300' 
                          : abyssStatusMessage.type === 'error'
                          ? 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-300'
                      }`}>
                        <div className="flex items-center gap-2">
                          {isSearchingAbyss ? (
                            <RefreshCw className="w-3.5 h-3.5 text-rose-500 animate-spin flex-shrink-0" />
                          ) : abyssStatusMessage.type === 'success' ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                          )}
                          <span>{abyssStatusMessage.text}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAbyssStatusMessage(null)}
                          className="text-zinc-500 hover:text-white text-xs px-1 font-bold cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    {/* RELATÓRIO DE AUDITORIA DE IMPORTAÇÃO DE EPISÓDIOS */}
                    {auditReport && (
                      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-3 font-mono text-xs animate-fade-in shadow-2xl">
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                          <div className="flex items-center gap-2">
                            <Film className="w-4 h-4 text-rose-500" />
                            <span className="font-bold text-zinc-100 uppercase tracking-wider text-[11px]">
                              Relatório de Auditoria: {auditReport.seriesTitle}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setAuditReport(null)}
                            className="text-zinc-500 hover:text-zinc-200 px-2 py-0.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] cursor-pointer"
                          >
                            Fechar
                          </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          <div className="bg-zinc-900/80 border border-zinc-800 p-2.5 rounded-xl text-center">
                            <span className="text-[10px] text-zinc-500 block uppercase">Total Episódios</span>
                            <span className="text-sm font-bold text-zinc-200">{auditReport.totalEps}</span>
                          </div>
                          <div className="bg-emerald-950/30 border border-emerald-500/30 p-2.5 rounded-xl text-center">
                            <span className="text-[10px] text-emerald-400 block uppercase">Importados</span>
                            <span className="text-sm font-bold text-emerald-300">{auditReport.imported.length}</span>
                          </div>
                          <div className="bg-rose-950/30 border border-rose-500/30 p-2.5 rounded-xl text-center col-span-2 sm:col-span-1">
                            <span className="text-[10px] text-rose-400 block uppercase">Ignorados / Falhas</span>
                            <span className="text-sm font-bold text-rose-300">{auditReport.failed.length}</span>
                          </div>
                        </div>

                        {auditReport.failed.length > 0 && (
                          <div className="space-y-2 pt-1">
                            <div className="flex items-center justify-between text-[11px] font-bold text-rose-400 uppercase tracking-wider">
                              <span>Detalhamento de Falhas ({auditReport.failed.length})</span>
                              <span className="text-[10px] text-zinc-500 font-normal">RETENTATIVAS: 3x (2s DELAY)</span>
                            </div>
                            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                              {auditReport.failed.map((fail, idx) => (
                                <div key={idx} className="bg-zinc-900/90 border border-rose-500/20 p-2 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1">
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="px-1.5 py-0.5 bg-rose-950 text-rose-300 border border-rose-800 font-bold rounded text-[10px]">
                                      {fail.tag}
                                    </span>
                                    <span className="text-zinc-300 font-medium">
                                      Temp. {fail.season}, Ep. {fail.episode}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-zinc-400 font-normal truncate max-w-md">
                                    <span className="text-rose-400 font-semibold">Motivo:</span> {fail.reason}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {auditReport.imported.length > 0 && (
                          <div className="text-[10px] text-emerald-400 flex items-center gap-1.5 pt-1 border-t border-zinc-900">
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>{auditReport.imported.length} episódios foram sintonizados e salvos com sucesso no formulário.</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* CONFIGURAÇÃO DE EMBED URL PERSONALIZADO (FILME / SÉRIE) */}
                    {formType === 'movie' ? (
                      <div className="flex flex-col gap-2 bg-zinc-950/60 p-4 border border-zinc-800 rounded-2xl">
                        <div className="flex items-center justify-between">
                          <label className="text-zinc-300 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span> URL do Player / Embed URL (Filme)
                          </label>
                          <span className="text-[9px] text-rose-400 font-mono font-bold bg-rose-950/50 border border-rose-500/20 px-2 py-0.5 rounded-full">AUTOMÁTICO ABYSS</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={formEmbedUrl}
                            onChange={e => setFormEmbedUrl(e.target.value)}
                            placeholder="https://play.abyssplayer.com/{id}"
                            className="flex-1 bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-rose-500 text-xs text-zinc-100 font-mono"
                          />
                          <button
                            type="button"
                            onClick={handleManualAbyssMovieSearch}
                            disabled={isSearchingAbyss || !formTitle.trim()}
                            className="px-3.5 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-md"
                            title="Pesquisar vídeo automaticamente na API do Abyss"
                          >
                            {isSearchingAbyss ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 fill-current" />}
                            <span>Buscar no Abyss</span>
                          </button>
                        </div>
                        <span className="text-[9px] text-zinc-500 leading-relaxed font-mono">
                          Preenchido automaticamente ao importar do TMDB (formato: https://play.abyssplayer.com/&#123;id&#125;).
                        </span>
                      </div>
                    ) : (
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
                                      placeholder="https://play.abyssplayer.com/{id}"
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

        {/* --- ABA 2: USUÁRIOS REGISTRADOS --- */}
        {activeAdminTab === 'users' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            
            {/* Lista Completa de Usuários e Estatísticas Gerais */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800/90 p-5 rounded-2xl shadow-xl relative overflow-hidden group hover:border-rose-500/30 transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-zinc-400 font-mono uppercase font-bold tracking-wider">Total de Contas</span>
                    <p className="text-3xl font-black font-display text-white mt-1">{users.length}</p>
                    <p className="text-xs text-rose-400 font-mono mt-1 font-semibold">Titulares Registrados</p>
                  </div>
                  <div className="p-2.5 bg-rose-500/10 border border-rose-500/25 text-rose-500 rounded-xl">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800/90 p-5 rounded-2xl shadow-xl relative overflow-hidden group hover:border-emerald-500/30 transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-zinc-400 font-mono uppercase font-bold tracking-wider">Subperfis Ativos</span>
                    <p className="text-3xl font-black font-display text-emerald-400 mt-1">
                      {Object.values(allProfiles).reduce((acc, pList) => acc + pList.length, 0)}
                    </p>
                    <p className="text-xs text-zinc-400 mt-1 font-sans">Navegando independentemente</p>
                  </div>
                  <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 rounded-xl">
                    <Shield className="w-5 h-5" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800/90 p-5 rounded-2xl shadow-xl relative overflow-hidden group hover:border-amber-500/30 transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-zinc-400 font-mono uppercase font-bold tracking-wider">Fitas Salvas</span>
                    <p className="text-3xl font-black font-display text-amber-400 mt-1">
                      {Object.values(allProfiles).reduce((acc, pList) => acc + pList.reduce((accP, p) => accP + p.myList.length, 0), 0)}
                    </p>
                    <p className="text-xs text-zinc-400 mt-1 font-sans">Favoritos nos perfis</p>
                  </div>
                  <div className="p-2.5 bg-amber-500/10 border border-amber-500/25 text-amber-400 rounded-xl">
                    <Star className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </div>

            {/* Container Principal da Tabela de Usuários com Barra de Pesquisa */}
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
              <div className="px-6 py-5 border-b border-zinc-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-zinc-950/40">
                <div>
                  <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-400 text-[10px] font-mono font-bold tracking-wider uppercase mb-1">
                    Gerenciamento de Assinantes
                  </div>
                  <h3 className="font-bold text-xl text-white font-display">Banco de Contas & Espectadores</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Gerencie os acessos, senhas, tempos de expiração e subperfis de cada família.</p>
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
                      className="w-full bg-zinc-950 border border-zinc-800 pl-9 pr-3 py-2 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 font-sans transition-all"
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

                  <button
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
                  </button>
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
                          <p className="text-sm font-semibold text-zinc-400">Nenhum usuário encontrado</p>
                          <p className="text-xs text-zinc-600 font-mono mt-1">Tente pesquisar por outro termo ou cadastre um novo usuário.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map(u => {
                        const listProfiles = allProfiles[u.id] || [];
                        const isMasterAdmin = u.email === 'rafaelguaruja09@gmail.com' || u.id === 'u1';
                        
                        return (
                          <tr key={u.id} className="hover:bg-zinc-800/30 transition-colors">
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-600/20 to-zinc-900 border border-rose-500/30 text-rose-400 flex items-center justify-center font-black font-display uppercase font-mono shadow-inner shrink-0">
                                  {u.name.substring(0, 2)}
                                </div>
                                <div>
                                  <span className="font-semibold block text-zinc-100">{u.name}</span>
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
                                <button
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
                                </button>
                                
                                {!isMasterAdmin && (
                                  <button
                                    onClick={() => {
                                      setUserToDelete(u);
                                    }}
                                    className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white transition-all border border-rose-500/20 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
                                    title="Excluir Usuário"
                                  >
                                    <Trash className="w-3.5 h-3.5" /> <span>Excluir</span>
                                  </button>
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
                            src={userFormAvatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}
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

        {/* --- ABA: MINHA CONTA --- */}
        {activeAdminTab === 'myaccount' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="max-w-2xl bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl backdrop-blur-md"
          >
            <div className="border-b border-zinc-800 pb-5">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-400 text-[10px] font-mono font-bold tracking-wider uppercase mb-1">
                Credenciais Master
              </div>
              <h3 className="font-bold text-2xl text-white font-display tracking-tight flex items-center gap-2.5">
                <Shield className="w-6 h-6 text-rose-500" /> Minha Conta Administrativa
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Gerencie suas credenciais de acesso, e-mail do titular e senha de segurança master.
              </p>
            </div>

            {(() => {
              const adminActiveProfile = allProfiles[currentUserId]?.find(p => p.id === currentProfileId) || allProfiles[currentUserId]?.[0];
              if (!adminActiveProfile) return null;
              return (
                <div className="flex flex-col sm:flex-row items-center gap-5 bg-zinc-950/60 p-5 rounded-2xl border border-zinc-800/80 shadow-inner">
                  <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-rose-500 shadow-xl shrink-0 group">
                    <img src={adminActiveProfile.avatarUrl} alt="Foto de perfil" className="w-full h-full object-cover group-hover:scale-110 transition-transform" referrerPolicy="no-referrer" />
                  </div>
                  <div className="text-center sm:text-left flex-1">
                    <span className="text-[10px] font-mono text-rose-400 uppercase tracking-widest font-bold">Perfil em Uso</span>
                    <p className="text-base font-black text-white mt-0.5 font-display">{adminActiveProfile.name}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setAdminCustomAvatarUrl(adminActiveProfile.avatarUrl);
                        const matchingIdx = PROFILE_AVATARS.findIndex(avatar => avatar.url === adminActiveProfile.avatarUrl);
                        setAdminSelectedAvatarIdx(matchingIdx !== -1 ? matchingIdx : 0);
                        setShowAdminAvatarModal(true);
                      }}
                      className="text-xs text-rose-400 hover:text-white font-mono font-bold uppercase tracking-wider mt-3 cursor-pointer flex items-center justify-center sm:justify-start gap-1.5 p-2 bg-zinc-900 hover:bg-rose-600 border border-zinc-800 rounded-xl px-3 transition-all active:scale-95 shadow"
                    >
                      <Edit className="w-3.5 h-3.5" /> Alterar Minha Foto de Perfil
                    </button>
                  </div>
                </div>
              );
            })()}

            <div className="space-y-3 py-3 rounded-2xl bg-zinc-950/60 p-5 border border-zinc-800/80 font-mono text-xs">
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
                <label className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">Endereço de E-mail</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500 text-xs uppercase font-mono">@</span>
                  <input
                    type="email"
                    required
                    value={myAccountEmail}
                    onChange={(e) => setMyAccountEmail(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-rose-500 rounded-xl py-3 pl-9 pr-4 text-sm text-white focus:outline-none transition-colors font-mono"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">Alterar Senha Administrativa</label>
                <div className="relative flex items-center">
                  <LockIcon className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-500 pointer-events-none" />
                  <input
                    type={showMyAccountPass ? "text" : "password"}
                    required
                    placeholder="Sua nova senha"
                    value={myAccountPassword}
                    onChange={(e) => setMyAccountPassword(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-rose-500 rounded-xl py-3 pl-10 pr-12 text-sm text-white focus:outline-none transition-colors font-mono"
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

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold py-3.5 rounded-xl text-xs font-mono uppercase tracking-wider transition-all shadow-lg shadow-rose-600/20 active:scale-95 cursor-pointer"
              >
                Salvar Alterações da Conta
              </button>
            </form>
          </motion.div>
        )}

        {/* --- ABA 3: CONFIGURAÇÕES E CREDENCIAIS TMDB --- */}
        {activeAdminTab === 'settings' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            
            {/* Bloco TMDB Config */}
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 space-y-5 shadow-xl backdrop-blur-md">
              <div className="border-b border-zinc-800 pb-4">
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-400 text-[10px] font-mono font-bold tracking-wider uppercase mb-1">
                  TMDB Live Engine
                </div>
                <h3 className="font-bold text-lg text-white font-display uppercase tracking-tight flex items-center gap-2">
                  <Settings className="w-5 h-5 text-rose-500" /> API de Busca do TMDB
                </h3>
                <p className="text-xs text-zinc-400 mt-1">Insira suas chaves de API do The Movie Database para habilitar buscas ilimitadas mundiais com metadados e posters em alta resolução.</p>
              </div>

              <div className="space-y-4 text-xs font-mono">
                <div className="flex flex-col gap-1.5">
                  <label className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">TMDB API KEY v3</label>
                  <input
                    type="password"
                    placeholder="Cole aqui sua api_key do TMDB v3"
                    value={tmdbApiKey}
                    onChange={e => onUpdateTmdbApiKey(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 px-3.5 py-3 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                    id="input-tmdb-key-entry"
                  />
                  <p className="text-[11px] text-zinc-400 mt-1.5 leading-relaxed">
                    Você pode obter esta chave gratuitamente fazendo cadastro rápido em <a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer" className="text-rose-400 underline hover:text-rose-300 font-bold">themoviedb.org</a> sob a seção de Desenvolvedores.
                  </p>
                </div>

                <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800 flex items-start gap-3">
                  <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-zinc-200 block font-sans">Status da Conexão TMDB</span>
                    <span className="text-[11px] text-zinc-400 mt-1 block leading-relaxed font-mono">
                      {tmdbApiKey ? 'Chave personalizada conectada. Buscas live ativas com preenchimento em lote!' : 'Utilizando banco de dados retro local de contingência.'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bloco Abyss API Config */}
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 space-y-5 shadow-xl backdrop-blur-md">
              <div className="border-b border-zinc-800 pb-4">
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-400 text-[10px] font-mono font-bold tracking-wider uppercase mb-1">
                  Abyss Stream Player
                </div>
                <h3 className="font-bold text-lg text-white font-display uppercase tracking-tight flex items-center gap-2">
                  <Play className="w-5 h-5 text-rose-500" /> API do Player Abyss (GET /v1/resources)
                </h3>
                <p className="text-xs text-zinc-400 mt-1">Sintonizador automático de player de mídia embutido (https://play.abyssplayer.com/&#123;id&#125;).</p>
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
                    className="w-full bg-zinc-950 border border-zinc-800 px-3.5 py-3 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                    id="input-abyss-key-entry"
                  />
                  <p className="text-[11px] text-zinc-400 mt-1.5 leading-relaxed">
                    Com esta chave ativa, ao buscar no TMDB o campo Embed URL é preenchido automaticamente com o player correspondente.
                  </p>
                </div>

                <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800 flex items-start gap-3">
                  <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-zinc-200 block font-sans">Sintonização Automática</span>
                    <span className="text-[11px] text-zinc-400 mt-1 block leading-relaxed font-mono">
                      {abyssApiKey ? 'Chave do Abyss ativa! Preenchimento automático ativado.' : 'Utilizando chave padrão do servidor para automação.'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bloco de Versionamento e Sincronização Global */}
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 space-y-5 col-span-1 md:col-span-2 shadow-xl backdrop-blur-md">
              <div className="border-b border-zinc-800 flex justify-between items-start gap-4 flex-wrap pb-4">
                <div>
                  <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] font-mono font-bold tracking-wider uppercase mb-1">
                    Rede Global & Cache
                  </div>
                  <h3 className="font-bold text-lg text-emerald-400 font-display uppercase tracking-tight flex items-center gap-2">
                    <RefreshCw className="w-5 h-5" /> Sincronização e Versionamento Global
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Força todos os aparelhos conectados (Smart TVs, Celulares, Tablets, PCs) a limparem o cache local e atualizarem o acervo.
                  </p>
                </div>
                <div className="bg-zinc-950 px-3.5 py-1.5 rounded-xl border border-zinc-800 font-mono text-xs text-zinc-400">
                  Sinal de Versão: <span className="text-white font-bold">{localStorage.getItem('vhsflix_system_version') || '1.0.0'}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4.5 bg-zinc-950 rounded-2xl border border-zinc-800 flex flex-col justify-between">
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
                  <button
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
                  </button>
                </div>
              </div>
            </div>

            {/* Bloco Configurações de Fábrica e Reset GERAL */}
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 space-y-5 col-span-1 md:col-span-2 shadow-xl backdrop-blur-md">
              <div className="border-b border-zinc-800 pb-4">
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-400 text-[10px] font-mono font-bold tracking-wider uppercase mb-1">
                  Segurança Crítica
                </div>
                <h3 className="font-bold text-lg text-rose-500 font-display uppercase tracking-tight flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5" /> Zona de Risco Administrativa
                </h3>
                <p className="text-xs text-zinc-400 mt-1">Efetue restaurações do acervo ou reinicializações completas do catálogo.</p>
              </div>

              <div className="space-y-4">
                <div className="bg-rose-500/5 p-5 rounded-2xl border border-rose-500/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex gap-3 items-start">
                    <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-zinc-200 font-sans leading-none">Restaurar Catálogo Padrão Original</p>
                      <p className="text-xs text-zinc-400 font-sans mt-1.5 leading-relaxed max-w-xl">
                        Esta operação restabelece o catálogo inicial retrô do VHSFLIX (clássicos como *De Volta para o Futuro*, *Alien*, *Stranger Things*, etc.).
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      setShowCatalogResetConfirm(true);
                    }}
                    className="bg-zinc-950 hover:bg-rose-600 hover:text-white border border-rose-500/40 text-rose-400 px-5 py-2.5 rounded-xl text-xs font-mono font-bold uppercase transition-all tracking-wider text-center cursor-pointer active:scale-95 shadow shrink-0"
                    id="btn-hard-reset-catalog"
                  >
                    Resetar Catálogo
                  </button>
                </div>
              </div>
            </div>

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
              <h3 className="text-lg font-bold text-white mb-2 font-display">Remover do Catálogo?</h3>
              <p className="text-xs text-zinc-400 mb-6 leading-relaxed font-sans">
                Deseja realmente excluir <strong className="text-zinc-200">"{movieToDelete.title}"</strong> permanentemente do acervo VHSFLIX?
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
                  Remover Mídia
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
