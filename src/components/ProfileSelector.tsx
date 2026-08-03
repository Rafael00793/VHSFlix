/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User, Profile, getSubscriptionDaysLeft } from '../types';
import { PROFILE_AVATARS, INITIAL_MOVIES } from '../data';
import { Plus, Trash, Edit, UserCheck, Shield, ChevronRight, LogOut, Film, Eye, EyeOff, User as UserIcon, Lock as LockIcon, Heart, Tv, ArrowLeft, Upload, Link } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
// @ts-ignore
import loginBgImage from '../assets/images/netflix_grid_bg_1780072882191.png';
import { compressImage } from '../lib/firebase';

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
    return !!currentUserId && localStorage.getItem('vhs_session_logged_in') === 'true';
  });

  // Sincroniza estado de login da conta com a seleção de usuário
  React.useEffect(() => {
    if (!currentUserId) {
      setIsAccountLoggedIn(false);
    } else if (localStorage.getItem('vhs_session_logged_in') === 'true') {
      setIsAccountLoggedIn(true);
    }
  }, [currentUserId]);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [isManagingProfiles, setIsManagingProfiles] = useState(false);
  const [showAddProfileModal, setShowAddProfileModal] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [selectedAvatarIdx, setSelectedAvatarIdx] = useState(0);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');

  // Estados de edição de perfil
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [editProfileName, setEditProfileName] = useState('');
  const [editSelectedAvatarIdx, setEditSelectedAvatarIdx] = useState(0);
  const [editCustomAvatarUrl, setEditCustomAvatarUrl] = useState('');
  const [editUploadedFileName, setEditUploadedFileName] = useState('');

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
      setLoginError('E-mail ou senha incorretos. Tente novamente.');
      return;
    }

    const daysLeft = getSubscriptionDaysLeft(matchedUser);
    if (!matchedUser.isAdmin && daysLeft <= 0) {
      setLoginError('Acesso bloqueado! Sua assinatura de 30 dias expirou. Entre em contato com o administrador Rafael Gusmão para renovar.');
      return;
    }

    onSelectUser(matchedUser.id);
    setIsAccountLoggedIn(true);
    localStorage.setItem('vhs_session_logged_in', 'true');
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        if (typeof reader.result === 'string') {
          try {
            const compressed = await compressImage(reader.result);
            if (isEdit) {
              setEditCustomAvatarUrl(compressed);
              setEditUploadedFileName(file.name);
            } else {
              setCustomAvatarUrl(compressed);
              setUploadedFileName(file.name);
            }
          } catch (err) {
            console.error('Erro ao comprimir imagem:', err);
            if (isEdit) {
              setEditCustomAvatarUrl(reader.result);
              setEditUploadedFileName(file.name);
            } else {
              setCustomAvatarUrl(reader.result);
              setUploadedFileName(file.name);
            }
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
    setUploadedFileName('');
    setShowAddProfileModal(false);
  };

  const handleEditProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile || !editProfileName.trim()) return;
    const finalAvatarUrl = editCustomAvatarUrl.trim() !== '' ? editCustomAvatarUrl : PROFILE_AVATARS[editSelectedAvatarIdx].url;
    onEditProfile(editingProfile.id, editProfileName.trim(), finalAvatarUrl);
    setEditUploadedFileName('');
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

        {/* CARD LOGIN AREA */}
        <div className="flex-grow flex items-center justify-center px-4 py-8 sm:py-12 relative z-10 w-full">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="w-full max-w-[480px] sm:max-w-[520px] bg-black/90 backdrop-blur-xl px-7 py-9 sm:px-12 sm:py-12 rounded-2xl border border-zinc-800/90 shadow-[0_0_50px_rgba(229,9,20,0.18)] relative overflow-hidden"
          >
            {/* Top red neon bar highlight */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-600 via-[#E50914] to-amber-500" />

            {/* VHSFLIX CENTRED INNER LOGO BRAND */}
            <div className="flex flex-col items-center text-center mb-8 select-none">
              <h1 className="text-4xl sm:text-5xl font-black font-display tracking-widest text-[#E50914] text-neon-glow select-none leading-none mb-3">
                VHS<span className="text-white italic text-3xl font-mono align-super">FLIX</span>
              </h1>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide">
                Entrar na sua conta
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1.5 max-w-xs sm:max-w-sm">
                Acesse seu catálogo exclusivo com filmes, séries e coleções VHS clássicas.
              </p>
            </div>

            {loginError && (
              <div className="mb-6 bg-rose-600/15 border border-rose-500/40 text-rose-300 text-xs px-4 py-3 rounded-lg font-medium flex items-center gap-2.5 shadow-sm">
                <span className="text-base">⚠️</span>
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
              {/* INPUT USER/EMAIL */}
              <div className="relative flex items-center bg-zinc-900/90 hover:bg-zinc-850/90 focus-within:bg-zinc-850 border border-zinc-800 focus-within:border-[#E50914] focus-within:ring-2 focus-within:ring-[#E50914]/20 rounded-xl transition-all">
                <UserIcon className="absolute left-4 w-5 h-5 text-zinc-500 pointer-events-none" />
                <input
                  type="text"
                  required
                  placeholder="E-mail ou nome de usuário"
                  value={loginEmail}
                  onChange={e => {
                    setLoginEmail(e.target.value);
                    setLoginError('');
                  }}
                  className="w-full bg-transparent text-white py-4 pl-12 pr-4 rounded-xl text-sm font-medium outline-none placeholder-zinc-500"
                />
              </div>

              {/* INPUT PASSWORD */}
              <div className="relative flex items-center bg-zinc-900/90 hover:bg-zinc-850/90 focus-within:bg-zinc-850 border border-zinc-800 focus-within:border-[#E50914] focus-within:ring-2 focus-within:ring-[#E50914]/20 rounded-xl transition-all">
                <LockIcon className="absolute left-4 w-5 h-5 text-zinc-500 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Sua senha"
                  value={loginPassword}
                  onChange={e => {
                    setLoginPassword(e.target.value);
                    setLoginError('');
                  }}
                  className="w-full bg-transparent text-white py-4 pl-12 pr-12 rounded-xl text-sm font-medium outline-none placeholder-zinc-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-zinc-400 hover:text-white p-2 focus:outline-none focus:text-white flex items-center justify-center transition-colors rounded-lg cursor-pointer"
                  title={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4 text-rose-500" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* CHECKBOXES & HELPERS */}
              <div className="my-1 flex items-center justify-between gap-3 text-xs text-zinc-300 font-sans select-none px-0.5">
                <label className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors group">
                  <input 
                    type="checkbox" 
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="accent-[#E50914] rounded w-4 h-4 cursor-pointer" 
                  />
                  <span className="font-medium group-hover:text-white text-zinc-300">Lembrar de mim</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors group">
                  <input 
                    type="checkbox" 
                    className="accent-[#E50914] rounded w-4 h-4 cursor-pointer" 
                    checked={showPassword} 
                    onChange={() => setShowPassword(!showPassword)} 
                  />
                  <span className="font-medium group-hover:text-white text-zinc-300">Mostrar senha</span>
                </label>
              </div>

              {/* BUTTON ENTRAR */}
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-[#E50914] to-rose-600 hover:from-[#ff0f1a] hover:to-rose-500 active:scale-[0.98] text-white font-black py-4 rounded-xl mt-2 transition-all text-sm uppercase tracking-wider cursor-pointer shadow-lg shadow-rose-950/50 hover:shadow-rose-600/30 flex items-center justify-center gap-2"
              >
                <span>ENTRAR NA PLATAFORMA</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-zinc-900 text-xs text-zinc-500 text-center font-sans">
              <span>Contas e acessos são gerenciados diretamente pelo Administrador Master.</span>
            </div>
          </motion.div>
        </div>

        {/* BOTTOM RODAPÉ SECURE BAR FOOTER */}
        <div className="w-full z-15 bg-black/95 border-t border-zinc-900 px-6 py-5 text-xs text-zinc-500 font-sans mt-auto">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            
            {/* Left Copyright */}
            <div className="text-zinc-500 font-medium">
              © {new Date().getFullYear()} VHSFLIX. Todos os direitos reservados.
            </div>

            {/* Center interactive items */}
            <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8 select-none">
              <div className="flex items-center gap-2 text-zinc-400">
                <Tv className="w-4 h-4 text-[#E50914]" />
                <span>Assista onde quiser</span>
              </div>

              <div className="flex items-center gap-2 text-zinc-400">
                <Shield className="w-4 h-4 text-[#22c55e]" />
                <span>Segurança e privacidade</span>
              </div>

              <div className="flex items-center gap-2 text-zinc-400">
                <Heart className="w-4 h-4 text-rose-500" />
                <span>Conteúdo exclusivo VHS</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-between text-white relative overflow-hidden font-sans">
      {/* Immersive Poster Grid background matching login screen */}
      <div className="absolute inset-0 overflow-hidden opacity-[0.28] z-0 select-none pointer-events-none">
        <img 
          src={loginBgImage} 
          alt="VHSFlix Background Grid" 
          className="w-full h-full object-cover select-none pointer-events-none"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-black/90" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.2)_0%,rgba(9,9,11,0.98)_100%)]" />
      </div>

      {/* TOP HEADER WITH BACK BUTTON & ACCOUNT HUD */}
      <div className="w-full z-20 px-6 sm:px-12 py-6 flex items-center justify-between relative max-w-7xl mx-auto">
        <button 
          type="button"
          onClick={() => {
            localStorage.removeItem('vhs_session_logged_in');
            setIsAccountLoggedIn(false);
            onSelectUser('');
          }}
          className="flex items-center gap-2 text-zinc-300 hover:text-white font-semibold transition-colors text-xs sm:text-sm px-4 py-2 rounded-xl bg-black/60 border border-zinc-800 backdrop-blur-md cursor-pointer hover:border-rose-500/50 group shadow-lg"
          id="btn-back-to-login"
        >
          <ArrowLeft className="w-4 h-4 text-rose-500 group-hover:-translate-x-1 transition-transform" />
          <span>Trocar de Conta</span>
        </button>

        <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-zinc-800/80 flex items-center gap-3 shadow-lg">
          <div className="text-right">
            <p className="text-[10px] uppercase font-mono tracking-wider text-zinc-400">Conta Logada</p>
            <p className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5 justify-end">
              {activeUser.isAdmin && <Shield className="w-3.5 h-3.5 text-rose-500" />}
              <span>{activeUser.name}</span>
            </p>
          </div>
        </div>
      </div>

      {/* MAIN CENTER CONTENT AREA */}
      <div className="flex-grow flex flex-col items-center justify-center px-4 py-8 relative z-10 w-full max-w-5xl mx-auto">
        {/* LOGO VHSFLIX */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center mb-8 select-none"
        >
          <h1 className="text-4xl sm:text-6xl font-black font-display tracking-widest text-[#E50914] text-neon-glow leading-none mb-3">
            VHS<span className="text-white italic text-3xl sm:text-4xl font-mono align-super">FLIX</span>
          </h1>
          <h2 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight">
            {isManagingProfiles ? 'Gerenciando Perfis' : 'Quem está assistindo?'}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-2 font-medium max-w-md text-center">
            {isManagingProfiles 
              ? 'Clique em qualquer foto para alterar o nome, trocar a imagem ou excluir.' 
              : `Selecione seu perfil de usuário na conta de ${activeUser.name} para continuar.`}
          </p>
        </motion.div>

        {/* GRID DE PERFIS NETFLIX STYLE */}
        <div className="flex flex-wrap justify-center items-start gap-6 sm:gap-10 md:gap-12 mb-10 w-full">
          {profiles.map((profile, idx) => (
            <motion.div
              key={profile.id}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, delay: idx * 0.08 }}
              className="group relative flex flex-col items-center"
            >
              {/* Box de Capa de Perfil */}
              <div className="relative">
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
                  className={`relative w-32 h-32 sm:w-40 sm:h-40 md:w-44 md:h-44 rounded-2xl overflow-hidden border-2 bg-zinc-900 transition-all cursor-pointer focus-visible:ring-4 focus-visible:ring-rose-500 focus-visible:scale-105 focus-visible:outline-none shadow-xl ${
                    isManagingProfiles 
                      ? 'border-dashed border-rose-500 scale-95 hover:border-rose-300 shadow-[0_0_25px_rgba(229,9,20,0.25)]' 
                      : 'border-zinc-800 hover:border-[#E50914] group-hover:scale-105 hover:shadow-[0_0_30px_rgba(229,9,20,0.35)]'
                  }`}
                  id={`btn-profile-${profile.id}`}
                >
                  <img
                    src={profile.avatarUrl}
                    alt={profile.name}
                    className="w-full h-full object-cover select-none"
                    referrerPolicy="no-referrer"
                  />
                  
                  {/* Overlay de Hover em modo normal */}
                  {!isManagingProfiles ? (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-end pb-4">
                      <span className="text-white text-xs font-black px-3 py-1.5 rounded-lg bg-[#E50914] uppercase tracking-wider shadow-md flex items-center gap-1.5">
                        <span>Assistir</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  ) : (
                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-2 text-center backdrop-blur-xs">
                      <Edit className="w-8 h-8 text-rose-500 mb-2 animate-bounce" />
                      <span className="text-xs text-white font-bold uppercase tracking-wider bg-rose-600/30 px-3 py-1 rounded-md border border-rose-500/50">
                        Editar Foto
                      </span>
                    </div>
                  )}
                </button>

                {/* Botão rápido de edição no canto */}
                {!isManagingProfiles && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingProfile(profile);
                      setEditProfileName(profile.name);
                      setEditCustomAvatarUrl(profile.avatarUrl);
                      const matchingIdx = PROFILE_AVATARS.findIndex(avatar => avatar.url === profile.avatarUrl);
                      setEditSelectedAvatarIdx(matchingIdx !== -1 ? matchingIdx : 0);
                    }}
                    title="Editar foto e nome"
                    className="absolute -top-2 -right-2 bg-zinc-900/90 hover:bg-[#E50914] text-zinc-300 hover:text-white p-2 rounded-full border border-zinc-700 shadow-lg opacity-80 hover:opacity-100 hover:scale-110 transition-all cursor-pointer z-10"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Nome do perfil */}
              <span className="mt-3.5 text-zinc-200 font-bold group-hover:text-white transition-colors text-sm sm:text-base tracking-wide text-center max-w-[160px] truncate">
                {profile.name}
              </span>

              {/* Estatísticas resumidas do perfil */}
              <div className="text-[10px] text-zinc-400 font-sans mt-1.5 flex items-center gap-2 select-none font-medium">
                <span className="bg-zinc-900/80 px-2 py-0.5 rounded-md border border-zinc-800/80">
                  {profile.myList.length} salvos
                </span>
                <span className="text-zinc-600">•</span>
                <span className="bg-zinc-900/80 px-2 py-0.5 rounded-md border border-zinc-800/80">
                  {Object.keys(profile.watchHistory).length} assistidos
                </span>
              </div>
            </motion.div>
          ))}

          {/* CARD DE ADICIONAR NOVO PERFIL (Se houver espaço) */}
          {profiles.length < 5 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, delay: profiles.length * 0.08 }}
              className="flex flex-col items-center"
            >
              <button
                onClick={() => setShowAddProfileModal(true)}
                className="w-32 h-32 sm:w-40 sm:h-40 md:w-44 md:h-44 rounded-2xl border-2 border-dashed border-zinc-700 hover:border-rose-500 bg-zinc-900/40 hover:bg-rose-500/10 text-zinc-400 hover:text-white transition-all flex flex-col items-center justify-center cursor-pointer group shadow-lg hover:scale-105"
                id="btn-add-profile-card"
              >
                <div className="w-12 h-12 rounded-full bg-zinc-800 group-hover:bg-[#E50914] flex items-center justify-center transition-colors mb-2 shadow-inner">
                  <Plus className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider">Criar Perfil</span>
              </button>
              <span className="mt-3.5 text-zinc-500 font-medium text-xs">Novo perfil</span>
            </motion.div>
          )}
        </div>

        {/* BOTÕES DE AÇÃO INFERIORES */}
        <div className="flex flex-wrap justify-center items-center gap-3 mt-2">
          <button
            onClick={() => setIsManagingProfiles(!isManagingProfiles)}
            className={`px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 border shadow-md ${
              isManagingProfiles
                ? 'bg-rose-600 text-white border-rose-500 hover:bg-rose-700'
                : 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border-zinc-700 hover:border-rose-500'
            }`}
            id="btn-manage-profiles-toggle"
          >
            <Edit className="w-4 h-4 text-rose-500" />
            <span>{isManagingProfiles ? 'Concluir Gerenciamento' : 'Gerenciar / Editar Fotos'}</span>
          </button>

          {profiles.length < 5 && (
            <button
              onClick={() => setShowAddProfileModal(true)}
              className="px-6 py-3 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white font-bold text-xs uppercase tracking-wider transition-all border border-zinc-700 hover:border-rose-500 cursor-pointer flex items-center gap-2 shadow-md"
              id="btn-add-profile-action"
            >
              <Plus className="w-4 h-4 text-rose-500" />
              <span>Adicionar Novo Perfil</span>
            </button>
          )}
        </div>
      </div>

      {/* BOTTOM FOOTER BAR */}
      <div className="w-full z-20 bg-black/90 border-t border-zinc-900 px-6 py-4 text-xs text-zinc-500 font-sans mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <span className="text-zinc-500">© 2026 VHSFLIX — Catálogo Digital de Filmes e Séries.</span>
          <div className="flex items-center gap-6 text-zinc-400">
            <span className="flex items-center gap-1.5"><Tv className="w-3.5 h-3.5 text-[#E50914]" /> Multiplataforma</span>
            <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-[#22c55e]" /> Acesso Protegido</span>
            <span className="flex items-center gap-1.5"><Heart className="w-3.5 h-3.5 text-rose-500" /> Qualidade HD</span>
          </div>
        </div>
      </div>

      {/* --- MODAL PARA ADICIONAR NOVO PERFIL --- */}
      <AnimatePresence>
        {showAddProfileModal && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex justify-center items-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 max-w-sm sm:max-w-md w-full rounded-2xl p-6 sm:p-8 text-left shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-2xl font-black font-display text-white mb-1">Adicionar Perfil</h3>
              <p className="text-xs text-zinc-400 mb-6">Crie um novo perfil para personalizar sua lista e histórico.</p>

              <form onSubmit={handleCreateProfile}>
                {/* Visualizador do Avatar Selecionado */}
                <div className="flex flex-col items-center justify-center mb-5 bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-[#E50914] shadow-xl mb-4 bg-zinc-900 relative">
                    <img 
                      src={customAvatarUrl.trim() !== '' ? customAvatarUrl : PROFILE_AVATARS[selectedAvatarIdx].url} 
                      alt="Prévia do perfil" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2 max-w-full overflow-x-auto p-2 no-scrollbar bg-zinc-900 rounded-xl border border-zinc-800">
                    {PROFILE_AVATARS.map((avatar, idx) => (
                      <button
                        key={avatar.id}
                        type="button"
                        onClick={() => {
                          setSelectedAvatarIdx(idx);
                          setCustomAvatarUrl('');
                        }}
                        className={`w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 transition-all cursor-pointer ${
                          selectedAvatarIdx === idx && customAvatarUrl.trim() === ''
                            ? 'ring-2 ring-[#E50914] scale-110 opacity-100' 
                            : 'opacity-50 hover:opacity-100'
                        }`}
                      >
                        <img src={avatar.url} alt={avatar.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Nome do perfil */}
                <div className="mb-5">
                  <label htmlFor="npname" className="block text-xs font-bold text-zinc-300 mb-2 uppercase tracking-wider">Nome do Perfil</label>
                  <input
                    id="npname"
                    type="text"
                    required
                    placeholder="Ex: Sala de Estar, Crianças, etc."
                    maxLength={15}
                    value={newProfileName}
                    onChange={e => setNewProfileName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-[#E50914] focus:ring-1 focus:ring-[#E50914] transition-all font-medium"
                  />
                </div>

                {/* Foto personalizada */}
                <div className="mb-6 space-y-3">
                  <span className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">Foto de Capa Personalizada</span>
                  
                  <div className="bg-zinc-950 rounded-xl p-3 border border-zinc-800">
                    <label className="block text-[10px] font-bold text-zinc-400 mb-1.5 uppercase">Link por URL da Web</label>
                    <div className="relative flex items-center">
                      <Link className="absolute left-3 w-4 h-4 text-zinc-500" />
                      <input
                        type="url"
                        placeholder="https://link-da-sua-foto.jpg"
                        value={customAvatarUrl}
                        onChange={e => setCustomAvatarUrl(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 text-white pl-9 pr-3 py-2 rounded-lg text-xs outline-none focus:border-[#E50914]"
                      />
                    </div>
                  </div>

                  <div className="bg-zinc-950 rounded-xl p-3 border border-zinc-800 text-center">
                    <label className="block text-[10px] font-bold text-zinc-400 mb-2 uppercase">Ou selecione do seu dispositivo</label>
                    <label className="w-full border-2 border-dashed border-zinc-800 hover:border-[#E50914] bg-zinc-900/50 hover:bg-[#E50914]/5 text-zinc-300 rounded-xl p-3 transition-colors flex items-center justify-center gap-2 cursor-pointer">
                      <Upload className="w-4 h-4 text-rose-500" />
                      <span className="text-xs font-semibold">
                        {uploadedFileName ? uploadedFileName : 'Carregar foto do computador'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => handlePhotoUpload(e, false)}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-3 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setShowAddProfileModal(false)}
                    className="px-4 py-2.5 rounded-xl text-zinc-400 text-xs font-semibold hover:text-white transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-gradient-to-r from-[#E50914] to-rose-600 hover:from-[#ff0f1a] hover:to-rose-500 text-white text-xs font-black px-6 py-2.5 rounded-xl transition-all shadow-lg cursor-pointer"
                    id="btn-confirm-add-profile"
                  >
                    Criar Perfil
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL PARA EDITAR PERFIL COMPLETO (NOME / FOTO / EXCLUIR) --- */}
      <AnimatePresence>
        {editingProfile && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex justify-center items-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 max-w-sm sm:max-w-md w-full rounded-2xl p-6 sm:p-8 text-left shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-2xl font-black font-display text-white">Editar Perfil</h3>
                {profiles.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Tem certeza que deseja excluir o perfil "${editingProfile.name}"?`)) {
                        onDeleteProfile(editingProfile.id);
                        setEditingProfile(null);
                      }
                    }}
                    className="text-rose-500 hover:text-rose-400 text-xs font-bold flex items-center gap-1 bg-rose-950/40 border border-rose-500/30 px-3 py-1.5 rounded-lg hover:bg-rose-900/50 transition-all cursor-pointer"
                    title="Excluir Perfil"
                  >
                    <Trash className="w-3.5 h-3.5" />
                    <span>Excluir</span>
                  </button>
                )}
              </div>
              <p className="text-xs text-zinc-400 mb-6">Atualize o nome ou altere a foto de capa do perfil.</p>

              <form onSubmit={handleEditProfileSubmit}>
                {/* Visualizador de Avatar */}
                <div className="flex flex-col items-center justify-center mb-5 bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-[#E50914] shadow-xl mb-4 relative bg-zinc-900">
                    <img 
                      src={editCustomAvatarUrl.trim() !== '' ? editCustomAvatarUrl : (PROFILE_AVATARS[editSelectedAvatarIdx]?.url || editingProfile.avatarUrl)} 
                      alt="Avatar prévia" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  
                  {/* Seletor de Carrossel de Avatares Predefinidos */}
                  <div className="flex items-center gap-2 max-w-full overflow-x-auto p-2 no-scrollbar bg-zinc-900 rounded-xl border border-zinc-800">
                    {PROFILE_AVATARS.map((avatar, idx) => (
                      <button
                        key={avatar.id}
                        type="button"
                        onClick={() => {
                          setEditSelectedAvatarIdx(idx);
                          setEditCustomAvatarUrl(''); // limpa customizada ao escolher predefinido
                        }}
                        className={`w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 transition-all cursor-pointer ${
                          editSelectedAvatarIdx === idx && editCustomAvatarUrl.trim() === ''
                            ? 'ring-2 ring-[#E50914] scale-110 opacity-100' 
                            : 'opacity-50 hover:opacity-100'
                        }`}
                      >
                        <img src={avatar.url} alt={avatar.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] text-zinc-400 font-mono mt-2 uppercase font-bold">
                    {editCustomAvatarUrl.trim() !== '' ? '📷 Foto Personalizada' : '🎨 Tema Predefinido'}
                  </span>
                </div>

                {/* Input de nome */}
                <div className="mb-4">
                  <label htmlFor="epname" className="block text-xs font-bold text-zinc-300 mb-2 uppercase tracking-wider">Nome do Perfil</label>
                  <input
                    id="epname"
                    type="text"
                    required
                    placeholder="Ex: Meu Perfil"
                    maxLength={15}
                    value={editProfileName}
                    onChange={e => setEditProfileName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-[#E50914] focus:ring-1 focus:ring-[#E50914] transition-all font-semibold font-sans"
                  />
                </div>

                {/* Imagem do Perfil - Opções Personalizadas Modernas */}
                <div className="mb-6 space-y-3">
                  <span className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">Foto Personalizada</span>
                  
                  {/* Método 1: URL */}
                  <div className="bg-zinc-950 rounded-xl p-3 border border-zinc-800">
                    <label className="block text-[10px] font-bold text-zinc-400 mb-1.5 uppercase">Link da Imagem na Web</label>
                    <div className="relative flex items-center">
                      <Link className="absolute left-3 w-4 h-4 text-zinc-500" />
                      <input
                        type="url"
                        placeholder="Ex: https://fotos.com/minha-foto.jpg"
                        value={editCustomAvatarUrl}
                        onChange={e => setEditCustomAvatarUrl(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 text-white pl-9 pr-3 py-2 rounded-lg text-xs outline-none focus:border-[#E50914] font-medium"
                      />
                    </div>
                  </div>

                  {/* Método 2: Enviar arquivo */}
                  <div className="bg-zinc-950 rounded-xl p-3 border border-zinc-800 text-center">
                    <label className="block text-[10px] font-bold text-zinc-400 mb-2 uppercase">Ou Fazer Upload do Dispositivo</label>
                    <label className="w-full border-2 border-dashed border-zinc-800 hover:border-[#E50914] bg-zinc-900/50 hover:bg-[#E50914]/5 text-zinc-300 rounded-xl p-3 transition-colors flex items-center justify-center gap-2 cursor-pointer">
                      <Upload className="w-4 h-4 text-rose-500" />
                      <span className="text-xs font-semibold truncate max-w-[240px]">
                        {editUploadedFileName ? editUploadedFileName : 'Escolher foto do computador'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => handlePhotoUpload(e, true)}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex gap-3 justify-end pt-3 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setEditingProfile(null)}
                    className="px-4 py-2.5 rounded-xl text-zinc-400 text-xs font-semibold hover:text-white transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-gradient-to-r from-[#E50914] to-rose-600 hover:from-[#ff0f1a] hover:to-rose-500 text-white text-xs font-black px-6 py-2.5 rounded-xl transition-all shadow-lg cursor-pointer"
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
