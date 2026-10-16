/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, Shield, LogOut, RefreshCw, UserCheck, Film, Tv, List, Sliders, ChevronDown, MessageSquare, Heart, Sparkles, Clock, Send, ExternalLink } from 'lucide-react';
import { User, Profile, AppNotification, Movie, getSubscriptionDaysLeft } from '../types';
import { GENRE_CATEGORIES } from '../data';
import { motion, AnimatePresence } from 'motion/react';
import { VhsTapeIcon } from './VhsTapeIcon';

interface NavbarProps {
  user: User;
  activeProfile: Profile;
  profiles: Profile[];
  onSelectProfile: (profileId: string) => void;
  onLogoutProfile: () => void;
  onSwitchUser: () => void;
  searchVal: string;
  onSearchChange: (val: string) => void;
  activeTab: 'all' | 'releases' | 'movies' | 'series' | 'mylist' | 'continue_watching' | 'requests' | 'support';
  onTabChange: (tab: 'all' | 'releases' | 'movies' | 'series' | 'mylist' | 'continue_watching' | 'requests' | 'support') => void;
  isAdminView: boolean;
  onToggleAdminView: (val: boolean) => void;
  notifications: AppNotification[];
  onNotificationClick: (movieId: string, notificationId: string) => void;
  onMarkAllAsRead: () => void;
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
  movies: Movie[];
  onOpenModifyProfile?: () => void;
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
  movies,
  onOpenModifyProfile
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
              <span className="text-2xl xs:text-3xl md:text-4xl font-black font-display tracking-wider text-red-600 group-hover:text-red-500 transition-colors drop-shadow-[0_0_15px_rgba(239,68,68,0.7)]">
                VHS
              </span>
              <span className="text-white italic text-lg xs:text-xl md:text-2xl font-mono font-extrabold ml-0.5 tracking-tight group-hover:text-red-100 transition-colors drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]">
                FLIX
              </span>
            </div>
          </motion.button>

          {/* Abas Estilo Moderno Vermelho Vibrante (Oculta se estiver no Admin) */}
          {!isAdminView && (
            <ul className="hidden md:flex items-center gap-5 text-sm font-medium text-zinc-300">
              {/* Aba "Apoiar o Canal" em primeiro lugar */}
              <li>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    onSelectCategory(null);
                    onTabChange('support');
                  }}
                  className={`transition-all py-1 flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none rounded-xl px-3 font-bold cursor-pointer text-xs shadow-sm ${
                    activeTab === 'support'
                      ? 'bg-red-600 text-white font-black shadow-[0_0_15px_rgba(239,68,68,0.4)] ring-1 ring-red-500'
                      : 'text-zinc-300 hover:text-red-400 bg-zinc-900/80 border border-zinc-700/60 hover:bg-zinc-850 hover:border-red-500/50'
                  }`}
                  id="navbar-apoiar-canal-btn"
                >
                  <Heart className={`w-3.5 h-3.5 ${activeTab === 'support' ? 'fill-white text-white' : 'fill-red-500 text-red-500'}`} />
                  <span>Apoiar o Canal</span>
                </motion.button>
              </li>

