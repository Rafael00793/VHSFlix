/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User, Profile } from '../types';
import { PROFILE_AVATARS, INITIAL_MOVIES } from '../data';
import { Plus, Trash, UserCheck, Shield, ChevronRight, LogOut, Film } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ProfileSelectorProps {
  users: User[];
  currentUserId: string;
  onSelectUser: (userId: string) => void;
  onAddUser: (name: string, email: string, isAdmin: boolean) => void;
  profiles: Profile[];
  onSelectProfile: (profileId: string) => void;
  onAddProfile: (name: string, avatarUrl: string) => void;
  onDeleteProfile: (profileId: string) => void;
}

export default function ProfileSelector({
  users,
  currentUserId,
  onSelectUser,
  onAddUser,
  profiles,
  onSelectProfile,
  onAddProfile,
  onDeleteProfile
}: ProfileSelectorProps) {
  const [isAccountLoggedIn, setIsAccountLoggedIn] = useState(() => {
    return sessionStorage.getItem('vhs_session_logged_in') === 'true';
  });
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [isManagingProfiles, setIsManagingProfiles] = useState(false);
  const [showAddProfileModal, setShowAddProfileModal] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [selectedAvatarIdx, setSelectedAvatarIdx] = useState(0);

  // Estados de criação de novo usuário (Conta principal)
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserIsAdmin, setNewUserIsAdmin] = useState(false);

  const activeUser = users.find(u => u.id === currentUserId) || users[0];

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const emailInput = loginEmail.trim().toLowerCase();

    // Encontra um usuário compatível de demonstração ou dos existentes
    let matchedUser = users.find(u => u.email.toLowerCase() === emailInput);

    if (!matchedUser) {
      if (emailInput.includes('admin')) {
        matchedUser = users.find(u => u.isAdmin) || users[0];
      } else if (emailInput.includes('usuario') || emailInput.includes('user')) {
        matchedUser = users.find(u => !u.isAdmin) || users[0];
      } else if (users.length > 0) {
        matchedUser = users[0];
      }
    }

    if (matchedUser) {
      onSelectUser(matchedUser.id);
      setIsAccountLoggedIn(true);
      sessionStorage.setItem('vhs_session_logged_in', 'true');
    } else {
      setLoginError('Nenhuma conta correspondente localizada.');
    }
  };

  const handleCreateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;
    onAddProfile(newProfileName.trim(), PROFILE_AVATARS[selectedAvatarIdx].url);
    setNewProfileName('');
    setShowAddProfileModal(false);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;
    onAddUser(newUserName.trim(), newUserEmail.trim(), newUserIsAdmin);
    setNewUserName('');
    setNewUserEmail('');
    setNewUserIsAdmin(false);
    setShowAddUserForm(false);
  };

  if (!isAccountLoggedIn) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center text-white px-4 py-8 relative overflow-hidden overflow-y-auto">
        {/* Immersive Poster Grid of movies inside login background */}
        <div className="absolute inset-0 overflow-hidden opacity-25 z-0 select-none pointer-events-none">
          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-4 p-4 transform -rotate-12 scale-110">
            {Array.from({ length: 48 }).map((_, i) => {
              const movie = INITIAL_MOVIES[i % INITIAL_MOVIES.length];
              return (
                <div key={i} className="aspect-[2/3] bg-zinc-900 rounded shadow-md overflow-hidden border border-zinc-800">
                  <img src={movie.posterUrl} alt="" className="w-full h-full object-cover" />
                </div>
              );
            })}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-black/85" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.2)_0%,rgba(9,9,11,0.95)_100%)]" />
        </div>

        {/* LOGO VHSFLIX (absolute to match top layout) */}
        <div className="absolute top-8 left-8 sm:left-14 z-25">
          <h1 className="text-3xl sm:text-4.5xl font-black font-display tracking-wider text-rose-600 text-neon-glow select-none leading-none">
            VHS<span className="text-white italic text-xl sm:text-2xl font-mono align-super">FLIX</span>
          </h1>
        </div>

        {/* CARD LOGIN NETFLIX STYLE */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[440px] bg-black/85 backdrop-blur-md p-8 sm:p-12 rounded-lg border border-zinc-900/60 shadow-2xl relative z-10 text-left my-20"
        >
          <h2 className="text-3xl font-bold font-display text-white mb-7">Entrar</h2>
          
          {loginError && (
            <div className="mb-4 bg-rose-600/20 border border-rose-500/50 text-rose-300 text-xs px-3 py-2.5 rounded-md font-mono flex items-center gap-1.5">
              <span>⚠️</span> {loginError}
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <input
                type="text"
                required
                placeholder="Email ou número de telefone"
                value={loginEmail}
                onChange={e => {
                  setLoginEmail(e.target.value);
                  setLoginError('');
                }}
                className="w-full bg-zinc-800 hover:bg-zinc-750 border border-transparent focus:border-zinc-500 text-white py-3.5 px-4 rounded text-sm outline-none transition-all placeholder-zinc-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <input
                type="password"
                required
                placeholder="Senha"
                value={loginPassword}
                onChange={e => {
                  setLoginPassword(e.target.value);
                  setLoginError('');
                }}
                className="w-full bg-zinc-800 hover:bg-zinc-750 border border-transparent focus:border-zinc-500 text-white py-3.5 px-4 rounded text-sm outline-none transition-all placeholder-zinc-500"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3.5 rounded mt-4 transition-colors text-sm uppercase tracking-wider"
            >
              Entrar
            </button>
          </form>

          <div className="mt-5 flex items-center justify-between text-xs text-zinc-400 font-sans">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input type="checkbox" className="accent-rose-600 rounded w-3.5 h-3.5" defaultChecked />
              <span>Lembrar de mim</span>
            </label>
            <a href="#" className="hover:underline">Precisa de ajuda?</a>
          </div>

          <div className="mt-8 text-sm text-zinc-400 font-sans">
            <span>Novo por aqui? </span>
            <button 
              onClick={() => {
                setLoginEmail('usuario@streamflix.cor');
                setLoginPassword('••••••••');
              }} 
              className="text-white hover:underline font-medium text-left"
            >
              Assine agora.
            </button>
          </div>

          {/* Box de Ajuda/Credenciais idêntico à foto */}
          <div className="mt-6 p-4 rounded bg-[#1c2e40]/70 border border-cyan-700/30 text-xs">
            <div className="flex items-center gap-2 mb-2 text-cyan-400 font-bold font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
              <span>Credenciais Demo:</span>
            </div>
            <div className="font-mono text-zinc-300 space-y-1">
              <p>Admin: <span className="text-white hover:underline cursor-pointer" onClick={() => { setLoginEmail('admin@streamflix.cor'); setLoginPassword('••••••••'); }}>admin@streamflix.cor</span></p>
              <p>Usuário: <span className="text-white hover:underline cursor-pointer" onClick={() => { setLoginEmail('usuario@streamflix.cor'); setLoginPassword('••••••••'); }}>usuario@streamflix.cor</span></p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center text-white px-4 py-8 relative vhs-grid-pattern overflow-y-auto">
      
      {/* HUD de Conta ativa (Topo Direito) */}
      <div className="absolute top-4 right-4 md:top-8 md:right-8 bg-zinc-900/80 backdrop-blur-md p-3 rounded-lg border border-zinc-800 flex items-center gap-3 z-50">
        <div className="text-right hidden sm:block">
          <p className="text-xs text-zinc-400">Conta Ativa</p>
          <p className="text-sm font-semibold text-rose-500 flex items-center gap-1 justify-end">
            {activeUser.isAdmin && <Shield className="w-3.5 h-3.5" />}
            {activeUser.name}
          </p>
        </div>
        <button
          onClick={() => setShowAddUserForm(!showAddUserForm)}
          className="bg-rose-600 hover:bg-rose-700 p-2 rounded-full transition-colors tooltip"
          title="Trocar de Conta / Registrar Novo Usuário"
          id="btn-switch-account"
        >
          <UserCheck className="w-4 h-4" />
        </button>
      </div>

      <div className="max-w-4xl w-full flex flex-col items-center">
        {/* LOGO VHSFLIX */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center mb-8"
        >
          <h1 className="text-5xl md:text-7xl font-black font-display tracking-wider text-rose-600 text-neon-glow select-none">
            VHS<span className="text-white italic text-4xl md:text-5xl font-mono align-super">FLIX</span>
          </h1>
          <p className="text-xs text-zinc-500 font-mono mt-1 tracking-widest uppercase">
            Sistema de Videocassete Digital v1.2f
          </p>
        </motion.div>

        {/* --- FORMULÁRIO DE SELEÇÃO / CRIAÇÃO DE USUÁRIOS --- */}
        <AnimatePresence>
          {showAddUserForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-8 overflow-hidden z-40"
            >
              <h3 className="text-lg font-bold font-display text-rose-500 mb-4 flex items-center justify-between">
                <span>Gerenciar Contas de Usuários</span>
                <span className="text-xs font-mono text-zinc-500 uppercase">{users.length} Registrados</span>
              </h3>
              
              {/* Lista compacta de usuários cadastrados */}
              <div className="flex flex-col gap-2 max-h-36 overflow-y-auto mb-5 pr-1">
                {users.map(u => (
                  <div 
                    key={u.id} 
                    className={`p-2.5 rounded-lg border transition-all flex justify-between items-center ${
                      u.id === currentUserId 
                        ? 'bg-rose-950/20 border-rose-500' 
                        : 'border-zinc-800 bg-zinc-950/40 hover:border-zinc-700'
                    }`}
                  >
                    <div>
                      <span className="text-sm font-semibold block">{u.name}</span>
                      <span className="text-xs text-zinc-500 block font-mono">{u.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {u.isAdmin && (
                        <span className="text-[10px] bg-red-600/20 text-rose-400 border border-red-500/30 px-1.5 py-0.5 rounded font-mono font-bold uppercase flex items-center gap-0.5">
                          <Shield className="w-2.5 h-2.5" /> ADMIN
                        </span>
                      )}
                      
                      {u.id !== currentUserId && (
                        <button
                          onClick={() => {
                            onSelectUser(u.id);
                            setIsManagingProfiles(false);
                          }}
                          className="bg-zinc-800 hover:bg-rose-600 text-xs px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 font-medium"
                        >
                          Entrar <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                      {u.id === currentUserId && (
                        <span className="text-xs text-rose-500 font-bold px-2 py-1 bg-rose-500/10 rounded border border-rose-500/20 flex items-center gap-1">
                          Logado
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Formulário de criação */}
              <form onSubmit={handleCreateUser} className="border-t border-zinc-800 pt-4 flex flex-col gap-3">
                <p className="text-xs text-zinc-400 font-semibold mb-1 uppercase tracking-wider">Criar Novo Registro de Usuário</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    placeholder="Nome Completo"
                    value={newUserName}
                    onChange={e => setNewUserName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 rounded text-sm text-white focus:outline-none focus:border-rose-500"
                  />
                  <input
                    type="email"
                    required
                    placeholder="E-mail"
                    value={newUserEmail}
                    onChange={e => setNewUserEmail(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 rounded text-sm text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div className="flex items-center justify-between mt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-400 select-none">
                    <input
                      type="checkbox"
                      checked={newUserIsAdmin}
                      onChange={e => setNewUserIsAdmin(e.target.checked)}
                      className="accent-rose-600 w-4 h-4 cursor-pointer"
                    />
                    Privilégios de Administrador (Acesso ao Painel Admin)
                  </label>
                  <button
                    type="submit"
                    className="bg-rose-600 hover:bg-rose-700 px-4 py-1.5 rounded text-xs font-semibold text-white transition-colors"
                  >
                    Registrar
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- TELA PRINCIPAL: SELEÇÃO DE PERFIS NETFLIX --- */}
        <div className="text-center w-full">
          <motion.h2 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-2xl md:text-3.5xl font-bold font-display tracking-tight text-zinc-100 mb-8"
          >
            {isManagingProfiles ? 'Gerenciar Perfis de ' : 'Quem está assistindo agora em '}
            <span className="text-rose-500">{activeUser.name}</span>?
          </motion.h2>

          {/* Grid de Perfis */}
          <div className="flex flex-wrap justify-center items-center gap-6 md:gap-10 mb-12">
            {profiles.map((profile, idx) => (
              <motion.div
                key={profile.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: idx * 0.08 }}
                className="group relative flex flex-col items-center"
              >
                {/* Botão de Exclusão (Se modo gerenciamento e não for único) */}
                {isManagingProfiles && profiles.length > 1 && (
                  <button
                    onClick={() => onDeleteProfile(profile.id)}
                    className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-full z-30 shadow-lg border border-zinc-950 transition-transform active:scale-95"
                    title="Excluir Perfil"
                    id={`delete-profile-${profile.id}`}
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                )}

                {/* Caixa da Capa do Perfil (Netflix Avatar Box) */}
                <button
                  onClick={() => {
                    if (isManagingProfiles) {
                      // Se estiver gerenciando, fazemos nada ou resetamos. Forçamos a seleção se não for deletado.
                    } else {
                      onSelectProfile(profile.id);
                    }
                  }}
                  disabled={isManagingProfiles}
                  className={`relative w-28 h-28 md:w-36 md:h-36 rounded-lg overflow-hidden border-3 bg-zinc-900 transition-all ${
                    isManagingProfiles 
                      ? 'border-dashed border-zinc-600 opacity-60 scale-95' 
                      : 'border-zinc-800 hover:border-rose-500 group-hover:scale-105 shadow-xl hover:shadow-rose-600/10'
                  }`}
                  id={`btn-profile-${profile.id}`}
                >
                  <img
                    src={profile.avatarUrl}
                    alt={profile.name}
                    className="w-full h-full object-cover select-none"
                    referrerPolicy="no-referrer"
                  />
                  
                  {/* Modo Overlays */}
                  {!isManagingProfiles && (
                    <div className="absolute inset-0 bg-rose-600/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white text-xs font-semibold px-2 py-1 rounded bg-zinc-950/80 uppercase font-mono">Assistir</span>
                    </div>
                  )}
                </button>

                {/* Nome do perfil */}
                <span className="mt-4 text-zinc-400 font-medium group-hover:text-white transition-colors text-sm md:text-base">
                  {profile.name}
                </span>

                {/* Contadores Úteis */}
                <div className="text-[10px] text-zinc-600 font-mono mt-0.5 flex items-center gap-1">
                  <span>{profile.myList.length} salvos</span>
                  <span>•</span>
                  <span>{Object.keys(profile.watchHistory).length} no histórico</span>
                </div>
              </motion.div>
            ))}

            {/* Adicionar Perfil */}
            {profiles.length < 5 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center"
              >
                <button
                  onClick={() => setShowAddProfileModal(true)}
                  className="w-28 h-28 md:w-36 md:h-36 rounded-lg border-2 border-dashed border-zinc-800 hover:border-zinc-500 flex flex-col justify-center items-center text-zinc-500 hover:text-rose-500 hover:bg-zinc-900/40 transition-all group scale-100 hover:scale-102"
                  id="btn-add-profile"
                >
                  <Plus className="w-8 h-8 group-hover:rotate-90 transition-transform duration-300" />
                  <span className="text-xs font-medium font-mono mt-2 uppercase tracking-wider">Novo Perfil</span>
                </button>
                <span className="mt-4 text-transparent text-sm md:text-base select-none">Espaçador</span>
                <div className="text-[10px] text-transparent mt-0.5">Espaçador</div>
              </motion.div>
            )}
          </div>

          {/* Opções de Gerenciamento de Perfil (Botão inferior) */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-4">
            <button
              onClick={() => setIsManagingProfiles(!isManagingProfiles)}
              className={`px-6 py-2 border font-semibold text-sm transition-all uppercase tracking-wider rounded ${
                isManagingProfiles 
                  ? 'bg-rose-600 border-rose-500 text-white text-neon-glow' 
                  : 'border-zinc-700 text-zinc-500 hover:border-zinc-200 hover:text-white'
              }`}
              id="btn-manage-profiles"
            >
              {isManagingProfiles ? 'Concluir Edição de Perfis' : 'Gerenciar Perfis'}
            </button>

            <button
              onClick={() => {
                sessionStorage.removeItem('vhs_session_logged_in');
                setIsAccountLoggedIn(false);
              }}
              className="px-6 py-2 border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800 text-zinc-400 hover:text-white font-semibold text-sm transition-all uppercase tracking-wider rounded"
              id="btn-logout-account-landing"
            >
              Sair da Conta / Trocar Login
            </button>
          </div>
        </div>
      </div>

      {/* --- MODAL PARA CRIAR NOVO PERFIL --- */}
      <AnimatePresence>
        {showAddProfileModal && (
          <div className="fixed inset-0 bg-black/90 flex justify-center items-center p-4 z-50 modal-backdrop-blur">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 max-w-md w-full rounded-xl p-6 md:p-8 text-left shadow-2xl relative"
            >
              <h3 className="text-2xl font-bold font-display text-white mb-2">Adicionar Perfil</h3>
              <p className="text-xs text-zinc-500 mb-6">Adicione uma nova identidade para organizar categorias, listas personalizadas e continuar assistindo.</p>

              <form onSubmit={handleCreateProfile}>
                {/* Visualizador de Avatar */}
                <div className="flex flex-col items-center justify-center mb-6 bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                  <div className={`w-24 h-24 rounded-lg overflow-hidden border-2 border-rose-500 shadow-md mb-4`}>
                    <img 
                      src={PROFILE_AVATARS[selectedAvatarIdx].url} 
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
                        onClick={() => setSelectedAvatarIdx(idx)}
                        className={`w-10 h-10 rounded-md overflow-hidden flex-shrink-0 transition-transform ${
                          selectedAvatarIdx === idx 
                            ? 'ring-2 ring-rose-500 scale-110' 
                            : 'opacity-50 hover:opacity-100'
                        }`}
                      >
                        <img src={avatar.url} alt={avatar.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono mt-1 uppercase">Tema: {PROFILE_AVATARS[selectedAvatarIdx].name}</span>
                </div>

                {/* Input de nome */}
                <div className="mb-6">
                  <label htmlFor="pname" className="block text-xs font-mono text-zinc-400 mb-2 uppercase">Nome do Perfil</label>
                  <input
                    id="pname"
                    type="text"
                    required
                    placeholder="Nome do integrante"
                    maxLength={15}
                    value={newProfileName}
                    onChange={e => setNewProfileName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 text-white px-4 py-3 rounded-lg text-sm focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all font-semibold"
                  />
                </div>

                {/* Ações */}
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowAddProfileModal(false)}
                    className="px-4 py-2 rounded text-zinc-400 text-xs hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-5 py-2 rounded transition-colors shadow-lg shadow-rose-600/10"
                    id="btn-save-profile"
                  >
                    Salvar Perfil
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
