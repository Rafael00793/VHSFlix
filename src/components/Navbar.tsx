/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, Shield, LogOut, RefreshCw, UserCheck, Film, Tv, List, Sliders, ChevronDown, MessageSquare, Heart } from 'lucide-react';
import { User, Profile, AppNotification, Movie, getSubscriptionDaysLeft } from '../types';
import { GENRE_CATEGORIES } from '../data';
import { motion, AnimatePresence } from 'motion/react';

interface NavbarProps {
  user: User;
  activeProfile: Profile;
  profiles: Profile[];
  onSelectProfile: (profileId: string) => void;
  onLogoutProfile: () => void;
  onSwitchUser: () => void;
  searchVal: string;
  onSearchChange: (val: string) => void;
  activeTab: 'all' | 'movies' | 'series' | 'mylist' | 'requests' | 'support';
  onTabChange: (tab: 'all' | 'movies' | 'series' | 'mylist' | 'requests' | 'support') => void;
  isAdminView: boolean;
  onToggleAdminView: (val: boolean) => void;
  notifications: AppNotification[];
  onNotificationClick: (movieId: string, notificationId: string) => void;
  onMarkAllAsRead: () => void;
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
  movies: Movie[];
}

export default function Navbar({
  user,
  activeProfile,
  profiles,
  onSelectProfile,
  onLogoutProfile,
  onSwitchUser,
  searchVal,
  onSearchChange,
  activeTab,
  onTabChange,
  isAdminView,
  onToggleAdminView,
  notifications,
  onNotificationClick,
  onMarkAllAsRead,
  selectedCategory,
  onSelectCategory,
  movies
}: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [showGenresDropdown, setShowGenresDropdown] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const genresRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Monitora clique fora para fechar dropdown de perfil, de notificações e de gêneros
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotificationsDropdown(false);
      }
      if (genresRef.current && !genresRef.current.contains(event.target as Node)) {
        setShowGenresDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Monitora scroll para alterar opacidade do fundo (igual Netflix original)
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 40) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav 
      className={`fixed top-0 left-0 w-full z-40 transition-all duration-500 font-sans ${
        isScrolled 
          ? 'bg-zinc-950/95 shadow-md border-b border-zinc-900 backdrop-blur-md py-3' 
          : 'bg-gradient-to-b from-black/80 via-black/40 to-transparent py-5'
      }`}
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 flex items-center justify-between">
        
        {/* Lado Esquerdo: Logo e Navegação de Abas */}
        <div className="flex items-center gap-3 sm:gap-6 md:gap-10">
          
          {/* Logo VHSFLIX Animado Moderno */}
          <motion.button 
            onClick={() => {
              onSelectCategory(null);
              onToggleAdminView(false);
              onTabChange('all');
            }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="relative flex items-center group cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none rounded-xl p-1 select-none"
            id="navbar-logo-vhsflix"
          >
            {/* Efeito de Brilho Neon Atrás do Logo */}
            <div className="absolute -inset-1.5 bg-gradient-to-r from-rose-600/30 via-red-600/20 to-rose-500/10 rounded-2xl blur-md opacity-50 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            
            <div className="relative z-10 flex items-center leading-none">
              <span className="text-2xl xs:text-3xl md:text-4xl font-black font-display tracking-wider text-rose-500 group-hover:text-rose-400 transition-colors drop-shadow-[0_0_15px_rgba(244,63,94,0.7)]">
                VHS
              </span>
              <span className="text-white italic text-lg xs:text-xl md:text-2xl font-mono font-extrabold ml-0.5 tracking-tight group-hover:text-rose-100 transition-colors drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]">
                FLIX
              </span>
              <span className="relative flex h-2 w-2 ml-1 self-start mt-0.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 shadow-[0_0_6px_#f43f5e]" />
              </span>
            </div>
          </motion.button>

          {/* Abas Estilo Netflix (Oculta se estiver no Admin) */}
          {!isAdminView && (
            <ul className="hidden md:flex items-center gap-5 text-sm font-medium text-zinc-300">
              {/* Aba "Apoiar o Canal" em primeiro lugar conforme solicitado */}
              <li>
                <button
                  onClick={() => {
                    onSelectCategory(null);
                    onTabChange('support');
                  }}
                  className={`transition-all py-1 flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none rounded-xl px-3 font-bold cursor-pointer text-xs shadow-sm ${
                    activeTab === 'support'
                      ? 'bg-rose-600 text-white font-black shadow-md shadow-rose-600/30 ring-1 ring-rose-400'
                      : 'text-rose-300 hover:text-white bg-rose-950/40 border border-rose-500/30 hover:bg-rose-900/60 hover:border-rose-400 shadow-rose-950/20'
                  }`}
                  id="navbar-apoiar-canal-btn"
                >
                  <Heart className={`w-3.5 h-3.5 ${activeTab === 'support' ? 'fill-white text-white' : 'fill-rose-500 text-rose-500 animate-pulse'}`} />
                  <span>Apoiar o Canal</span>
                </button>
              </li>

              <li>
                <button
                  onClick={() => {
                    onSelectCategory(null);
                    onTabChange('all');
                  }}
                  className={`transition-colors py-1 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none rounded px-1.5 ${activeTab === 'all' && !selectedCategory ? 'text-white font-bold border-b-2 border-rose-600' : 'hover:text-zinc-400'}`}
                >
                  Início
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    onSelectCategory(null);
                    onTabChange('movies');
                  }}
                  className={`transition-colors py-1 flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none rounded px-1.5 ${activeTab === 'movies' ? 'text-white font-bold border-b-2 border-rose-600' : 'hover:text-zinc-400'}`}
                >
                  <Film className="w-3.5 h-3.5" /> Filmes
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    onSelectCategory(null);
                    onTabChange('series');
                  }}
                  className={`transition-colors py-1 flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none rounded px-1.5 ${activeTab === 'series' ? 'text-white font-bold border-b-2 border-rose-600' : 'hover:text-zinc-400'}`}
                >
                  <Tv className="w-3.5 h-3.5" /> Séries
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    onSelectCategory(null);
                    onTabChange('mylist');
                  }}
                  className={`transition-colors py-1 flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none rounded px-1.5 ${activeTab === 'mylist' ? 'text-white font-bold border-b-2 border-rose-600' : 'hover:text-zinc-400'}`}
                >
                  <List className="w-3.5 h-3.5" /> Minha Lista
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    onSelectCategory(null);
                    onTabChange('requests');
                  }}
                  className={`transition-colors py-1 flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none rounded px-1.5 ${activeTab === 'requests' ? 'text-white font-bold border-b-2 border-rose-600' : 'hover:text-zinc-400'}`}
                >
                  <MessageSquare className="w-3.5 h-3.5" /> Pedidos
                </button>
              </li>
              <li className="relative" ref={genresRef}>
                <button
                  onClick={() => setShowGenresDropdown(!showGenresDropdown)}
                  className={`transition-colors py-1 flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none rounded px-1.5 cursor-pointer ${
                    selectedCategory ? 'text-rose-500 font-bold border-b-2 border-rose-600' : 'text-zinc-300 hover:text-white'
                  }`}
                  id="navbar-categories-trigger"
                >
                  <span>Categorias</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${showGenresDropdown ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown com grid de todas as categorias */}
                <AnimatePresence>
                  {showGenresDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute left-0 mt-2 w-[420px] bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl p-4 grid grid-cols-3 gap-2 z-50 backdrop-blur-lg animate-fade-in font-sans"
                    >
                      {GENRE_CATEGORIES.map((category) => {
                        const isSelected = (category === 'Todos' && selectedCategory === null) || selectedCategory === category;
                        return (
                          <button
                            key={category}
                            onClick={() => {
                              onSelectCategory(category === 'Todos' ? null : category);
                              setShowGenresDropdown(false);
                            }}
                            className={`text-[10px] px-3 py-2.5 text-left rounded transition-all font-bold uppercase tracking-wider cursor-pointer border ${
                              isSelected
                                ? 'bg-rose-600 border-rose-500 text-white font-black shadow-md shadow-rose-600/20'
                                : 'text-zinc-400 bg-zinc-950/20 hover:bg-zinc-900 border-zinc-900 hover:border-rose-500 hover:text-white'
                            }`}
                          >
                            {category}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            </ul>
          )}

          {/* HUD de Indicação de Visualização Admin */}
          {isAdminView && (
            <div className="flex items-center gap-2 bg-red-600/10 border border-red-500/40 text-red-400 px-3 py-1 rounded text-xs font-bold font-mono uppercase tracking-wider">
              <Shield className="w-3.5 h-3.5 animate-pulse" /> Painel de Administração
            </div>
          )}
        </div>

        {/* Lado Direito: Busca, Filtros, Menu Perfil */}
        <div className="flex items-center gap-1.5 xs:gap-3 sm:gap-5">
          
          {/* Barra de Busca Animada (Oculta se Admin) */}
          {!isAdminView && (
            <div className="relative flex items-center">
              <motion.div
                initial={false}
                animate={{ width: isSearchExpanded || searchVal ? (typeof window !== 'undefined' && window.innerWidth < 480 ? 130 : 210) : 38 }}
                transition={{ type: "spring", stiffness: 350, damping: 26 }}
                className={`flex items-center bg-zinc-950/90 backdrop-blur-md border rounded-full py-1 px-2.5 xs:py-1.5 xs:px-3 overflow-hidden transition-all duration-300 ${
                  isSearchExpanded || searchVal 
                    ? 'border-rose-500/50 shadow-[0_0_12px_rgba(225,29,72,0.15)] ring-1 ring-rose-500/20' 
                    : 'border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/40'
                }`}
              >
                <button
                  onClick={() => setIsSearchExpanded(!isSearchExpanded)}
                  className={`p-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none rounded-full transition-colors duration-200 cursor-pointer ${
                    isSearchExpanded || searchVal ? 'text-rose-500' : 'text-zinc-400 hover:text-white'
                  }`}
                  id="btn-search-toggle"
                  title="Pesquisar fita VHS"
                >
                  <Search className="w-3.5 h-3.5 xs:w-4 xs:h-4" />
                </button>
                <input
                  type="text"
                  value={searchVal}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Buscar..."
                  className="bg-transparent border-none text-[11px] xs:text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none w-full ml-1.5 font-sans tracking-wide"
                />
                {(isSearchExpanded || searchVal) && (
                  <button
                    onClick={() => {
                      onSearchChange('');
                      setIsSearchExpanded(false);
                    }}
                    className="text-zinc-500 hover:text-rose-400 text-xs px-1 transition-colors duration-150 cursor-pointer ml-1"
                  >
                    ✕
                  </button>
                )}
              </motion.div>
            </div>
          )}

          {/* Badge de assinatura */}
          {!user.isAdmin && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-full font-mono text-[10px] font-bold select-none shadow">
              <span className={`w-1.5 h-1.5 rounded-full ${getSubscriptionDaysLeft(user) <= 5 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
              <span>{getSubscriptionDaysLeft(user)} dias restantes</span>
            </div>
          )}

          {/* Botão de Dropdown de Perfis */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="flex items-center gap-1.5 p-1 rounded-lg hover:bg-zinc-900 transition-colors focus:outline-none"
              id="navbar-profile-dropdown"
            >
              <img
                src={activeProfile.avatarUrl}
                alt={activeProfile.name}
                className="w-8 h-8 rounded object-cover border border-zinc-800 select-none pointer-events-none"
                referrerPolicy="no-referrer"
                draggable="false"
              />
              <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${showProfileDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Menu Dropdown de Perfil */}
            <AnimatePresence>
              {showProfileDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2.5 w-64 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden font-mono text-xs"
                >
                  {user.isAdmin ? (
                    /* Menu Exclusivo para o Administrador (Rafael Gusmão) - Apenas o Painel de Controle */
                    <div className="p-3 bg-zinc-950 flex flex-col gap-2">
                      <div className="px-1 py-1 text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center justify-between border-b border-zinc-900 pb-2">
                        <span>Painel do Administrador</span>
                        <span className="text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded text-[9px] border border-rose-500/20">ADM</span>
                      </div>

                      <button
                        onClick={() => {
                          onToggleAdminView(!isAdminView);
                          setShowProfileDropdown(false);
                        }}
                        className={`w-full py-3 px-4 rounded-lg font-bold transition-all flex items-center justify-center gap-2.5 shadow-lg cursor-pointer text-xs font-sans uppercase tracking-wider ${
                          isAdminView
                            ? 'bg-rose-950/40 text-rose-400 border border-rose-500/40 hover:bg-rose-900/60 shadow-rose-950/20'
                            : 'bg-zinc-900 hover:bg-zinc-850 text-white border border-zinc-750 hover:border-rose-500/60 shadow-black'
                        }`}
                        id="nav-admin-panel-link"
                      >
                        <Shield className="w-4 h-4 text-rose-500 animate-pulse" />
                        <span>{isAdminView ? 'Sair do Painel Admin' : 'Painel de Controle'}</span>
                      </button>

                      <button
                        onClick={() => {
                          onSwitchUser();
                          setShowProfileDropdown(false);
                        }}
                        className="w-full text-zinc-500 hover:text-zinc-300 py-1.5 px-2 text-center text-[10px] transition-colors mt-1"
                        id="btn-switch-account-alt"
                      >
                        Mudar de Conta
                      </button>
                    </div>
                  ) : (
                    /* Menu Exclusivo para Usuários - Verde Neon Vibrante com Dias de Acesso */
                    <div className="p-3.5 bg-zinc-950/95 border border-[#00ff66]/40 rounded-xl shadow-[0_0_25px_rgba(0,255,102,0.18)] flex flex-col font-sans">
                      <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-wider text-[#00ff66] mb-2 drop-shadow-[0_0_6px_rgba(0,255,102,0.8)] border-b border-[#00ff66]/20 pb-2">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#00ff66] shadow-[0_0_8px_#00ff66] animate-pulse" />
                          Tempo de Acesso
                        </span>
                        <span className="text-zinc-400 font-normal">VHSFLIX</span>
                      </div>

                      {/* Display em Destaque Verde Neon Vibrante */}
                      <div className="my-2 p-3 bg-[#00ff66]/10 border-2 border-[#00ff66] rounded-xl text-center shadow-[0_0_20px_rgba(0,255,102,0.2)]">
                        <div className="text-3xl font-black text-[#00ff66] tracking-tight font-mono drop-shadow-[0_0_12px_rgba(0,255,102,0.9)]">
                          {getSubscriptionDaysLeft(user)} {getSubscriptionDaysLeft(user) === 1 ? 'DIA' : 'DIAS'}
                        </div>
                        <div className="text-[10px] font-extrabold text-[#00ff66] uppercase tracking-widest mt-0.5 drop-shadow-[0_0_5px_rgba(0,255,102,0.6)]">
                          DE ACESSO RESTANTES
                        </div>
                      </div>

                      {/* Barra de Progresso Neon */}
                      <div className="w-full bg-zinc-900 h-2.5 rounded-full overflow-hidden border border-[#00ff66]/40 shadow-inner my-1.5">
                        <div 
                          className="h-full bg-[#00ff66] rounded-full transition-all duration-500 shadow-[0_0_10px_#00ff66]" 
                          style={{ width: `${Math.min(100, (getSubscriptionDaysLeft(user) / 30) * 100)}%` }}
                        />
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-zinc-900 flex flex-col gap-1.5">
                        <button
                          onClick={() => {
                            onLogoutProfile();
                            setShowProfileDropdown(false);
                          }}
                          className="w-full text-zinc-400 hover:text-white hover:bg-zinc-900 py-2 px-3 rounded-lg text-xs transition-colors flex items-center justify-between border border-zinc-850"
                          id="btn-logout-profile"
                        >
                          <span className="flex items-center gap-2">
                            <Sliders className="w-3.5 h-3.5 text-zinc-500" />
                            <span>Gerenciar Perfis</span>
                          </span>
                        </button>

                        <button
                          onClick={() => {
                            onSwitchUser();
                            setShowProfileDropdown(false);
                          }}
                          className="w-full text-zinc-400 hover:text-white hover:bg-zinc-900 py-2 px-3 rounded-lg text-xs transition-colors flex items-center justify-between border border-zinc-850"
                          id="btn-switch-account-alt"
                        >
                          <span className="flex items-center gap-2">
                            <UserCheck className="w-3.5 h-3.5 text-zinc-500" />
                            <span>Mudar de Conta</span>
                          </span>
                        </button>
                      </div>

                      <div className="mt-2.5 text-[10px] text-zinc-500 text-center font-mono truncate pt-1 border-t border-zinc-900/60">
                        Logado como: <strong className="text-zinc-300">{user.name}</strong>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Abas mobile estilo Netflix com Pílulas e Scroll Horizontal Fluído */}
      {!isAdminView && (
        <div className="md:hidden border-t border-zinc-900/80 bg-zinc-950/95 backdrop-blur-md py-2.5 px-3 overflow-x-auto no-scrollbar scroll-smooth">
          <div className="flex items-center gap-2 min-w-max text-xs font-medium">
            {/* 1º BOTÃO: APOIAR O CANAL (EM DESTAQUE PRIMEIRO LUGAR) */}
            <button
              onClick={() => {
                onSelectCategory(null);
                onTabChange('support');
              }}
              className={`px-3 py-1.5 rounded-full font-black transition-all text-xs flex-shrink-0 flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-md ${
                activeTab === 'support'
                  ? 'bg-rose-600 text-white ring-2 ring-rose-400 shadow-rose-600/40'
                  : 'bg-rose-950/70 text-rose-300 border border-rose-500/50 hover:bg-rose-900/80 hover:text-white shadow-rose-950/30'
              }`}
              id="mobile-nav-apoiar-btn"
            >
              <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500 animate-pulse" />
              <span>Apoiar Canal</span>
            </button>

            {/* 2º BOTÃO: INÍCIO */}
            <button
              onClick={() => {
                onSelectCategory(null);
                onTabChange('all');
              }}
              className={`px-3.5 py-1.5 rounded-full font-bold transition-all text-xs flex-shrink-0 cursor-pointer whitespace-nowrap ${
                activeTab === 'all' && !selectedCategory
                  ? 'bg-zinc-100 text-black font-extrabold shadow-md'
                  : 'bg-zinc-900/90 text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-800'
              }`}
            >
              Início
            </button>

            {/* 3º BOTÃO: FILMES */}
            <button
              onClick={() => {
                onSelectCategory(null);
                onTabChange('movies');
              }}
              className={`px-3.5 py-1.5 rounded-full font-bold transition-all text-xs flex-shrink-0 cursor-pointer whitespace-nowrap ${
                activeTab === 'movies'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 border border-rose-500'
                  : 'bg-zinc-900/90 text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-800'
              }`}
            >
              Filmes
            </button>

            {/* 4º BOTÃO: SÉRIES */}
            <button
              onClick={() => {
                onSelectCategory(null);
                onTabChange('series');
              }}
              className={`px-3.5 py-1.5 rounded-full font-bold transition-all text-xs flex-shrink-0 cursor-pointer whitespace-nowrap ${
                activeTab === 'series'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 border border-rose-500'
                  : 'bg-zinc-900/90 text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-800'
              }`}
            >
              Séries
            </button>

            {/* 5º BOTÃO: MINHA LISTA */}
            <button
              onClick={() => {
                onSelectCategory(null);
                onTabChange('mylist');
              }}
              className={`px-3.5 py-1.5 rounded-full font-bold transition-all text-xs flex-shrink-0 cursor-pointer whitespace-nowrap ${
                activeTab === 'mylist'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 border border-rose-500'
                  : 'bg-zinc-900/90 text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-800'
              }`}
            >
              Minha Lista
            </button>

            {/* 6º BOTÃO: PEDIDOS */}
            <button
              onClick={() => {
                onSelectCategory(null);
                onTabChange('requests');
              }}
              className={`px-3.5 py-1.5 rounded-full font-bold transition-all text-xs flex-shrink-0 cursor-pointer whitespace-nowrap ${
                activeTab === 'requests'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 border border-rose-500'
                  : 'bg-zinc-900/90 text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-800'
              }`}
            >
              Pedidos
            </button>

            {/* 7º BOTÃO: GÊNEROS */}
            <button
              onClick={() => setShowGenresDropdown(!showGenresDropdown)}
              className={`px-3.5 py-1.5 rounded-full font-bold transition-all text-xs flex-shrink-0 flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                selectedCategory
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 border border-rose-500'
                  : 'bg-zinc-900/90 text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-800'
              }`}
            >
              <span>{selectedCategory ? selectedCategory : 'Gêneros'}</span>
              <ChevronDown className="w-3 h-3 text-zinc-400" />
            </button>
          </div>
        </div>
      )}

      {/* Popover De Categorias para Mobile */}
      <AnimatePresence>
        {showGenresDropdown && (
          <div className="md:hidden fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm">
            {/* Overlay Clickable to Close */}
            <div className="absolute inset-0" onClick={() => setShowGenresDropdown(false)} />
            
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="w-full bg-zinc-950 border-t border-zinc-800 rounded-t-2xl p-5 font-sans relative z-10"
              style={{ maxHeight: "75vh" }}
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-900">
                <span className="text-xs font-mono uppercase tracking-widest text-rose-500 font-bold">Navegar por Gêneros</span>
                <button
                  onClick={() => setShowGenresDropdown(false)}
                  className="text-zinc-500 hover:text-zinc-300 font-bold font-mono text-xs cursor-pointer p-1"
                >
                  Fechar ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 overflow-y-auto max-h-[50vh] no-scrollbar py-1">
                {GENRE_CATEGORIES.map((category) => {
                  const isSelected = (category === 'Todos' && selectedCategory === null) || selectedCategory === category;
                  return (
                    <button
                      key={category}
                      onClick={() => {
                        onSelectCategory(category === 'Todos' ? null : category);
                        setShowGenresDropdown(false);
                      }}
                      className={`text-xs px-3 py-3 text-center rounded transition-all font-bold uppercase tracking-wider cursor-pointer border ${
                        isSelected
                          ? 'bg-rose-600 border-rose-500 text-white font-black shadow-md'
                          : 'text-zinc-400 bg-zinc-900/55 border-zinc-850 hover:bg-zinc-800 hover:text-white'
                      }`}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </nav>
  );
}
