/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Heart, Copy, Check, ShieldCheck, Sparkles, Smartphone, Building2, User } from 'lucide-react';
import { motion } from 'motion/react';

interface SupportPanelProps {
  onClose?: () => void;
}

export default function SupportPanel({ onClose }: SupportPanelProps) {
  const [copiedKey, setCopiedKey] = useState<boolean>(false);

  const pixKey = '(14) 99684-2893';
  const pixKeyUnformatted = '14996842893';
  const pixHolder = 'Rafael de Andrade Gusmão';
  const pixBank = 'PicPay';

  const handleCopyKey = () => {
    navigator.clipboard.writeText(pixKeyUnformatted);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 3000);
  };

  return (
    <div className="min-h-[85vh] bg-zinc-950 text-white pt-24 pb-16 px-4 sm:px-6 font-sans flex items-center justify-center">
      <div className="w-full max-w-2xl mx-auto space-y-6">
        
        {/* Card Principal Compacto & Moderno */}
        <div className="relative overflow-hidden bg-gradient-to-b from-zinc-900 via-zinc-900/95 to-zinc-950 border border-zinc-800 hover:border-rose-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl transition-all">
          
          {/* Efeitos de Luz de Fundo */}
          <div className="absolute -top-24 -left-24 w-56 h-56 bg-rose-600/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-56 h-56 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* Cabeçalho */}
          <div className="text-center space-y-3 relative z-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-400 font-mono text-xs font-bold tracking-wider uppercase shadow-inner">
              <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500 animate-pulse" />
              <span>Apoio ao Canal</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-display">
              Apoie o <span className="text-rose-500 font-mono italic">VHSFLIX</span>
            </h1>

            <p className="text-zinc-400 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
              Sua contribuição espontânea de qualquer valor mantém o catálogo atualizado e garante <span className="text-emerald-400 font-bold">30 dias de acesso renovado</span>.
            </p>
          </div>

          {/* Dados do PIX com Destaque Neon */}
          <div className="mt-7 space-y-3.5 relative z-10">
            
            {/* Beneficiário */}
            <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-inner">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold block">
                    Beneficiário
                  </span>
                  <span className="text-sm sm:text-base font-bold text-zinc-100">
                    {pixHolder}
                  </span>
                </div>
              </div>
            </div>

            {/* Banco / Instituição */}
            <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-inner">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold block">
                    Instituição / Banco
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm sm:text-base font-bold text-white">
                      {pixBank}
                    </span>
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                    </span>
                  </div>
                </div>
              </div>
              <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg hidden xs:inline-block">
                Ativo
              </span>
            </div>

            {/* Chave Pix (Celular) com Efeito Verde Neon */}
            <div className="bg-gradient-to-r from-zinc-950 via-zinc-950 to-emerald-950/30 border border-emerald-500/40 hover:border-emerald-400 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_0_20px_rgba(16,185,129,0.08)] transition-all">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400/80 font-bold block">
                    Chave Pix (Celular)
                  </span>
                  <span className="text-lg sm:text-xl font-black font-mono tracking-wider text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.4)]">
                    {pixKey}
                  </span>
                </div>
              </div>
            </div>

            {/* Botão de Copiar Chave Pix com Efeito Neon */}
            <button
              onClick={handleCopyKey}
              id="btn-copy-pix-key"
              className={`w-full py-4 px-6 rounded-2xl font-bold font-mono text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all duration-300 cursor-pointer shadow-lg active:scale-98 select-none ${
                copiedKey
                  ? 'bg-emerald-500 text-zinc-950 border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.5)] ring-2 ring-emerald-400'
                  : 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-zinc-950 shadow-[0_0_20px_rgba(16,185,129,0.35)] hover:shadow-[0_0_30px_rgba(16,185,129,0.6)]'
              }`}
            >
              {copiedKey ? (
                <>
                  <Check className="w-5 h-5 text-zinc-950 stroke-[3]" />
                  <span>Chave Pix Copiada com Sucesso!</span>
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5 text-zinc-950 stroke-[2.5]" />
                  <span>Copiar Chave Pix</span>
                </>
              )}
            </button>

          </div>

          {/* Rodapé Curto de Agradecimento */}
          <div className="mt-6 pt-5 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400 font-sans relative z-10">
            <span className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Acesso renovado automaticamente
            </span>
            <span className="font-mono text-[11px] font-bold text-rose-400/90">
              Obrigado pelo apoio! ❤️
            </span>
          </div>

        </div>

      </div>
    </div>
  );
}

