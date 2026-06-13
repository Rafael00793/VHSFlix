/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User, Profile } from '../types';
import { PROFILE_AVATARS, INITIAL_MOVIES } from '../data';
import { Plus, Trash, Edit, UserCheck, Shield, ChevronRight, LogOut, Film, Eye, EyeOff, User as UserIcon, Lock as LockIcon, Heart, Tv, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
// @ts-ignore
import loginBgImage from '../assets/images/netflix_grid_bg_1780072882191.png';

const NETFLIX_MOCK_POSTERS = [
  // Linha 1
  { title: "Stranger Things", url: "https://image.tmdb.org/t/p/w500/49Wp6m9lhbClvIGv2Irp4st6L8s.jpg" },
  { title: "The Witcher", url: "https://image.tmdb.org/t/p/w500/7v68AOnM9c21Y1NfFhW93bH6p1q.jpg" },
  { title: "Vingadores Ultimato", url: "https://image.tmdb.org/t/p/w500/ulZCO6UF2F268XT6Yv6ZkS6B.jpg" },
  { title: "One Piece", url: "https://image.tmdb.org/t/p/w500/c393gYTRvFUgS9Yv6ZkS6B.jpg" },
  { title: "The Last Of Us", url: "https://image.tmdb.org/t/p/w500/uKVDFRIgRSvIY7Nisg6YfO.jpg" },
  { title: "The Boys", url: "https://image.tmdb.org/t/p/w500/st71cbeMAn9kPjH6C8x6yof88.jpg" },
  { title: "Jurassic World Domínio", url: "https://image.tmdb.org/t/p/w500/orS9OFID6g3gO0SgH1Gv2u3fG6N.jpg" },

  // Linha 2
  { title: "Wandinha", url: "https://image.tmdb.org/t/p/w500/jeisSFrgYq6YoXWbZ8HmqgZ9S.jpg" },
  { title: "Batman", url: "https://image.tmdb.org/t/p/w500/7g72uV9QfVwUunb4F7oXvL8O0M7.jpg" },
  { title: "Harry Potter", url: "https://image.tmdb.org/t/p/w500/8uO0gUMYrj5BNZ6Z9ZgWaS9Stj3.jpg" },
  { title: "Mandalorian", url: "https://image.tmdb.org/t/p/w500/f34yNlyLldY7mSbi099f6GOfgM.jpg" },
  { title: "Demon Slayer", url: "https://image.tmdb.org/t/p/w500/h66GZ66WLaZAd8YAdt2Z8UQLb7N.jpg" },
  { title: "Top Gun Maverick", url: "https://image.tmdb.org/t/p/w500/628Dep6Z5gCoSgH1Gv2u3fG6N.jpg" },

  // Linha 3
  { title: "John Wick 4", url: "https://image.tmdb.org/t/p/w500/ghv8yNlId7Z0fHInx3m6LPh8p1S.jpg" },
  { title: "MIB Homens de Preto", url: "https://image.tmdb.org/t/p/w500/7g6S1Yk0bQf4bCisvM0UfA84zW3.jpg" },
  { title: "Senhor dos Anéis", url: "https://image.tmdb.org/t/p/w500/6gX2ZcQ7p66N6bNYY1Gv5vM2y9W.jpg" },
  { title: "Black Mirror", url: "https://image.tmdb.org/t/p/w500/7g6S1Yk0bQf4bCisvM0UfA84zW3.jpg" },
  { title: "Sex Education", url: "https://image.tmdb.org/t/p/w500/6gX2ZcQ7p66N6bNYY1Gv5vM2y9W.jpg" },
  { title: "Velozes e Furiosos 10", url: "https://image.tmdb.org/t/p/w500/fi96gYTRvFUgS9Yv6ZkS6B.jpg" },

  // Linha 4
  { title: "Resident Evil", url: "https://image.tmdb.org/t/p/w500/49Wp6m9lhbClvIGv2Irp4st6L8s.jpg" },
  { title: "IT A Coisa", url: "https://image.tmdb.org/t/p/w500/b0Y6209qN8Hqg9I3XmSkaIsK6e0.jpg" },
  { title: "Sintonia", url: "https://image.tmdb.org/t/p/w500/16a34aofqK8gZ9s4aofqK8gZ.jpg" },
  { title: "Lucifer", url: "https://image.tmdb.org/t/p/w500/f34yNlyLldY7mSbi099f5GOfgM.jpg" },
  { title: "Grey's Anatomy", url: "https://image.tmdb.org/t/p/w500/daS8XfFUgS9Yv6ZkS6B.jpg" },
  { title: "Ozark", url: "https://image.tmdb.org/t/p/w500/6WLaZAd8YAdt2Z8UQLb7N.jpg" }
];

interface ProfileSelectorProps {
  users: User[];
  currentUserId: string;
  onSelectUser: (userId: string) => void;
  profiles: Profile[];
  onSelectProfile: (profileId: string) => void;
  onAddProfile: (name: string, avatarUrl: string) => void;
  onDeleteProfile: (profileId: string) => void;
  onEditProfile: (profileId: string, name: string, avatarUrl: string) => void;
}

export default function ProfileSelector({
  users,
  currentUserId,
  onSelectUser,
  profiles,
  onSelectProfile,
  onAddProfile,
  onDeleteProfile,
  onEditProfile
}: ProfileSelectorProps) {
  const [isAccountLoggedIn, setIsAccountLoggedIn] = useState(() => {
    return sessionStorage.getItem('vhs_session_logged_in') === 'true';
  });
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isManagingProfiles, setIsManagingProfiles] = useState(false);
  const [showAddProfileModal, setShowAddProfileModal] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [selectedAvatarIdx, setSelectedAvatarIdx] = useState(0);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');

  // Estados de edição de perfil
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [editProfileName, setEditProfileName] = useState('');
  const [editSelectedAvatarIdx, setEditSelectedAvatarIdx] = useState(0);
  const [editCustomAvatarUrl, setEditCustomAvatarUrl] = useState('');

  const activeUser = users.find(u => u.id === currentUserId) || users[0];

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const emailInput = loginEmail.trim().toLowerCase();
    const passwordInput = loginPassword.trim();

    // Encontra o usuário por e-mail exato ou por nome de usuário (tratando espaços e letras maiúsculas/minúsculas)
    const matchedUser = users.find(u => {
      const emailMatch = (u.email || '').trim().toLowerCase() === emailInput;
      const usernameMatch = (u.name || '').trim().toLowerCase() === emailInput;
      return emailMatch || usernameMatch;
    });

    if (!matchedUser || (matchedUser.password && (matchedUser.password || '').toString().trim() !== passwordInput)) {
      setLoginError('Usuário ou senha inválidos');
      return;
    }

    onSelectUser(matchedUser.id);
    setIsAccountLoggedIn(true);
    sessionStorage.setItem('vhs_session_logged_in', 'true');
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          if (isEdit) {
            setEditCustomAvatarUrl(reader.result);
          } else {
            setCustomAvatarUrl(reader.result);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;
    const finalAvatarUrl = customAvatarUrl.trim() !== '' ? customAvatarUrl : PROFILE_AVATARS[selectedAvatarIdx].url;
    onAddProfile(newProfileName.trim(), finalAvatarUrl);
    setNewProfileName('');
    setCustomAvatarUrl('');
    setShowAddProfileModal(false);
  };

  const handleEditProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile || !editProfileName.trim()) return;
    const finalAvatarUrl = editCustomAvatarUrl.trim() !== '' ? editCustomAvatarUrl : PROFILE_AVATARS[editSelectedAvatarIdx].url;
    onEditProfile(editingProfile.id, editProfileName.trim(), finalAvatarUrl);
    setEditingProfile(null);
  };

  if (!isAccountLoggedIn) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col justify-between text-white relative overflow-hidden">
        {/* Immersive Poster Grid of movies inside login background */}
        <div className="absolute inset-0 overflow-hidden opacity-[0.32] z-0 select-none pointer-events-none">
          <img 
            src={loginBgImage} 
            alt="VHSFlix Cinematic Grid Background" 
            className="w-full h-full object-cover select-none pointer-events-none"
            referrerPolicy="no-referrer"
          />
          {/* Radial and Linear Gradients to merge background elegantly into dark background */}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-black/95" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.1)_0%,rgba(9,9,11,0.99)_100%)]" />
        </div>

        {/* TOP HEADER WITH BACK CHEVRON AND REFRESH */}
        <div className="w-full z-15 px-6 sm:px-12 py-6 flex items-center justify-between relative">
          <button 
            type="button"
            onClick={() => {
              setLoginEmail('');
              setLoginPassword('');
              setLoginError('');
            }}
            className="flex items-center gap-2 text-rose-500 hover:text-white font-semibold transition-colors text-xs px-3 py-1.5 rounded-full bg-black/50 border border-zinc-800/40 backdrop-blur-md cursor-pointer group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Voltar</span>
          </button>
        </div>

        {/* CARD LOGIN AREA */}
        <div className="flex-grow flex items-center justify-center px-4 py-12 relative z-10 w-full">
          <motion.div 
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full max-w-[450px] bg-black/85 backdrop-blur-md px-8 py-10 sm:px-12 sm:py-14 rounded-md border border-zinc-900 shadow-[0_0_25px_rgba(0,0,0,0.85)] relative"
          >
            {/* VHSFLIX CENTRED INNER LOGO BRAND */}
            <div className="flex flex-col items-center text-center mb-8 select-none">
              <h1 className="text-4xl sm:text-5xl font-black font-display tracking-widest text-[#E50914] text-neon-glow select-none leading-none mb-4">
                VHS<span className="text-white italic text-3xl font-mono align-super">FLIX</span>
              </h1>
              <p className="text-sm font-semibold text-zinc-200 tracking-wide">
                Filmes, séries e muito mais.
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                Entre e continue assistindo.
              </p>
            </div>

            {loginError && (
              <div className="mb-5 bg-rose-600/15 border border-rose-500/30 text-rose-300 text-xs px-3 py-3 rounded-md font-mono flex items-center gap-2">
                <span>⚠️</span> {loginError}
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
              {/* INPUT USER/EMAIL */}
              <div className="relative flex items-center bg-zinc-800/90 hover:bg-zinc-750/90 focus-within:bg-zinc-700/80 border border-zinc-800 focus-within:border-zinc-500 rounded-md transition-all">
                <UserIcon className="absolute left-4 w-4.5 h-4.5 text-zinc-500 pointer-events-none" />
                <input
                  type="text"
                  required
                  placeholder="E-mail ou usuário"
                  value={loginEmail}
                  onChange={e => {
                    setLoginEmail(e.target.value);
                    setLoginError('');
                  }}
                  className="w-full bg-transparent text-white py-4 pl-12 pr-4 rounded-md text-sm outline-none placeholder-zinc-500 placeholder:font-light"
                />
              </div>

              {/* INPUT PASSWORD */}
              <div className="relative flex items-center bg-zinc-800/90 hover:bg-zinc-750/90 focus-within:bg-zinc-700/80 border border-zinc-800 focus-within:border-zinc-500 rounded-md transition-all">
                <LockIcon className="absolute left-4 w-4.5 h-4.5 text-zinc-500 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Senha"
                  value={loginPassword}
                  onChange={e => {
                    setLoginPassword(e.target.value);
                    setLoginError('');
                  }}
                  className="w-full bg-transparent text-white py-4 pl-12 pr-12 rounded-md text-sm outline-none placeholder-zinc-500 placeholder:font-light"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-zinc-400 hover:text-white p-1.5 focus:outline-none focus:text-white flex items-center justify-center transition-colors rounded-md"
                  title={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* BUTTON ENTRAR */}
              <button
                type="submit"
                className="w-full bg-[#E50914] hover:bg-[#b80710] active:scale-[0.98] text-white font-bold py-3.5 rounded-md mt-2 transition-all text-sm uppercase tracking-wider cursor-pointer"
              >
                ENTRAR
              </button>
            </form>

            {/* CHECKBOXES & HELPERS */}
            <div className="mt-5 flex items-center justify-between gap-3 text-xs text-zinc-400 font-sans select-none">
              <div className="flex items-center gap-3.5 flex-wrap">
                <label className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors">
                  <input type="checkbox" className="accent-[#E50914] rounded w-3.5 h-3.5 cursor-pointer" defaultChecked />
                  <span>Lembrar de mim</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors">
                  <input 
                    type="checkbox" 
                    className="accent-[#E50914] rounded w-3.5 h-3.5 cursor-pointer" 
                    checked={showPassword} 
                    onChange={() => setShowPassword(!showPassword)} 
                  />
                  <span>Mostrar senha</span>
                </label>
              </div>
              <a href="#" className="hover:underline hover:text-white transition-colors">Ajuda?</a>
            </div>

            <div className="mt-8 text-xs text-zinc-400 font-sans flex items-center justify-between">
              <div>
                <span className="text-zinc-500">Contas e senhas são gerenciadas pelo Administrador Master.</span>
              </div>
              <span className="text-zinc-600">|</span>
              <a href="#" className="hover:underline hover:text-white text-[11px]">Termos</a>
            </div>
          </motion.div>
        </div>

        {/* BOTTOM RODAPÉ SECURE BAR FOOTER */}
        <div className="w-full z-15 bg-black/95 border-t border-zinc-900 px-6 py-6 text-xs text-zinc-500 font-sans mt-auto">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-5">
            
            {/* Left Copyright */}
            <div className="text-zinc-500 font-medium">
              © {new Date().getFullYear()} VHSFLIX. Todos os direitos reservados.
            </div>

            {/* Center interactive items */}
            <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8 select-none">
              <div className="flex items-center gap-2 group cursor-pointer hover:text-zinc-300 transition-colors">
                <Tv className="w-4 h-4 text-zinc-500 group-hover:text-[#E50914] transition-colors" />
                <span>Assista onde quiser</span>
              </div>

              <div className="flex items-center gap-2 group cursor-pointer hover:text-zinc-300 transition-colors">
                <Shield className="w-4 h-4 text-zinc-500 group-hover:text-[#22c55e] transition-colors" />
                <span>Segurança e privacidade</span>
              </div>

              <div className="flex items-center gap-2 group cursor-pointer hover:text-zinc-300 transition-colors">
                <Heart className="w-4 h-4 text-zinc-500 group-hover:text-rose-500 transition-colors" />
                <span>Conteúdo que você ama</span>
              </div>
            </div>

            {/* Right legal links */}
            <div className="flex flex-wrap items-center justify-center gap-3 text-zinc-500 font-medium">
              <a href="#" className="hover:underline hover:text-zinc-400">Termos de Uso</a>
              <span className="text-zinc-800">|</span>
              <a href="#" className="hover:underline hover:text-zinc-400">Privacidade</a>
              <span className="text-zinc-800">|</span>
              <a href="#" className="hover:underline hover:text-zinc-400">Ajuda</a>
            </div>

          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center text-white px-4 py-8 relative vhs-grid-pattern overflow-y-auto">
      
      {/* HUD de Conta ativa (Topo Direito) */}
      <div className="absolute top-4 right-4 md:top-8 md:right-8 bg-zinc-900/80 backdrop-blur-md p-3 rounded-lg border border-zinc-800 flex items-center gap-3 z-50">
        <div className="text-right">
          <p className="text-xs text-zinc-400">Conta Ativa</p>
          <p className="text-sm font-semibold text-rose-500 flex items-center gap-1 justify-end">
            {activeUser.isAdmin && <Shield className="w-3.5 h-3.5" />}
            {activeUser.name}
          </p>
        </div>
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
          <div className="flex flex-wrap justify-center items-center gap-6 sm:gap-8 md:gap-12 mb-12">
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
                    className="absolute -top-3 -right-3 bg-red-600 hover:bg-red-700 text-white p-2.5 rounded-full z-30 shadow-2xl border-2 border-zinc-950 transition-transform active:scale-95 cursor-pointer"
                    title="Excluir Perfil"
                    id={`delete-profile-${profile.id}`}
                  >
                    <Trash className="w-5 h-5" />
                  </button>
                )}

                {/* Caixa da Capa do Perfil (Netflix Avatar Box) */}
                <button
                  onClick={() => {
                    if (isManagingProfiles) {
                      setEditingProfile(profile);
                      setEditProfileName(profile.name);
                      setEditCustomAvatarUrl(profile.avatarUrl);
                      const matchingIdx = PROFILE_AVATARS.findIndex(avatar => avatar.url === profile.avatarUrl);
                      setEditSelectedAvatarIdx(matchingIdx !== -1 ? matchingIdx : 0);
                    } else {
                      onSelectProfile(profile.id);
                    }
                  }}
                  className={`relative w-36 h-36 sm:w-48 md:w-56 rounded-2xl overflow-hidden border-4 bg-zinc-900 transition-all cursor-pointer focus-visible:ring-4 focus-visible:ring-rose-500 focus-visible:scale-105 focus-visible:outline-none ${
                    isManagingProfiles 
                      ? 'border-dashed border-rose-500 scale-95 hover:border-rose-300' 
                      : 'border-zinc-800 hover:border-rose-500 group-hover:scale-105 shadow-2xl hover:shadow-rose-600/25'
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
                  {!isManagingProfiles ? (
                    <div className="absolute inset-0 bg-rose-600/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white text-sm font-black px-3 py-1.5 rounded-md bg-zinc-950/90 uppercase font-mono tracking-widest border border-rose-500/30">Assistir</span>
                    </div>
                  ) : (
                    <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center">
                      <Edit className="w-7 h-7 text-white mb-2" />
                      <span className="text-xs text-zinc-200 font-mono font-bold uppercase tracking-widest bg-black/50 px-2.5 py-1 rounded-md border border-zinc-800">Editar</span>
                    </div>
                  )}
                </button>

                {/* Nome do perfil */}
                <span className="mt-4 text-zinc-100 font-black group-hover:text-rose-500 transition-colors text-base sm:text-xl uppercase tracking-wide">
                  {profile.name}
                </span>

                {/* Contadores Úteis */}
                <div className="text-[10px] sm:text-xs text-zinc-400 font-mono mt-1.5 flex items-center gap-1.5 select-none font-bold">
                  <span className="bg-zinc-900/90 px-2 py-0.5 rounded border border-zinc-850/80">{profile.myList.length} salvos</span>
                  <span className="text-rose-500">•</span>
                  <span className="bg-zinc-900/90 px-2 py-0.5 rounded border border-zinc-850/80">{Object.keys(profile.watchHistory).length} assistidos</span>
                </div>
              </motion.div>
            ))}

            {/* Adicionar Perfil */}
            {profiles.length < (activeUser.isAdmin ? 5 : 1) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center"
              >
                <button
                  onClick={() => setShowAddProfileModal(true)}
                  className="w-36 h-36 sm:w-48 md:w-56 rounded-2xl border-2 border-dashed border-zinc-800 hover:border-rose-500 flex flex-col justify-center items-center text-zinc-500 hover:text-rose-500 hover:bg-zinc-900/40 transition-all group scale-100 hover:scale-102 cursor-pointer"
                  id="btn-add-profile"
                >
                  <Plus className="w-10 h-10 group-hover:rotate-90 transition-transform duration-300" />
                  <span className="text-[10px] sm:text-xs font-black font-mono mt-2.5 uppercase tracking-widest text-zinc-400 group-hover:text-rose-500">Novo Perfil</span>
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
              className="bg-zinc-900 border border-zinc-800 max-w-sm sm:max-w-md w-full rounded-xl p-6 md:p-8 text-left shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-2xl font-bold font-display text-white mb-2">Adicionar Perfil</h3>
              <p className="text-xs text-zinc-500 mb-6 font-sans">Adicione uma lista personalizada para continuar assistindo e organizar categorias.</p>

              <form onSubmit={handleCreateProfile}>
                {/* Visualizador de Avatar */}
                <div className="flex flex-col items-center justify-center mb-5 bg-zinc-950 p-4 rounded-xl border border-zinc-850">
                  <div className="w-24 h-24 rounded-lg overflow-hidden border-2 border-rose-500 shadow-xl mb-4 relative bg-zinc-900">
                    <img 
                      src={customAvatarUrl.trim() !== '' ? customAvatarUrl : PROFILE_AVATARS[selectedAvatarIdx].url} 
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
                          setSelectedAvatarIdx(idx);
                          setCustomAvatarUrl(''); // limpa customizada ao escolher predefinido
                        }}
                        className={`w-10 h-10 rounded-md overflow-hidden flex-shrink-0 transition-all ${
                          selectedAvatarIdx === idx && customAvatarUrl.trim() === ''
                            ? 'ring-2 ring-rose-500 scale-110' 
                            : 'opacity-50 hover:opacity-100'
                        }`}
                      >
                        <img src={avatar.url} alt={avatar.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono mt-1.5 uppercase">
                    {customAvatarUrl.trim() !== '' ? 'Imagem Personalizada' : `Tema: ${PROFILE_AVATARS[selectedAvatarIdx].name}`}
                  </span>
                </div>

                {/* Input de nome */}
                <div className="mb-4">
                  <label htmlFor="pname" className="block text-xs font-mono text-zinc-400 mb-2 uppercase tracking-wider">Nome do Perfil</label>
                  <input
                    id="pname"
                    type="text"
                    required
                    placeholder="Ex: Sala de Estar, Rafael"
                    maxLength={15}
                    value={newProfileName}
                    onChange={e => setNewProfileName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 text-white px-4 py-3 rounded-lg text-sm focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all font-semibold font-sans"
                  />
                </div>

                {/* Qualquer imagem no perfil - URL do usuário ou arquivo local */}
                <div className="mb-6 p-3 bg-zinc-950 rounded-lg border border-zinc-850 space-y-3">
                  <div>
                    <label className="block text-[10px] font-mono text-zinc-400 mb-1 uppercase tracking-wider">URL Personalizada</label>
                    <input
                      type="url"
                      placeholder="Cole qualquer link de imagem"
                      value={customAvatarUrl}
                      onChange={e => setCustomAvatarUrl(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 text-white px-3 py-1.5 rounded text-xs focus:outline-none focus:border-rose-500 font-sans"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-zinc-400 mb-1 uppercase tracking-wider">Enviar do Computador</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => handlePhotoUpload(e, false)}
                      className="w-full text-xs text-zinc-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-zinc-855 file:text-zinc-300 hover:file:bg-zinc-800 cursor-pointer text-ellipsis overflow-hidden"
                    />
                  </div>
                </div>

                {/* Ações */}
                <div className="flex gap-3 justify-end pt-2 border-t border-zinc-850">
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

      {/* --- MODAL PARA EDITAR PERFIL COMPLETO --- */}
      <AnimatePresence>
        {editingProfile && (
          <div className="fixed inset-0 bg-black/95 flex justify-center items-center p-4 z-50 modal-backdrop-blur">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 max-w-sm sm:max-w-md w-full rounded-xl p-6 md:p-8 text-left shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-2xl font-bold font-display text-white mb-2">Editar Perfil</h3>
              <p className="text-xs text-zinc-500 mb-6 font-sans">Atualize o nome do perfil ou escolha outra foto de capa.</p>

              <form onSubmit={handleEditProfileSubmit}>
                {/* Visualizador de Avatar */}
                <div className="flex flex-col items-center justify-center mb-5 bg-zinc-950 p-4 rounded-xl border border-zinc-850">
                  <div className="w-24 h-24 rounded-lg overflow-hidden border-2 border-rose-500 shadow-xl mb-4 relative bg-zinc-900">
                    <img 
                      src={editCustomAvatarUrl.trim() !== '' ? editCustomAvatarUrl : (PROFILE_AVATARS[editSelectedAvatarIdx]?.url || editingProfile.avatarUrl)} 
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
                          setEditSelectedAvatarIdx(idx);
                          setEditCustomAvatarUrl(''); // limpa customizada ao escolher predefinido
                        }}
                        className={`w-10 h-10 rounded-md overflow-hidden flex-shrink-0 transition-all ${
                          editSelectedAvatarIdx === idx && editCustomAvatarUrl.trim() === ''
                            ? 'ring-2 ring-rose-500 scale-110' 
                            : 'opacity-50 hover:opacity-100'
                        }`}
                      >
                        <img src={avatar.url} alt={avatar.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono mt-1.5 uppercase">
                    {editCustomAvatarUrl.trim() !== '' ? 'Imagem Personalizada' : 'Tema predefinido'}
                  </span>
                </div>

                {/* Input de nome */}
                <div className="mb-4">
                  <label htmlFor="epname" className="block text-xs font-mono text-zinc-400 mb-2 uppercase tracking-wider">Nome do Perfil</label>
                  <input
                    id="epname"
                    type="text"
                    required
                    placeholder="Ex: Meu Perfil"
                    maxLength={15}
                    value={editProfileName}
                    onChange={e => setEditProfileName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 text-white px-4 py-3 rounded-lg text-sm focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all font-semibold font-sans"
                  />
                </div>

                {/* Qualquer imagem no perfil - URL do usuário ou arquivo local */}
                <div className="mb-6 p-3 bg-zinc-950 rounded-lg border border-zinc-850 space-y-3">
                  <div>
                    <label className="block text-[10px] font-mono text-zinc-400 mb-1 uppercase tracking-wider">URL Personalizada</label>
                    <input
                      type="url"
                      placeholder="Cole qualquer link de imagem"
                      value={editCustomAvatarUrl}
                      onChange={e => setEditCustomAvatarUrl(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 text-white px-3 py-1.5 rounded text-xs focus:outline-none focus:border-rose-500 font-sans"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-zinc-400 mb-1 uppercase tracking-wider">Enviar do Computador</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => handlePhotoUpload(e, true)}
                      className="w-full text-xs text-zinc-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-zinc-850 file:text-zinc-300 hover:file:bg-zinc-800 cursor-pointer text-ellipsis overflow-hidden"
                    />
                  </div>
                </div>

                {/* Ações */}
                <div className="flex gap-3 justify-end pt-2 border-t border-zinc-850">
                  <button
                    type="button"
                    onClick={() => setEditingProfile(null)}
                    className="px-4 py-2 rounded text-zinc-400 text-xs hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-5 py-2 rounded transition-colors shadow-lg shadow-rose-600/10"
                    id="btn-edit-save-profile"
                  >
                    Salvar Alterações
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
