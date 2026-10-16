/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, KeyRound, Eye, EyeOff, Check, X, Sparkles, AlertCircle, CheckCircle2, Upload, Link as LinkIcon, Send, ExternalLink } from 'lucide-react';
import { User, Profile } from '../types';
import { PROFILE_AVATARS } from '../data';
import { compressImage } from '../lib/firebase';

interface ModifyProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  activeProfile: Profile;
  onSave: (newAvatarUrl: string, newPassword?: string) => Promise<string | null> | string | null;
}

export default function ModifyProfileModal({
  isOpen,
  onClose,
  user,
  activeProfile,
  onSave
}: ModifyProfileModalProps) {
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState<string>(activeProfile?.avatarUrl || user?.avatarUrl || PROFILE_AVATARS[0].url);
  const [customAvatarInput, setCustomAvatarInput] = useState<string>('');
  const [showCustomUrlInput, setShowCustomUrlInput] = useState<boolean>(false);
  
  // Estados para senha
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  // Estados de feedback
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sincroniza avatar inicial quando o modal abre
  React.useEffect(() => {
    if (isOpen) {
      const initialAvatar = activeProfile?.avatarUrl || user?.avatarUrl || PROFILE_AVATARS[0].url;
      setSelectedAvatarUrl(initialAvatar);
      setCustomAvatarInput('');
      setShowCustomUrlInput(false);
      setNewPassword('');
      setConfirmPassword('');
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [isOpen, activeProfile, user]);

  if (!isOpen) return null;

  // Upload local de imagem via FileReader (PNG, JPG, WebP) com compressão automática
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Por favor, selecione um arquivo de imagem válido (JPG, PNG, WebP).');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setErrorMessage('A imagem selecionada é muito grande. Escolha uma foto de até 15MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      if (event.target?.result && typeof event.target.result === 'string') {
        try {
          // Comprime para avatar otimizado (280x280) que cabe perfeitamente no Firestore e LocalStorage (< 30KB)
          const compressed = await compressImage(event.target.result, 280, 280);
          setSelectedAvatarUrl(compressed);
          setCustomAvatarInput(compressed);
          setErrorMessage(null);
        } catch (err) {
          console.warn('Erro ao comprimir imagem, usando original:', err);
          setSelectedAvatarUrl(event.target.result);
          setCustomAvatarInput(event.target.result);
        }
      }
    };
    reader.onerror = () => {
      setErrorMessage('Erro ao carregar o arquivo da imagem.');
    };
    reader.readAsDataURL(file);
  };

  const handleApplyCustomUrl = () => {
    const trimmed = customAvatarInput.trim();
    if (!trimmed) {
      setErrorMessage('Insira a URL de uma imagem válida.');
      return;
    }
    setSelectedAvatarUrl(trimmed);
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Validação da senha (se preenchida)
    const hasPasswordInput = newPassword.trim().length > 0 || confirmPassword.trim().length > 0;
    
    if (hasPasswordInput) {
      if (newPassword.trim().length < 4) {
        setErrorMessage('A nova senha deve ter no mínimo 4 caracteres.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMessage('As senhas não coincidem. Digite a mesma senha em ambos os campos.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const passwordToSave = hasPasswordInput ? newPassword.trim() : undefined;
      let finalAvatarToSave = selectedAvatarUrl;
      if (finalAvatarToSave.startsWith('data:image')) {
        try {
          finalAvatarToSave = await compressImage(finalAvatarToSave, 280, 280);
        } catch (compErr) {
          console.warn('Erro ao garantir compressão do avatar:', compErr);
        }
      }
      const result = await onSave(finalAvatarToSave, passwordToSave);

      if (result) {
        setErrorMessage(result);
        setIsSubmitting(false);
      } else {
        setSuccessMessage('Perfil modificado com sucesso!');
        setTimeout(() => {
          setIsSubmitting(false);
          onClose();
        }, 800);
      }
    } catch (err: any) {
      setErrorMessage('Ocorreu um erro ao salvar as alterações. Tente novamente.');
      setIsSubmitting(false);
    }
  };

  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        {/* Backdrop escuro com desfoque cinematográfico */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Modal Card com estética Neon VHSFLIX */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-lg bg-zinc-950/95 border border-[#00ff66]/40 rounded-2xl shadow-[0_0_50px_rgba(0,255,102,0.18)] z-10 overflow-hidden font-sans my-auto"
          id="modal-modify-profile"
        >
          {/* Barra de Linha Laser Neon Superior */}
          <div className="h-1 w-full bg-gradient-to-r from-[#00ff66]/20 via-[#00ff66] to-[#00ff66]/20 shadow-[0_0_12px_#00ff66]" />

          {/* Cabeçalho */}
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-zinc-800/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#00ff66]/10 border border-[#00ff66]/40 flex items-center justify-center text-[#00ff66] shadow-[0_0_10px_rgba(0,255,102,0.3)]">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-black uppercase tracking-wider text-white flex items-center gap-2">
                  Modificar Perfil
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#00ff66]/15 text-[#00ff66] border border-[#00ff66]/30">
                    VHSFLIX
                  </span>
                </h2>
                <p className="text-[11px] text-zinc-400">
                  Atualize sua foto de exibição e altere sua senha de acesso
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-colors"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-5">
            {/* Mensagem de Erro */}
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2 shadow-sm"
              >
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{errorMessage}</span>
              </motion.div>
            )}

            {/* Mensagem de Sucesso */}
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-2.5 rounded-xl bg-emerald-950/70 border border-[#00ff66]/60 text-[#00ff66] text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(0,255,102,0.2)] font-medium"
              >
                <CheckCircle2 className="w-4 h-4 text-[#00ff66] flex-shrink-0 animate-bounce" />
                <span>{successMessage}</span>
              </motion.div>
            )}

            {/* ============================================================== */}
            {/* SEÇÃO 1: FOTO DE PERFIL */}
            {/* ============================================================== */}
            <div className="space-y-3 bg-zinc-900/40 p-3.5 rounded-xl border border-zinc-850">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-[#00ff66] flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5" />
                  Foto de Perfil
                </label>
                <span className="text-[10px] text-zinc-500 font-mono">
                  {activeProfile?.name || user?.name}
                </span>
              </div>

              {/* Destaque da Foto Selecionada + Seleção Rápida */}
              <div className="flex items-center gap-4">
                {/* Visualizador Principal com Ring Neon Aumentado */}
                <div className="relative group flex-shrink-0">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-[#00ff66] shadow-[0_0_20px_rgba(0,255,102,0.4)] bg-zinc-900">
                    <img
                      src={selectedAvatarUrl}
                      alt="Prévia do Perfil"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={() => {
                        setSelectedAvatarUrl(PROFILE_AVATARS[0].url);
                      }}
                    />
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-[#00ff66] text-black rounded-full p-1.5 shadow-md">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                </div>

                {/* Miniaturas de Avatares Clássicos */}
                <div className="flex-1">
                  <p className="text-[10px] text-zinc-400 mb-1.5 font-medium">
                    Escolha um avatar temático do VHSFLIX:
                  </p>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {PROFILE_AVATARS.map((avatar) => {
                      const isSelected = selectedAvatarUrl === avatar.url;
                      return (
                        <button
                          key={avatar.id}
                          type="button"
                          onClick={() => {
                            setSelectedAvatarUrl(avatar.url);
                            setCustomAvatarInput('');
                            setErrorMessage(null);
                          }}
                          className={`relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 transition-all duration-200 ${
                            isSelected
                              ? 'ring-2 ring-[#00ff66] scale-105 shadow-[0_0_10px_#00ff66]'
                              : 'opacity-70 hover:opacity-100 hover:scale-100 ring-1 ring-zinc-800 hover:ring-zinc-600'
                          }`}
                          title={avatar.name}
                        >
                          <img
                            src={avatar.url}
                            alt={avatar.name}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          {isSelected && (
                            <div className="absolute inset-0 bg-[#00ff66]/20 flex items-center justify-center">
                              <Check className="w-3 h-3 text-white drop-shadow" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Opções de Upload ou URL Personalizada */}
              <div className="pt-2 border-t border-zinc-850 flex flex-wrap items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-zinc-300 hover:text-white text-[11px] font-medium border border-zinc-750 transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Upload className="w-3 h-3 text-[#00ff66]" />
                  Enviar foto do aparelho
                </button>

                <button
                  type="button"
                  onClick={() => setShowCustomUrlInput(!showCustomUrlInput)}
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 text-[11px] font-medium border border-zinc-800 transition-colors flex items-center gap-1.5"
                >
                  <LinkIcon className="w-3 h-3" />
                  {showCustomUrlInput ? 'Ocultar Link' : 'Usar link de foto'}
                </button>
              </div>

              {showCustomUrlInput && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="flex items-center gap-1.5 pt-1"
                >
                  <input
                    type="url"
                    value={customAvatarInput}
                    onChange={(e) => setCustomAvatarInput(e.target.value)}
                    placeholder="https://exemplo.com/minha-foto.jpg"
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#00ff66] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCustomUrl}
                    className="px-3 py-1.5 rounded-lg bg-[#00ff66]/20 border border-[#00ff66]/50 text-[#00ff66] text-xs font-bold hover:bg-[#00ff66] hover:text-black transition-colors"
                  >
                    Aplicar
                  </button>
                </motion.div>
              )}
            </div>

            {/* ============================================================== */}
            {/* SEÇÃO 2: MUDAR A SENHA */}
            {/* ============================================================== */}
            <div className="space-y-3 bg-zinc-900/40 p-3.5 rounded-xl border border-zinc-850">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-[#00ff66] flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5" />
                  Mudar Senha
                </label>
                <span className="text-[10px] text-zinc-500 font-mono">
                  Opcional
                </span>
              </div>

              <p className="text-[11px] text-zinc-400">
                Deixe em branco se quiser manter sua senha atual.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Nova Senha */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                    Nova Senha
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setErrorMessage(null);
                      }}
                      placeholder="Mínimo 4 dígitos"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-3 pr-8 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#00ff66] transition-colors font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Confirmar Senha */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                      Confirmar Senha
                    </label>
                    {passwordsMatch && (
                      <span className="text-[9px] text-[#00ff66] font-mono flex items-center gap-0.5">
                        <Check className="w-2.5 h-2.5" /> Iguais
                      </span>
                    )}
                    {passwordsMismatch && (
                      <span className="text-[9px] text-rose-400 font-mono">
                        Diferentes
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setErrorMessage(null);
                      }}
                      placeholder="Repita a nova senha"
                      className={`w-full bg-zinc-950 border rounded-lg pl-3 pr-8 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none transition-colors font-mono ${
                        passwordsMatch
                          ? 'border-[#00ff66]/60 focus:border-[#00ff66]'
                          : passwordsMismatch
                          ? 'border-rose-500/60 focus:border-rose-500'
                          : 'border-zinc-850 focus:border-[#00ff66]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    >
                      {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ============================================================== */}
            {/* CONTATO COM ADMINISTRADOR VIA TELEGRAM (USUÁRIOS) */}
            {/* ============================================================== */}
            {!user?.isAdmin && (
              <div className="pt-2">
                <a
                  href="https://t.me/VHSFLIX2026"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-zinc-900 via-zinc-900 to-[#229ED9]/15 border border-[#229ED9]/40 hover:border-[#229ED9] text-white hover:text-white transition-all shadow-md group cursor-pointer"
                  id="btn-telegram-modify-modal"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#229ED9] flex items-center justify-center text-white shadow-md shadow-[#229ED9]/30">
                      <Send className="w-4 h-4 text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="font-extrabold text-xs text-white group-hover:text-cyan-200 transition-colors">
                        Falar com o Administrador - VHS Flix
                      </span>
                      <span className="text-[10px] text-[#229ED9]">
                        Dúvidas, renovação ou suporte via Telegram
                      </span>
                    </div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-[#229ED9] group-hover:text-white transition-colors" />
                </a>
              </div>
            )}

            {/* ============================================================== */}
            {/* RODAPÉ E BOTÕES DE AÇÃO */}
            {/* ============================================================== */}
            <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-zinc-850">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-900 border border-zinc-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-[#00ff66] text-black hover:bg-[#33ff85] active:scale-95 transition-all shadow-[0_0_20px_rgba(0,255,102,0.35)] flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                id="btn-save-modified-profile"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Salvar Alterações</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
