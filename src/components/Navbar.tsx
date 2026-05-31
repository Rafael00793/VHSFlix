/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, Shield, LogOut, RefreshCw, UserCheck, Film, Tv, List, Sliders, ChevronDown } from 'lucide-react';
import { User, Profile, AppNotification } from '../types';
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
  activeTab: 'all' | 'movies' | 'series' | 'mylist';
  onTabChange: (tab: 'all' | 'movies' | 'series' | 'mylist') => void;
  isAdminView: boolean;
  onToggleAdminView: (val: boolean) => void;
  vhsMode: boolean;
  onToggleVhsMode: () => void;
  notifications: AppNotification[];
  onNotificationClick: (movieId: string, notificationId: string) => void;
  onMarkAllAsRead: () => void;
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
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
  vhsMode,
  onToggleVhsMode,
  notifications,
  onNotificationClick,
  onMarkAllAsRead,
  selectedCategory,
  onSelectCategory
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
          
          {/* Logo VHSFLIX */}
          <button 
            onClick={() => {
              onToggleAdminView(false);
              onTabChange('all');
            }}
            className="flex flex-col items-start leading-none group text-left focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none focus-visible:scale-102 rounded p-0.5"
          >
            <span className="text-xl xs:text-2xl md:text-3xl font-black font-display tracking-widest text-rose-600 group-hover:text-rose-500 transition-colors text-neon-glow leading-none select-none">
              VHS<span className="text-white italic text-base md:text-lg font-mono align-super">FLIX</span>
            </span>
            <span className="text-[8px] text-rose-500/80 font-mono tracking-widest mt-0.5 font-bold uppercase hidden md:inline">Retro Tube v2.0</span>
          </button>

          {/* Abas Estilo Netflix (Oculta se estiver no Admin) */}
          {!isAdminView && (
            <ul className="hidden md:flex items-center gap-5 text-sm font-medium text-zinc-300">
              <li>
                <button
                  onClick={() => onTabChange('all')}
                  className={`transition-colors py-1 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none rounded px-1.5 ${activeTab === 'all' ? 'text-white font-bold border-b-2 border-rose-600' : 'hover:text-zinc-400'}`}
                >
                  Início
                </button>
              </li>
              <li>
                <button
                  onClick={() => onTabChange('movies')}
                  className={`transition-colors py-1 flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none rounded px-1.5 ${activeTab === 'movies' ? 'text-white font-bold border-b-2 border-rose-600' : 'hover:text-zinc-400'}`}
                >
                  <Film className="w-3.5 h-3.5" /> Filmes
                </button>
              </li>
              <li>
                <button
                  onClick={() => onTabChange('series')}
                  className={`transition-colors py-1 flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none rounded px-1.5 ${activeTab === 'series' ? 'text-white font-bold border-b-2 border-rose-600' : 'hover:text-zinc-400'}`}
                >
                  <Tv className="w-3.5 h-3.5" /> Séries
                </button>
              </li>
              <li>
                <button
                  onClick={() => onTabChange('mylist')}
                  className={`transition-colors py-1 flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none rounded px-1.5 ${activeTab === 'mylist' ? 'text-white font-bold border-b-2 border-rose-600' : 'hover:text-zinc-400'}`}
                >
                  <List className="w-3.5 h-3.5" /> Minha Lista
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

        {/* Lado Direito: Busca, Filtros, VHS Mode, Menu Perfil */}
        <div className="flex items-center gap-1.5 xs:gap-3 sm:gap-5">
          
          {/* Seletor de modo fita VHS (Ligar / Desligar Scanlines CRT) */}
          <button
            onClick={onToggleVhsMode}
            className={`border rounded-full px-2 py-0.5 xs:px-3 xs:py-1 flex items-center gap-1 xs:gap-1.5 transition-all text-[9px] xs:text-xs font-mono font-bold select-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none ${
              vhsMode 
                ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-md shadow-amber-500/10' 
                : 'border-zinc-800 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300 bg-zinc-900/50'
            }`}
            title="Ligar efeito estético VHS de Tubo CRT"
            id="vhs-aesthetic-toggle"
          >
            <span className={`w-1 xs:w-1.5 h-1 xs:h-1.5 rounded-full ${vhsMode ? 'bg-amber-400 animate-pulse' : 'bg-zinc-650'}`}></span>
            <span className="truncate max-w-[55px] xs:max-w-none">VHS MODE</span>
          </button>

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

          {/* Botão Notificações */}
          <div className="relative flex items-center" ref={notificationsRef}>
            <button
              onClick={() => {
                setShowNotificationsDropdown(!showNotificationsDropdown);
                setShowProfileDropdown(false);
              }}
              className="text-zinc-400 hover:text-white relative p-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none rounded-full transition-colors cursor-pointer"
              id="navbar-notifications-btn"
              title="Notificações de Lançamentos"
            >
              <Bell className="w-4 h-4 xs:w-4.5 xs:h-4.5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-rose-600 rounded-full animate-pulse border border-zinc-950"></span>
              )}
            </button>

            {/* Dropdown Menu de Notificações */}
            <AnimatePresence>
              {showNotificationsDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-12 w-[calc(100vw-1.5rem)] xs:w-80 sm:w-96 bg-zinc-950 border border-zinc-900 rounded-lg shadow-2xl z-[9999] overflow-hidden font-sans"
                >
                  <div className="p-3 border-b border-zinc-900 bg-zinc-900/40 flex justify-between items-center select-none font-mono text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-rose-500" />
                      <span className="font-bold uppercase tracking-wider text-white">Lançamentos Recentes</span>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarkAllAsRead();
                        }}
                        className="text-rose-500 hover:text-rose-450 font-bold uppercase tracking-widest cursor-pointer"
                      >
                        Limpar Novas
                      </button>
                    )}
                  </div>

                  <div className="max-h-[320px] overflow-y-auto divide-y divide-zinc-900/40 custom-scrollbar">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-zinc-500 flex flex-col items-center justify-center gap-2 select-none">
                        <span className="text-xl">📼</span>
                        <p className="text-[10px] font-mono uppercase tracking-wider">Acervo Atualizado</p>
                        <p className="text-[9px] text-zinc-600 max-w-[180px] leading-relaxed">Não há novas fitas pendentes no momento.</p>
                      </div>
                    ) : (
                      notifications.map(notif => {
                        const timeString = new Date(notif.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                        const dateString = new Date(notif.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                        return (
                          <div
                            key={notif.id}
                            onClick={() => {
                              onNotificationClick(notif.movieId, notif.id);
                              setShowNotificationsDropdown(false);
                            }}
                            className={`p-3.5 hover:bg-zinc-900/60 transition-all flex gap-3 cursor-pointer relative ${!notif.isRead ? 'bg-zinc-900/25' : ''}`}
                          >
                            {!notif.isRead && (
                              <span className="absolute left-2.5 top-5 w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                            )}
                            <div className="flex-1 space-y-1 text-left pl-1">
                              <div className="flex justify-between items-start gap-1">
                                <h4 className="text-xs font-bold text-white leading-tight uppercase font-mono tracking-tight">
                                  {notif.title}
                                </h4>
                                <span className="text-[8px] text-zinc-500 font-mono whitespace-nowrap">{dateString} {timeString}</span>
                              </div>
                              <p className="text-[10.5px] text-zinc-400 leading-relaxed font-light">
                                {notif.message}
                              </p>
                              <div className="flex items-center gap-1.5 pt-1">
                                <span className="text-[8px] bg-zinc-900 text-zinc-400 font-mono border border-zinc-800 px-1.5 py-0.5 rounded uppercase font-bold">
                                  {notif.type === 'series' ? 'Série' : 'Filme'}
                                </span>
                                <span className="text-[9px] text-rose-500 font-extrabold font-mono tracking-widest uppercase truncate animate-pulse ml-auto">Assistir Fita ➔</span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="p-2 border-t border-zinc-900 bg-zinc-900/10 text-center select-none">
                    <span className="text-[8px] uppercase font-mono tracking-widest text-zinc-600">Fitas de alta fidelidade VHSFLIX</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

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
                    className="absolute right-0 mt-2.5 w-60 bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl z-50 overflow-hidden font-mono text-xs"
                  >
                    {/* Lista rápida de Troca de Perfis */}
                    <div className="p-3 border-b border-zinc-900 bg-zinc-900/30">
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-2.5">Mudar Perfil</p>
                      <div className="flex flex-col gap-2">
                        {profiles
                          .filter(p => p.id !== activeProfile.id)
                          .map(p => (
                            <button
                              key={p.id}
                              onClick={() => {
                                onSelectProfile(p.id);
                                setShowProfileDropdown(false);
                              }}
                              className="flex items-center gap-2.5 text-zinc-400 hover:text-white text-left transition-colors font-sans py-0.5 group"
                              id={`switch-profile-to-${p.id}`}
                            >
                              <img
                                src={p.avatarUrl}
                                alt={p.name}
                                className="w-6 h-6 rounded object-cover border border-zinc-800 group-hover:border-rose-500 transition-all select-none pointer-events-none"
                                referrerPolicy="no-referrer"
                                draggable="false"
                              />
                              <span className="font-medium text-xs truncate">{p.name}</span>
                            </button>
                          ))}
                      </div>
                    </div>

                    {/* Links de Gerenciamento e Configuração */}
                    <div className="p-2 flex flex-col gap-1">
                      {/* Área Admin (só para admins cadastrados) */}
                      {user.isAdmin && (
                        <button
                          onClick={() => {
                            onToggleAdminView(!isAdminView);
                            setShowProfileDropdown(false);
                          }}
                          className={`w-full py-2 px-3 rounded text-left transition-colors flex items-center gap-2 ${
                            isAdminView
                              ? 'bg-rose-950/20 text-rose-500 hover:bg-rose-950/30 font-bold border border-rose-500/20'
                              : 'text-zinc-400 hover:text-rose-500 hover:bg-zinc-900'
                          }`}
                          id="nav-admin-panel-link"
                        >
                          <Shield className="w-3.5 h-3.5 text-rose-500" />
                          <span>{isAdminView ? 'Sair do Painel Admin' : 'Painel de Controle'}</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          onLogoutProfile();
                          setShowProfileDropdown(false);
                        }}
                        className="w-full text-zinc-400 hover:text-white hover:bg-zinc-900 py-2 px-3 rounded text-left transition-colors flex items-center gap-2"
                        id="btn-logout-profile"
                      >
                        <Sliders className="w-3.5 h-3.5 text-zinc-500" />
                        <span>Gerenciar Perfis</span>
                      </button>

                      <button
                        onClick={() => {
                          onSwitchUser();
                          setShowProfileDropdown(false);
                        }}
                        className="w-full text-zinc-400 hover:text-white hover:bg-zinc-900 py-2 px-3 rounded text-left transition-colors flex items-center gap-2 border-t border-zinc-900 mt-1"
                        id="btn-switch-account-alt"
                      >
                        <UserCheck className="w-3.5 h-3.5 text-zinc-500" />
                        <span>Mudar de Conta</span>
                      </button>
                    </div>

                    {/* Rodapé Logged In */}
                    <div className="bg-zinc-900/40 p-2.5 border-t border-zinc-900 text-[10px] text-zinc-500 flex justify-between items-center">
                      <span className="truncate max-w-[120px]" title={user.email}>{user.name}</span>
                      <span className="bg-zinc-900 px-1 py-0.5 rounded border border-zinc-800 text-[9px]">
                        {user.isAdmin ? 'ADMIN' : 'USER'}
                      </span>
                    </div>
                  </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Abas mobile estilo Netflix */}
      {!isAdminView && (
        <div className="md:hidden flex justify-around border-t border-zinc-900 bg-zinc-950 mt-3 pt-2 text-xs text-zinc-400 font-medium">
          <button
            onClick={() => {
              onSelectCategory(null);
              onTabChange('all');
            }}
            className={`py-1 flex-1 text-center font-semibold ${activeTab === 'all' && !selectedCategory ? 'text-rose-500 font-extrabold' : ''}`}
          >
            Início
          </button>
          <button
            onClick={() => {
              onSelectCategory(null);
              onTabChange('movies');
            }}
            className={`py-1 flex-1 text-center font-semibold ${activeTab === 'movies' ? 'text-rose-500 font-extrabold' : ''}`}
          >
            Filmes
          </button>
          <button
            onClick={() => {
              onSelectCategory(null);
              onTabChange('series');
            }}
            className={`py-1 flex-1 text-center font-semibold ${activeTab === 'series' ? 'text-rose-500 font-extrabold' : ''}`}
          >
            Séries
          </button>
          <button
            onClick={() => {
              onSelectCategory(null);
              onTabChange('mylist');
            }}
            className={`py-1 flex-1 text-center font-semibold relative ${activeTab === 'mylist' ? 'text-rose-500 font-extrabold' : ''}`}
          >
            Lista
          </button>
          <button
            onClick={() => setShowGenresDropdown(!showGenresDropdown)}
            className={`py-1 flex-1 text-center font-semibold relative ${selectedCategory ? 'text-rose-500 font-extrabold' : ''}`}
          >
            {selectedCategory ? selectedCategory : 'Gêneros'}
          </button>
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