              <li>
                <motion.button
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => {
                    onSelectCategory(null);
                    onTabChange('all');
                  }}
                  className={`transition-all py-1.5 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none rounded-lg px-2 cursor-pointer relative ${
                    activeTab === 'all' && !selectedCategory 
                      ? 'text-red-400 font-black drop-shadow-[0_0_10px_rgba(239,68,68,0.6)]' 
                      : 'text-zinc-300 hover:text-white hover:bg-zinc-900/60'
                  }`}
                >
                  <span>Início</span>
                  {activeTab === 'all' && !selectedCategory && (
                    <motion.div layoutId="navbarActiveIndicator" className="absolute bottom-0 left-1 right-1 h-0.5 bg-red-600 shadow-[0_0_8px_#ef4444] rounded-full" />
                  )}
                </motion.button>
              </li>
              <li>
                <motion.button
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => {
                    onSelectCategory(null);
                    onTabChange('releases');
                  }}
                  className={`transition-all py-1.5 flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none rounded-lg px-2 cursor-pointer relative ${
                    activeTab === 'releases' 
                      ? 'text-red-400 font-black drop-shadow-[0_0_10px_rgba(239,68,68,0.6)]' 
                      : 'text-zinc-300 hover:text-white hover:bg-zinc-900/60'
                  }`}
                  id="navbar-tab-releases"
                >
                  <VhsTapeIcon size={18} animated={true} />
                  <span>Lançamentos</span>
                  {activeTab === 'releases' && (
                    <motion.div layoutId="navbarActiveIndicator" className="absolute bottom-0 left-1 right-1 h-0.5 bg-red-600 shadow-[0_0_8px_#ef4444] rounded-full" />
                  )}
                </motion.button>
              </li>
              <li>
                <motion.button
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => {
                    onSelectCategory(null);
                    onTabChange('movies');
                  }}
                  className={`transition-all py-1.5 flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none rounded-lg px-2 cursor-pointer relative ${
                    activeTab === 'movies' 
                      ? 'text-red-400 font-black drop-shadow-[0_0_10px_rgba(239,68,68,0.6)]' 
                      : 'text-zinc-300 hover:text-white hover:bg-zinc-900/60'
                  }`}
                >
                  <Film className="w-3.5 h-3.5" /> <span>Filmes</span>
                  {activeTab === 'movies' && (
                    <motion.div layoutId="navbarActiveIndicator" className="absolute bottom-0 left-1 right-1 h-0.5 bg-red-600 shadow-[0_0_8px_#ef4444] rounded-full" />
                  )}
                </motion.button>
              </li>
              <li>
                <motion.button
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => {
                    onSelectCategory(null);
                    onTabChange('series');
                  }}
                  className={`transition-all py-1.5 flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none rounded-lg px-2 cursor-pointer relative ${
                    activeTab === 'series' 
                      ? 'text-red-400 font-black drop-shadow-[0_0_10px_rgba(239,68,68,0.6)]' 
                      : 'text-zinc-300 hover:text-white hover:bg-zinc-900/60'
                  }`}
                >
                  <Tv className="w-3.5 h-3.5" /> <span>Séries</span>
                  {activeTab === 'series' && (
                    <motion.div layoutId="navbarActiveIndicator" className="absolute bottom-0 left-1 right-1 h-0.5 bg-red-600 shadow-[0_0_8px_#ef4444] rounded-full" />
                  )}
                </motion.button>
              </li>
              <li>
                <motion.button
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => {
                    onSelectCategory(null);
                    onTabChange('mylist');
                  }}
                  className={`transition-all py-1.5 flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none rounded-lg px-2 cursor-pointer relative ${
                    activeTab === 'mylist' 
                      ? 'text-red-400 font-black drop-shadow-[0_0_10px_rgba(239,68,68,0.6)]' 
                      : 'text-zinc-300 hover:text-white hover:bg-zinc-900/60'
                  }`}
                >
                  <List className="w-3.5 h-3.5" /> <span>Minha Lista</span>
                  {activeTab === 'mylist' && (
                    <motion.div layoutId="navbarActiveIndicator" className="absolute bottom-0 left-1 right-1 h-0.5 bg-red-600 shadow-[0_0_8px_#ef4444] rounded-full" />
                  )}
                </motion.button>
              </li>
              <li>
                <motion.button
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => {
                    onSelectCategory(null);
                    onTabChange('requests');
                  }}
                  className={`transition-all py-1.5 flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none rounded-lg px-2 cursor-pointer relative ${
                    activeTab === 'requests' 
                      ? 'text-red-400 font-black drop-shadow-[0_0_10px_rgba(239,68,68,0.6)]' 
                      : 'text-zinc-300 hover:text-white hover:bg-zinc-900/60'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" /> <span>Pedidos</span>
                  {activeTab === 'requests' && (
                    <motion.div layoutId="navbarActiveIndicator" className="absolute bottom-0 left-1 right-1 h-0.5 bg-red-600 shadow-[0_0_8px_#ef4444] rounded-full" />
                  )}
                </motion.button>
              </li>
              <li className="relative" ref={genresRef}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowGenresDropdown(!showGenresDropdown)}
                  className={`transition-all py-1.5 flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none rounded-lg px-2 cursor-pointer ${
                    selectedCategory ? 'text-red-400 font-black drop-shadow-[0_0_10px_rgba(239,68,68,0.6)]' : 'text-zinc-300 hover:text-white hover:bg-zinc-900/60'
                  }`}
                  id="navbar-categories-trigger"
                >
                  <span>Categorias</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform text-zinc-400 ${showGenresDropdown ? 'rotate-180 text-red-500' : ''}`} />
                </motion.button>

                {/* Dropdown com grid de todas as categorias */}
                <AnimatePresence>
                  {showGenresDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute left-0 mt-2 w-[420px] bg-zinc-950 border border-zinc-800 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.8)] p-4 grid grid-cols-3 gap-2 z-50 backdrop-blur-xl animate-fade-in font-sans"
                    >
                      {GENRE_CATEGORIES.map((category) => {
                        const isSelected = (category === 'Todos' && selectedCategory === null) || selectedCategory === category;
                        return (
                          <motion.button
                            key={category}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => {
                              onSelectCategory(category === 'Todos' ? null : category);
                              setShowGenresDropdown(false);
                            }}
                            className={`text-[10px] px-3 py-2.5 text-left rounded-lg transition-all font-bold uppercase tracking-wider cursor-pointer border ${
                              isSelected
                                ? 'bg-red-600 border-red-500 text-white font-black shadow-[0_0_12px_rgba(239,68,68,0.4)]'
                                : 'text-zinc-400 bg-zinc-950/20 hover:bg-zinc-900 border-zinc-900 hover:border-red-500/50 hover:text-white'
                            }`}
                          >
                            {category}
                          </motion.button>
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
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-zinc-900 transition-colors focus:outline-none"
              id="navbar-profile-dropdown"
            >
              <img
                src={activeProfile.avatarUrl}
                alt={activeProfile.name}
                className="w-10 h-10 rounded-xl object-cover border-2 border-zinc-700 shadow-md select-none pointer-events-none hover:border-[#00ff66]/70 transition-colors"
                referrerPolicy="no-referrer"
                draggable="false"
              />
              <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${showProfileDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Menu Dropdown de Perfil */}
            <AnimatePresence>
              {showProfileDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2.5 w-64 max-w-[calc(100vw-24px)] bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden font-mono text-xs"
                >
                  {user.isAdmin ? (
                    /* Menu Exclusivo para o Administrador (Rafael Gusmão) - Apenas o Painel de Controle */
                    <div className="p-3.5 bg-zinc-950 flex flex-col gap-2.5 font-sans">
                      <div className="px-1 py-1 text-[10px] text-zinc-400 font-mono font-bold uppercase tracking-wider flex items-center justify-between border-b border-zinc-850 pb-2">
                        <span className="flex items-center gap-1.5 text-zinc-300">
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                          Painel do Administrador
                        </span>
                        <span className="text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full text-[9px] border border-rose-500/30 font-bold">ADM</span>
                      </div>

                      {/* Botão Painel de Controle */}
                      <button
                        onClick={() => {
                          onToggleAdminView(!isAdminView);
                          setShowProfileDropdown(false);
                        }}
                        className={`w-full py-2.5 px-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2.5 shadow-lg cursor-pointer text-xs uppercase tracking-wider ${
                          isAdminView
                            ? 'bg-rose-950/50 text-rose-300 border border-rose-500/50 hover:bg-rose-900/60 shadow-rose-950/30'
                            : 'bg-zinc-900 hover:bg-zinc-850 text-white border border-zinc-750 hover:border-rose-500/60 shadow-black'
                        }`}
                        id="nav-admin-panel-link"
                      >
                        <Shield className="w-4 h-4 text-rose-500 animate-pulse" />
                        <span>{isAdminView ? 'Sair do Painel Admin' : 'Painel de Controle'}</span>
                      </button>

                      {/* Botão Modificar Perfil (Com Foto Maior, Sem Sparkles, Apenas 'Modificar Perfil') */}
                      <button
                        onClick={() => {
                          if (onOpenModifyProfile) onOpenModifyProfile();
                          setShowProfileDropdown(false);
                        }}
                        className="relative overflow-hidden w-full text-white bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-rose-950/40 hover:to-rose-900/40 py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-between border border-zinc-750 hover:border-rose-500 hover:shadow-[0_0_20px_rgba(229,9,20,0.35)] group cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                        id="btn-modify-profile-admin"
                      >
                        {/* Shimmer suave no hover */}
                        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />

                        <div className="flex items-center gap-3 relative z-10">
                          {/* Imagem do Perfil Maior e Limpa (Sem Sparkles) */}
                          <div className="relative w-11 h-11 rounded-xl overflow-hidden border-2 border-rose-500/70 shadow-[0_0_12px_rgba(229,9,20,0.35)] flex-shrink-0 group-hover:border-rose-400 transition-colors">
                            <img
                              src={activeProfile.avatarUrl}
                              alt={activeProfile.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              referrerPolicy="no-referrer"
                            />
                          </div>

                          <span className="font-extrabold text-white text-xs group-hover:text-rose-200 transition-colors">
                            Modificar Perfil
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-zinc-400 group-hover:text-rose-400 transition-colors relative z-10">
                          <span className="text-xs font-mono group-hover:translate-x-0.5 transition-transform">&rarr;</span>
                        </div>
                      </button>

                      {/* Botão Sair da Conta (ADM) */}
                      <div className="pt-1 border-t border-zinc-850">
                        <button
                          type="button"
                          onClick={() => {
                            setShowProfileDropdown(false);
                            onLogoutProfile();
                          }}
                          className="w-full text-rose-400 hover:text-white bg-rose-950/25 hover:bg-rose-600 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border border-rose-900/60 hover:border-rose-500 shadow-md group cursor-pointer active:scale-[0.98]"
                          id="btn-logout-admin"
                        >
                          <LogOut className="w-4 h-4 text-rose-400 group-hover:text-white group-hover:-translate-x-0.5 transition-transform" />
                          <span>Sair da Conta</span>
                        </button>
                      </div>

                      <div className="text-[10px] text-zinc-500 text-center font-mono truncate pt-1">
                        Logado como: <strong className="text-zinc-300">{user.name}</strong>
                      </div>
                    </div>
                  ) : (
                    /* Menu Exclusivo para Usuários - Verde Neon Vibrante com Dias de Acesso */
                    <div className="p-3.5 bg-zinc-950/98 border border-[#00ff66]/40 rounded-2xl shadow-[0_0_25px_rgba(0,255,102,0.18)] flex flex-col font-sans">
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

                      {/* Botão Modificar Perfil (Foto Maior, Sem Sparkles, Apenas 'Modificar Perfil') */}
                      <div className="mt-3 pt-2.5 border-t border-zinc-900 flex flex-col gap-2">
                        <button
                          onClick={() => {
                            if (onOpenModifyProfile) onOpenModifyProfile();
                            setShowProfileDropdown(false);
                          }}
                          className="relative overflow-hidden w-full text-white bg-gradient-to-r from-zinc-900 via-zinc-900 to-[#00ff66]/15 hover:to-[#00ff66]/25 py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-between border border-zinc-800 hover:border-[#00ff66]/80 hover:shadow-[0_0_20px_rgba(0,255,102,0.35)] group cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                          id="btn-modify-profile"
                        >
                          {/* Shimmer suave no hover */}
                          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />

                          <div className="flex items-center gap-3 relative z-10">
                            {/* Imagem do Perfil Maior e Limpa (Sem Sparkles) */}
                            <div className="relative w-11 h-11 rounded-xl overflow-hidden border-2 border-[#00ff66]/70 shadow-[0_0_12px_rgba(0,255,102,0.35)] flex-shrink-0 group-hover:border-[#00ff66] transition-colors">
                              <img
                                src={activeProfile.avatarUrl}
                                alt={activeProfile.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                referrerPolicy="no-referrer"
                              />
                            </div>

                            <span className="font-extrabold text-white text-xs group-hover:text-[#00ff66] transition-colors">
                              Modificar Perfil
                            </span>
                          </div>

                          <div className="flex items-center gap-1 text-zinc-400 group-hover:text-[#00ff66] transition-colors relative z-10">
                            <span className="text-xs font-mono group-hover:translate-x-0.5 transition-transform">&rarr;</span>
                          </div>
                        </button>

                        {/* Botão Falar com o Administrador - VHS Flix (Exclusivo para Usuários) */}
                        <a
                          href="https://t.me/VHSFLIX2026"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative overflow-hidden w-full text-white bg-gradient-to-r from-zinc-900 via-zinc-900 to-[#229ED9]/20 hover:to-[#229ED9]/35 py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-between border border-zinc-800 hover:border-[#229ED9]/80 hover:shadow-[0_0_20px_rgba(34,158,217,0.35)] group cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                          id="btn-contact-admin-telegram-navbar"
                        >
                          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />

                          <div className="flex items-center gap-3 relative z-10">
                            <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-gradient-to-br from-[#229ED9] to-[#0088cc] flex items-center justify-center text-white shadow-[0_0_12px_rgba(34,158,217,0.4)] flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                              <Send className="w-5 h-5 text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                            </div>

                            <div className="flex flex-col text-left">
                              <span className="font-extrabold text-white text-xs group-hover:text-cyan-200 transition-colors">
                                Falar com o Administrador - VHS Flix
                              </span>
                              <span className="text-[10px] text-[#229ED9] font-medium">
                                Atendimento direto pelo Telegram
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 text-zinc-400 group-hover:text-[#229ED9] transition-colors relative z-10">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </div>
                        </a>

                        {/* Botão Sair da Conta (Usuário) */}
                        <button
                          type="button"
                          onClick={() => {
                            setShowProfileDropdown(false);
                            onLogoutProfile();
                          }}
                          className="w-full text-rose-400 hover:text-white bg-rose-950/25 hover:bg-rose-600 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border border-rose-900/60 hover:border-rose-500 shadow-md group cursor-pointer active:scale-[0.98]"
                          id="btn-logout-user"
                        >
                          <LogOut className="w-4 h-4 text-rose-400 group-hover:text-white group-hover:-translate-x-0.5 transition-transform" />
                          <span>Sair da Conta</span>
                        </button>
                      </div>

                      <div className="mt-2 text-[10px] text-zinc-500 text-center font-mono truncate pt-1 border-t border-zinc-900/60">
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

      {/* Abas mobile estilo moderno neon com Pílulas e Scroll Horizontal Fluído */}
      {!isAdminView && (
        <div className="md:hidden border-t border-zinc-900/80 bg-zinc-950/95 backdrop-blur-md py-2.5 px-3 overflow-x-auto no-scrollbar scroll-smooth">
          <div className="flex items-center gap-2 min-w-max text-xs font-medium">
            {/* 1º BOTÃO: APOIAR O CANAL */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                onSelectCategory(null);
                onTabChange('support');
              }}
              className={`px-3.5 py-2 rounded-full font-black transition-all text-xs flex-shrink-0 flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-md min-h-[38px] ${
                activeTab === 'support'
                  ? 'bg-red-600 text-white ring-2 ring-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                  : 'bg-zinc-900/90 text-zinc-300 border border-zinc-700/60 hover:border-red-500/50 hover:text-red-400'
              }`}
              id="mobile-nav-apoiar-btn"
            >
              <Heart className={`w-3.5 h-3.5 ${activeTab === 'support' ? 'fill-white text-white' : 'fill-red-500 text-red-500'}`} />
              <span>Apoiar Canal</span>
            </motion.button>

            {/* 2º BOTÃO: INÍCIO */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                onSelectCategory(null);
                onTabChange('all');
              }}
              className={`px-3.5 py-2 rounded-full font-bold transition-all text-xs flex-shrink-0 cursor-pointer whitespace-nowrap min-h-[38px] flex items-center ${
                activeTab === 'all' && !selectedCategory
                  ? 'bg-red-600 text-white font-extrabold shadow-[0_0_15px_rgba(239,68,68,0.5)] border border-red-500'
                  : 'bg-zinc-900/90 text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-800'
              }`}
            >
              Início
            </motion.button>

            {/* BOTÃO: LANÇAMENTOS (Ao lado de Início) */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                onSelectCategory(null);
                onTabChange('releases');
              }}
              className={`px-3.5 py-2 rounded-full font-bold transition-all text-xs flex-shrink-0 cursor-pointer whitespace-nowrap flex items-center gap-1.5 min-h-[38px] ${
                activeTab === 'releases'
                  ? 'bg-red-600 text-white font-extrabold shadow-[0_0_15px_rgba(239,68,68,0.5)] border border-red-500'
                  : 'bg-zinc-900/90 text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-800'
              }`}
              id="mobile-nav-releases-btn"
            >
              <VhsTapeIcon size={18} animated={true} />
              <span>Lançamentos</span>
            </motion.button>

            {/* 3º BOTÃO: FILMES */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                onSelectCategory(null);
                onTabChange('movies');
              }}
              className={`px-3.5 py-2 rounded-full font-bold transition-all text-xs flex-shrink-0 cursor-pointer whitespace-nowrap flex items-center gap-1.5 min-h-[38px] ${
                activeTab === 'movies'
                  ? 'bg-red-600 text-white font-extrabold shadow-[0_0_15px_rgba(239,68,68,0.5)] border border-red-500'
                  : 'bg-zinc-900/90 text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-800'
              }`}
            >
              <span>Filmes</span>
            </motion.button>

            {/* 4º BOTÃO: SÉRIES */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                onSelectCategory(null);
                onTabChange('series');
              }}
              className={`px-3.5 py-2 rounded-full font-bold transition-all text-xs flex-shrink-0 cursor-pointer whitespace-nowrap flex items-center gap-1.5 min-h-[38px] ${
                activeTab === 'series'
                  ? 'bg-red-600 text-white font-extrabold shadow-[0_0_15px_rgba(239,68,68,0.5)] border border-red-500'
                  : 'bg-zinc-900/90 text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-800'
              }`}
            >
              <span>Séries</span>
            </motion.button>

            {/* 5º BOTÃO: MINHA LISTA */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                onSelectCategory(null);
                onTabChange('mylist');
              }}
              className={`px-3.5 py-2 rounded-full font-bold transition-all text-xs flex-shrink-0 cursor-pointer whitespace-nowrap min-h-[38px] flex items-center ${
                activeTab === 'mylist'
                  ? 'bg-red-600 text-white font-extrabold shadow-[0_0_15px_rgba(239,68,68,0.5)] border border-red-500'
                  : 'bg-zinc-900/90 text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-800'
              }`}
            >
              Minha Lista
            </motion.button>

            {/* 6º BOTÃO: PEDIDOS */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                onSelectCategory(null);
                onTabChange('requests');
              }}
              className={`px-3.5 py-2 rounded-full font-bold transition-all text-xs flex-shrink-0 cursor-pointer whitespace-nowrap min-h-[38px] flex items-center ${
                activeTab === 'requests'
                  ? 'bg-red-600 text-white font-extrabold shadow-[0_0_15px_rgba(239,68,68,0.5)] border border-red-500'
                  : 'bg-zinc-900/90 text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-800'
              }`}
            >
              Pedidos
            </motion.button>

            {/* 7º BOTÃO: GÊNEROS */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowGenresDropdown(!showGenresDropdown)}
              className={`px-3.5 py-2 rounded-full font-bold transition-all text-xs flex-shrink-0 flex items-center gap-1 cursor-pointer whitespace-nowrap min-h-[38px] ${
                selectedCategory
                  ? 'bg-red-600 text-white font-extrabold shadow-[0_0_15px_rgba(239,68,68,0.5)] border border-red-500'
                  : 'bg-zinc-900/90 text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-800'
              }`}
            >
              <span>{selectedCategory ? selectedCategory : 'Gêneros'}</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showGenresDropdown ? 'rotate-180 text-white' : 'text-zinc-400'}`} />
            </motion.button>
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
                <span className="text-xs font-mono uppercase tracking-widest text-red-500 font-bold">Navegar por Gêneros</span>
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
                      className={`text-xs px-3 py-3 text-center rounded-xl transition-all font-bold uppercase tracking-wider cursor-pointer border ${
                        isSelected
                          ? 'bg-red-600 border-red-500 text-white font-black shadow-[0_0_12px_rgba(239,68,68,0.4)]'
                          : 'text-zinc-400 bg-zinc-900/55 border-zinc-850 hover:bg-zinc-800 hover:text-white hover:border-red-500/50'
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
